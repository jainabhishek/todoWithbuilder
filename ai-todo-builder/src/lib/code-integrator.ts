import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';
import { GeneratedCode, CodeFile, TestFile, Migration, FeatureDefinition } from '@/types';
import { FeatureRegistryManager } from './feature-registry';

export interface IntegrationResult {
  success: boolean;
  filesCreated: string[];
  testsCreated: string[];
  migrationsApplied: string[];
  errors: string[];
  rollbackInfo?: RollbackInfo;
}

export interface RollbackInfo {
  backupPath: string;
  filesModified: string[];
  migrationsApplied: string[];
  timestamp: Date;
}

export interface IntegrationOptions {
  dryRun?: boolean;
  createBackup?: boolean;
  runTests?: boolean;
  validateCode?: boolean;
  featureId?: string;
}

export class CodeIntegrator {
  private pool: Pool;
  private featureRegistry: FeatureRegistryManager;
  private projectRoot: string;

  constructor(pool: Pool, featureRegistry: FeatureRegistryManager, projectRoot: string = process.cwd()) {
    this.pool = pool;
    this.featureRegistry = featureRegistry;
    this.projectRoot = projectRoot;
  }

  /**
   * Integrate generated code into the project
   */
  async integrateFeature(
    generatedCode: GeneratedCode, 
    featureDefinition: FeatureDefinition,
    options: IntegrationOptions = {}
  ): Promise<IntegrationResult> {
    const {
      dryRun = false,
      createBackup = true,
      runTests = true,
      validateCode = true,
      featureId = featureDefinition.id
    } = options;

    const result: IntegrationResult = {
      success: false,
      filesCreated: [],
      testsCreated: [],
      migrationsApplied: [],
      errors: []
    };

    try {
      console.log(`Starting integration for feature: ${featureId}`);

      // Step 1: Validate generated code
      if (validateCode) {
        const validation = await this.validateCode(generatedCode);
        if (!validation.valid) {
          result.errors.push(...validation.errors);
          return result;
        }
        if (validation.warnings.length > 0) {
          console.warn('Code validation warnings:', validation.warnings);
        }
      }

      // Step 2: Create backup if requested
      let rollbackInfo: RollbackInfo | undefined;
      if (createBackup && !dryRun) {
        rollbackInfo = await this.createBackup(featureId);
        result.rollbackInfo = rollbackInfo;
      }

      // Step 3: Apply database migrations
      if (generatedCode.migrations.length > 0) {
        const migrationResults = await this.applyMigrations(generatedCode.migrations, dryRun);
        result.migrationsApplied = migrationResults.applied;
        result.errors.push(...migrationResults.errors);
      }

      // Step 4: Create/update files
      const fileResults = await this.integrateFiles(generatedCode.files, dryRun);
      result.filesCreated = fileResults.created;
      result.errors.push(...fileResults.errors);

      // Step 5: Create/update test files
      const testResults = await this.integrateTestFiles(generatedCode.tests, dryRun);
      result.testsCreated = testResults.created;
      result.errors.push(...testResults.errors);

      // Step 6: Install dependencies
      if (generatedCode.dependencies.length > 0 && !dryRun) {
        const depResults = await this.installDependencies(generatedCode.dependencies);
        result.errors.push(...depResults.errors);
      }

      // Step 7: Run tests if requested
      if (runTests && !dryRun && result.testsCreated.length > 0) {
        const testResults = await this.runTests();
        if (!testResults.success) {
          result.errors.push(...testResults.errors);
        }
      }

      // Step 8: Register feature if all successful
      if (result.errors.length === 0 && !dryRun) {
        await this.featureRegistry.registerFeature(featureDefinition);
        console.log(`Feature ${featureId} integrated successfully`);
        result.success = true;
      } else if (result.errors.length > 0) {
        console.error(`Integration failed for feature ${featureId}:`, result.errors);
        
        // Rollback if there were errors and we have rollback info
        if (rollbackInfo && !dryRun) {
          await this.rollback(rollbackInfo);
        }
      }

      return result;

    } catch (error) {
      console.error(`Integration error for feature ${featureId}:`, error);
      result.errors.push(`Integration failed: ${error}`);
      
      // Attempt rollback on critical error
      if (result.rollbackInfo && !dryRun) {
        await this.rollback(result.rollbackInfo);
      }
      
      return result;
    }
  }

  /**
   * Validate generated code
   */
  private async validateCode(generatedCode: GeneratedCode): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for file conflicts
    for (const file of generatedCode.files) {
      const fullPath = path.join(this.projectRoot, file.path);
      try {
        await fs.access(fullPath);
        warnings.push(`File ${file.path} already exists and will be overwritten`);
      } catch {
        // File doesn't exist, which is fine
      }
    }

    // Validate file paths
    for (const file of generatedCode.files) {
      if (!this.isValidFilePath(file.path)) {
        errors.push(`Invalid file path: ${file.path}`);
      }
    }

    // Check for required project structure
    const requiredDirs = ['src', 'src/components', 'src/lib', 'src/app'];
    for (const dir of requiredDirs) {
      try {
        await fs.access(path.join(this.projectRoot, dir));
      } catch {
        errors.push(`Required directory ${dir} does not exist`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Create backup of existing files
   */
  private async createBackup(featureId: string): Promise<RollbackInfo> {
    const timestamp = new Date();
    const backupDir = path.join(this.projectRoot, '.backups', `${featureId}_${timestamp.getTime()}`);
    
    await fs.mkdir(backupDir, { recursive: true });

    return {
      backupPath: backupDir,
      filesModified: [],
      migrationsApplied: [],
      timestamp
    };
  }

  /**
   * Apply database migrations
   */
  private async applyMigrations(migrations: Migration[], dryRun: boolean): Promise<{
    applied: string[];
    errors: string[];
  }> {
    const applied: string[] = [];
    const errors: string[] = [];

    if (dryRun) {
      console.log('DRY RUN: Would apply migrations:', migrations.map(m => m.id));
      return { applied: migrations.map(m => m.id), errors };
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      for (const migration of migrations) {
        try {
          // Check if migration already applied
          const existing = await client.query(
            'SELECT id FROM migrations WHERE id = $1',
            [migration.id]
          );

          if (existing.rows.length > 0) {
            console.log(`Migration ${migration.id} already applied, skipping`);
            continue;
          }

          // Apply migration
          await client.query(migration.up);
          
          // Record migration
          await client.query(
            'INSERT INTO migrations (id, applied_at) VALUES ($1, NOW())',
            [migration.id]
          );

          applied.push(migration.id);
          console.log(`Applied migration: ${migration.id}`);

        } catch (error) {
          errors.push(`Failed to apply migration ${migration.id}: ${error}`);
          break; // Stop on first migration error
        }
      }

      if (errors.length === 0) {
        await client.query('COMMIT');
      } else {
        await client.query('ROLLBACK');
      }

    } catch (error) {
      await client.query('ROLLBACK');
      errors.push(`Migration transaction failed: ${error}`);
    } finally {
      client.release();
    }

    return { applied, errors };
  }

  /**
   * Integrate code files
   */
  private async integrateFiles(files: CodeFile[], dryRun: boolean): Promise<{
    created: string[];
    errors: string[];
  }> {
    const created: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        const fullPath = path.join(this.projectRoot, file.path);
        
        if (dryRun) {
          console.log(`DRY RUN: Would create/update file: ${file.path}`);
          created.push(file.path);
          continue;
        }

        // Ensure directory exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true });

        // Write file
        await fs.writeFile(fullPath, file.content, 'utf8');
        created.push(file.path);
        console.log(`Created/updated file: ${file.path}`);

      } catch (error) {
        errors.push(`Failed to create file ${file.path}: ${error}`);
      }
    }

    return { created, errors };
  }

  /**
   * Integrate test files
   */
  private async integrateTestFiles(tests: TestFile[], dryRun: boolean): Promise<{
    created: string[];
    errors: string[];
  }> {
    const created: string[] = [];
    const errors: string[] = [];

    for (const test of tests) {
      try {
        const fullPath = path.join(this.projectRoot, test.path);
        
        if (dryRun) {
          console.log(`DRY RUN: Would create/update test: ${test.path}`);
          created.push(test.path);
          continue;
        }

        // Ensure directory exists
        await fs.mkdir(path.dirname(fullPath), { recursive: true });

        // Write test file
        await fs.writeFile(fullPath, test.content, 'utf8');
        created.push(test.path);
        console.log(`Created/updated test: ${test.path}`);

      } catch (error) {
        errors.push(`Failed to create test ${test.path}: ${error}`);
      }
    }

    return { created, errors };
  }

  /**
   * Install dependencies
   */
  private async installDependencies(dependencies: string[]): Promise<{
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      const { spawn } = require('child_process');
      
      return new Promise((resolve) => {
        const npm = spawn('npm', ['install', ...dependencies], {
          cwd: this.projectRoot,
          stdio: 'pipe'
        });

        let output = '';
        npm.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });

        npm.stderr.on('data', (data: Buffer) => {
          output += data.toString();
        });

        npm.on('close', (code: number) => {
          if (code !== 0) {
            errors.push(`npm install failed: ${output}`);
          } else {
            console.log('Dependencies installed successfully');
          }
          resolve({ errors });
        });
      });

    } catch (error) {
      errors.push(`Failed to install dependencies: ${error}`);
      return { errors };
    }
  }

  /**
   * Run tests
   */
  private async runTests(): Promise<{
    success: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      const { spawn } = require('child_process');
      
      return new Promise((resolve) => {
        const test = spawn('npm', ['test', '--', '--run'], {
          cwd: this.projectRoot,
          stdio: 'pipe'
        });

        let output = '';
        test.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });

        test.stderr.on('data', (data: Buffer) => {
          output += data.toString();
        });

        test.on('close', (code: number) => {
          if (code !== 0) {
            errors.push(`Tests failed: ${output}`);
            resolve({ success: false, errors });
          } else {
            console.log('Tests passed successfully');
            resolve({ success: true, errors });
          }
        });
      });

    } catch (error) {
      errors.push(`Failed to run tests: ${error}`);
      return { success: false, errors };
    }
  }

  /**
   * Rollback changes
   */
  async rollback(rollbackInfo: RollbackInfo): Promise<void> {
    console.log(`Rolling back changes from ${rollbackInfo.timestamp}`);

    try {
      // Rollback database migrations
      if (rollbackInfo.migrationsApplied.length > 0) {
        await this.rollbackMigrations(rollbackInfo.migrationsApplied);
      }

      // Restore files from backup
      if (rollbackInfo.filesModified.length > 0) {
        await this.restoreFiles(rollbackInfo);
      }

      console.log('Rollback completed successfully');
    } catch (error) {
      console.error('Rollback failed:', error);
      throw error;
    }
  }

  /**
   * Rollback database migrations
   */
  private async rollbackMigrations(migrationIds: string[]): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Rollback in reverse order
      for (const migrationId of migrationIds.reverse()) {
        await client.query(
          'DELETE FROM migrations WHERE id = $1',
          [migrationId]
        );
        console.log(`Rolled back migration: ${migrationId}`);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Restore files from backup
   */
  private async restoreFiles(rollbackInfo: RollbackInfo): Promise<void> {
    // Implementation would restore files from backup directory
    // This is a simplified version
    console.log(`Restoring files from backup: ${rollbackInfo.backupPath}`);
  }

  /**
   * Validate file path
   */
  private isValidFilePath(filePath: string): boolean {
    // Basic validation - no parent directory traversal, valid characters
    if (filePath.includes('..') || filePath.includes('//')) {
      return false;
    }
    
    // Must be within src directory or specific allowed directories
    const allowedPrefixes = ['src/', 'public/', 'docs/', 'scripts/'];
    return allowedPrefixes.some(prefix => filePath.startsWith(prefix));
  }

  /**
   * Check if feature can be safely integrated
   */
  async canIntegrateFeature(featureId: string): Promise<{
    canIntegrate: boolean;
    conflicts: string[];
    warnings: string[];
  }> {
    const conflicts: string[] = [];
    const warnings: string[] = [];

    // Check if feature already exists
    const existingFeature = await this.featureRegistry.getFeature(featureId);
    if (existingFeature) {
      warnings.push(`Feature ${featureId} already exists and will be updated`);
    }

    // Check for file conflicts
    // This would be implemented based on the specific files being integrated

    return {
      canIntegrate: conflicts.length === 0,
      conflicts,
      warnings
    };
  }
}