import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { GeneratedCode, TestFile } from '@/types';

export interface TestResult {
  success: boolean;
  testsPassed: number;
  testsFailed: number;
  coverage?: CoverageReport;
  errors: string[];
  warnings: string[];
  output: string;
}

export interface CoverageReport {
  lines: number;
  functions: number;
  branches: number;
  statements: number;
}

export interface TestPipelineOptions {
  runUnit?: boolean;
  runIntegration?: boolean;
  runE2E?: boolean;
  generateCoverage?: boolean;
  timeout?: number;
  parallel?: boolean;
}

export class TestingPipeline {
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
  }

  /**
   * Run the complete testing pipeline for generated code
   */
  async runPipeline(
    generatedCode: GeneratedCode,
    options: TestPipelineOptions = {}
  ): Promise<TestResult> {
    const {
      runUnit = true,
      runIntegration = true,
      runE2E = false,
      generateCoverage = true,
      timeout = 300000, // 5 minutes
      parallel = true
    } = options;

    console.log('Starting automated testing pipeline...');

    const result: TestResult = {
      success: false,
      testsPassed: 0,
      testsFailed: 0,
      errors: [],
      warnings: [],
      output: ''
    };

    try {
      // Step 1: Validate test files exist
      const testValidation = await this.validateTestFiles(generatedCode.tests);
      if (!testValidation.valid) {
        result.errors.push(...testValidation.errors);
        return result;
      }

      // Step 2: Run unit tests
      if (runUnit) {
        const unitTests = generatedCode.tests.filter(t => t.type === 'unit');
        if (unitTests.length > 0) {
          const unitResult = await this.runUnitTests(unitTests, { timeout, parallel });
          result.testsPassed += unitResult.testsPassed;
          result.testsFailed += unitResult.testsFailed;
          result.errors.push(...unitResult.errors);
          result.warnings.push(...unitResult.warnings);
          result.output += unitResult.output + '\n';
        }
      }

      // Step 3: Run integration tests
      if (runIntegration) {
        const integrationTests = generatedCode.tests.filter(t => t.type === 'integration');
        if (integrationTests.length > 0) {
          const integrationResult = await this.runIntegrationTests(integrationTests, { timeout });
          result.testsPassed += integrationResult.testsPassed;
          result.testsFailed += integrationResult.testsFailed;
          result.errors.push(...integrationResult.errors);
          result.warnings.push(...integrationResult.warnings);
          result.output += integrationResult.output + '\n';
        }
      }

      // Step 4: Run E2E tests
      if (runE2E) {
        const e2eTests = generatedCode.tests.filter(t => t.type === 'e2e');
        if (e2eTests.length > 0) {
          const e2eResult = await this.runE2ETests(e2eTests, { timeout });
          result.testsPassed += e2eResult.testsPassed;
          result.testsFailed += e2eResult.testsFailed;
          result.errors.push(...e2eResult.errors);
          result.warnings.push(...e2eResult.warnings);
          result.output += e2eResult.output + '\n';
        }
      }

      // Step 5: Generate coverage report
      if (generateCoverage && result.testsFailed === 0) {
        const coverageResult = await this.generateCoverageReport();
        if (coverageResult.success) {
          result.coverage = coverageResult.coverage;
        } else {
          result.warnings.push('Failed to generate coverage report');
        }
      }

      // Step 6: Run code quality checks
      const qualityResult = await this.runQualityChecks(generatedCode);
      result.warnings.push(...qualityResult.warnings);
      if (qualityResult.errors.length > 0) {
        result.errors.push(...qualityResult.errors);
      }

      result.success = result.testsFailed === 0 && result.errors.length === 0;

      console.log(`Testing pipeline completed. Passed: ${result.testsPassed}, Failed: ${result.testsFailed}`);
      return result;

    } catch (error) {
      console.error('Testing pipeline error:', error);
      result.errors.push(`Pipeline failed: ${error}`);
      return result;
    }
  }

  /**
   * Validate test files
   */
  private async validateTestFiles(tests: TestFile[]): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    for (const test of tests) {
      // Check if test file has valid structure
      if (!test.content.includes('describe') && !test.content.includes('test') && !test.content.includes('it')) {
        errors.push(`Test file ${test.path} doesn't contain valid test structure`);
      }

      // Check for required imports
      if (test.type === 'unit' && test.content.includes('@testing-library') && !test.content.includes('import')) {
        errors.push(`Test file ${test.path} uses testing library but missing imports`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Run unit tests
   */
  private async runUnitTests(
    tests: TestFile[], 
    options: { timeout: number; parallel: boolean }
  ): Promise<TestResult> {
    console.log(`Running ${tests.length} unit tests...`);

    const testPaths = tests.map(t => t.path);
    const args = [
      'test',
      '--run',
      ...testPaths,
      '--reporter=json'
    ];

    if (options.parallel) {
      args.push('--threads');
    }

    return this.runVitest(args, options.timeout);
  }

  /**
   * Run integration tests
   */
  private async runIntegrationTests(
    tests: TestFile[], 
    options: { timeout: number }
  ): Promise<TestResult> {
    console.log(`Running ${tests.length} integration tests...`);

    const testPaths = tests.map(t => t.path);
    const args = [
      'test',
      '--run',
      ...testPaths,
      '--reporter=json',
      '--no-threads' // Integration tests run sequentially
    ];

    return this.runVitest(args, options.timeout);
  }

  /**
   * Run E2E tests
   */
  private async runE2ETests(
    tests: TestFile[], 
    options: { timeout: number }
  ): Promise<TestResult> {
    console.log(`Running ${tests.length} E2E tests...`);

    // For E2E tests, we might use Playwright or similar
    // This is a simplified implementation
    const testPaths = tests.map(t => t.path);
    const args = [
      'test',
      '--run',
      ...testPaths,
      '--reporter=json',
      '--timeout=' + options.timeout
    ];

    return this.runVitest(args, options.timeout);
  }

  /**
   * Run Vitest with given arguments
   */
  private async runVitest(args: string[], timeout: number): Promise<TestResult> {
    return new Promise((resolve) => {
      const vitest = spawn('npx', ['vitest', ...args], {
        cwd: this.projectRoot,
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      vitest.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      vitest.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      const timeoutId = setTimeout(() => {
        vitest.kill();
        resolve({
          success: false,
          testsPassed: 0,
          testsFailed: 1,
          errors: ['Test execution timed out'],
          warnings: [],
          output: output + errorOutput
        });
      }, timeout);

      vitest.on('close', (code: number) => {
        clearTimeout(timeoutId);
        
        const result = this.parseVitestOutput(output, errorOutput);
        result.success = code === 0 && result.testsFailed === 0;
        
        resolve(result);
      });
    });
  }

  /**
   * Parse Vitest output to extract test results
   */
  private parseVitestOutput(stdout: string, stderr: string): TestResult {
    const result: TestResult = {
      success: false,
      testsPassed: 0,
      testsFailed: 0,
      errors: [],
      warnings: [],
      output: stdout + stderr
    };

    try {
      // Try to parse JSON output
      const lines = stdout.split('\n');
      for (const line of lines) {
        if (line.trim().startsWith('{')) {
          try {
            const jsonResult = JSON.parse(line);
            if (jsonResult.testResults) {
              result.testsPassed = jsonResult.numPassedTests || 0;
              result.testsFailed = jsonResult.numFailedTests || 0;
            }
          } catch {
            // Not JSON, continue
          }
        }
      }

      // Fallback: parse text output
      if (result.testsPassed === 0 && result.testsFailed === 0) {
        const passedMatch = stdout.match(/(\d+) passed/);
        const failedMatch = stdout.match(/(\d+) failed/);
        
        if (passedMatch) result.testsPassed = parseInt(passedMatch[1]);
        if (failedMatch) result.testsFailed = parseInt(failedMatch[1]);
      }

      // Extract errors from stderr
      if (stderr) {
        result.errors.push(stderr);
      }

    } catch (error) {
      result.errors.push(`Failed to parse test output: ${error}`);
    }

    return result;
  }

  /**
   * Generate coverage report
   */
  private async generateCoverageReport(): Promise<{
    success: boolean;
    coverage?: CoverageReport;
  }> {
    return new Promise((resolve) => {
      const vitest = spawn('npx', ['vitest', 'run', '--coverage'], {
        cwd: this.projectRoot,
        stdio: 'pipe'
      });

      let output = '';

      vitest.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      vitest.on('close', (code: number) => {
        if (code === 0) {
          const coverage = this.parseCoverageOutput(output);
          resolve({ success: true, coverage });
        } else {
          resolve({ success: false });
        }
      });
    });
  }

  /**
   * Parse coverage output
   */
  private parseCoverageOutput(output: string): CoverageReport | undefined {
    try {
      // This is a simplified parser - real implementation would be more robust
      const lines = output.split('\n');
      const coverageLine = lines.find(line => line.includes('All files'));
      
      if (coverageLine) {
        const parts = coverageLine.split('|').map(p => p.trim());
        return {
          statements: parseFloat(parts[1]) || 0,
          branches: parseFloat(parts[2]) || 0,
          functions: parseFloat(parts[3]) || 0,
          lines: parseFloat(parts[4]) || 0
        };
      }
    } catch (error) {
      console.error('Failed to parse coverage output:', error);
    }
    
    return undefined;
  }

  /**
   * Run code quality checks
   */
  private async runQualityChecks(generatedCode: GeneratedCode): Promise<{
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Run ESLint on generated files
    const lintResult = await this.runESLint(generatedCode);
    errors.push(...lintResult.errors);
    warnings.push(...lintResult.warnings);

    // Run TypeScript compiler check
    const tscResult = await this.runTypeScriptCheck(generatedCode);
    errors.push(...tscResult.errors);
    warnings.push(...tscResult.warnings);

    return { errors, warnings };
  }

  /**
   * Run ESLint on generated code
   */
  private async runESLint(generatedCode: GeneratedCode): Promise<{
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const filePaths = generatedCode.files
        .filter(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx'))
        .map(f => f.path);

      if (filePaths.length === 0) {
        return { errors, warnings };
      }

      return new Promise((resolve) => {
        const eslint = spawn('npx', ['eslint', '--format=json', ...filePaths], {
          cwd: this.projectRoot,
          stdio: 'pipe'
        });

        let output = '';

        eslint.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });

        eslint.on('close', (code: number) => {
          try {
            if (output) {
              const results = JSON.parse(output);
              for (const result of results) {
                for (const message of result.messages) {
                  if (message.severity === 2) {
                    errors.push(`${result.filePath}: ${message.message}`);
                  } else {
                    warnings.push(`${result.filePath}: ${message.message}`);
                  }
                }
              }
            }
          } catch (parseError) {
            warnings.push('Failed to parse ESLint output');
          }
          
          resolve({ errors, warnings });
        });
      });

    } catch (error) {
      warnings.push(`ESLint check failed: ${error}`);
      return { errors, warnings };
    }
  }

  /**
   * Run TypeScript compiler check
   */
  private async runTypeScriptCheck(generatedCode: GeneratedCode): Promise<{
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      return new Promise((resolve) => {
        const tsc = spawn('npx', ['tsc', '--noEmit'], {
          cwd: this.projectRoot,
          stdio: 'pipe'
        });

        let output = '';

        tsc.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });

        tsc.stderr.on('data', (data: Buffer) => {
          output += data.toString();
        });

        tsc.on('close', (code: number) => {
          if (code !== 0 && output) {
            const lines = output.split('\n');
            for (const line of lines) {
              if (line.includes('error TS')) {
                errors.push(line.trim());
              }
            }
          }
          
          resolve({ errors, warnings });
        });
      });

    } catch (error) {
      warnings.push(`TypeScript check failed: ${error}`);
      return { errors, warnings };
    }
  }

  /**
   * Create test report
   */
  async createTestReport(result: TestResult, outputPath: string): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      success: result.success,
      summary: {
        testsPassed: result.testsPassed,
        testsFailed: result.testsFailed,
        totalTests: result.testsPassed + result.testsFailed
      },
      coverage: result.coverage,
      errors: result.errors,
      warnings: result.warnings,
      output: result.output
    };

    try {
      await fs.writeFile(outputPath, JSON.stringify(report, null, 2));
      console.log(`Test report saved to: ${outputPath}`);
    } catch (error) {
      console.error('Failed to save test report:', error);
    }
  }
}