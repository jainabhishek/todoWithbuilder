import { Pool } from 'pg';
import { FeatureDefinition, FeatureRegistry, Migration, APIEndpoint } from '@/types';

export class FeatureRegistryManager implements FeatureRegistry {
  private pool: Pool;
  private activeFeatures: Map<string, FeatureDefinition> = new Map();

  constructor(pool: Pool) {
    this.pool = pool;
    this.loadActiveFeatures();
  }

  /**
   * Load active features from database on initialization
   */
  private async loadActiveFeatures(): Promise<void> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM features WHERE enabled = true ORDER BY installed_at'
      );
      
      for (const row of result.rows) {
        const feature: FeatureDefinition = {
          id: row.id,
          name: row.name,
          version: row.version,
          enabled: row.enabled,
          components: [], // Will be loaded dynamically
          apiEndpoints: [], // Will be loaded dynamically
          databaseMigrations: [] // Will be loaded dynamically
        };
        this.activeFeatures.set(feature.id, feature);
      }
    } catch (error) {
      console.error('Failed to load active features:', error);
    }
  }

  /**
   * Register a new feature in the system
   */
  async registerFeature(feature: FeatureDefinition): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if feature already exists
      const existingFeature = await client.query(
        'SELECT id FROM features WHERE id = $1',
        [feature.id]
      );

      if (existingFeature.rows.length > 0) {
        // Update existing feature
        await client.query(
          `UPDATE features 
           SET name = $2, version = $3, enabled = $4 
           WHERE id = $1`,
          [feature.id, feature.name, feature.version, feature.enabled]
        );
      } else {
        // Insert new feature
        await client.query(
          `INSERT INTO features (id, name, version, enabled) 
           VALUES ($1, $2, $3, $4)`,
          [feature.id, feature.name, feature.version, feature.enabled]
        );
      }

      // Run database migrations if any
      for (const migration of feature.databaseMigrations) {
        await this.runMigration(client, migration);
      }

      await client.query('COMMIT');
      
      // Update in-memory cache
      this.activeFeatures.set(feature.id, feature);
      
      console.log(`Feature ${feature.id} registered successfully`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Failed to register feature ${feature.id}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Enable a feature
   */
  async enableFeature(featureId: string): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE features SET enabled = true WHERE id = $1',
        [featureId]
      );

      // Update in-memory cache
      const feature = this.activeFeatures.get(featureId);
      if (feature) {
        feature.enabled = true;
      }

      console.log(`Feature ${featureId} enabled`);
    } catch (error) {
      console.error(`Failed to enable feature ${featureId}:`, error);
      throw error;
    }
  }

  /**
   * Disable a feature
   */
  async disableFeature(featureId: string): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE features SET enabled = false WHERE id = $1',
        [featureId]
      );

      // Update in-memory cache
      const feature = this.activeFeatures.get(featureId);
      if (feature) {
        feature.enabled = false;
      }

      console.log(`Feature ${featureId} disabled`);
    } catch (error) {
      console.error(`Failed to disable feature ${featureId}:`, error);
      throw error;
    }
  }

  /**
   * Get all active features
   */
  getActiveFeatures(): FeatureDefinition[] {
    return Array.from(this.activeFeatures.values()).filter(f => f.enabled);
  }

  /**
   * Get all features (enabled and disabled)
   */
  async getAllFeatures(): Promise<FeatureDefinition[]> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM features ORDER BY installed_at'
      );
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        version: row.version,
        enabled: row.enabled,
        components: [],
        apiEndpoints: [],
        databaseMigrations: []
      }));
    } catch (error) {
      console.error('Failed to get all features:', error);
      throw error;
    }
  }

  /**
   * Get feature by ID
   */
  async getFeature(featureId: string): Promise<FeatureDefinition | null> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM features WHERE id = $1',
        [featureId]
      );
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        version: row.version,
        enabled: row.enabled,
        components: [],
        apiEndpoints: [],
        databaseMigrations: []
      };
    } catch (error) {
      console.error(`Failed to get feature ${featureId}:`, error);
      throw error;
    }
  }

  /**
   * Check if a feature exists and is enabled
   */
  isFeatureEnabled(featureId: string): boolean {
    const feature = this.activeFeatures.get(featureId);
    return feature ? feature.enabled : false;
  }

  /**
   * Add feature dependency
   */
  async addFeatureDependency(
    featureId: string, 
    dependsOn: string, 
    dependencyType: 'required' | 'optional' = 'required'
  ): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO feature_dependencies (feature_id, depends_on, dependency_type) 
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [featureId, dependsOn, dependencyType]
      );
    } catch (error) {
      console.error(`Failed to add dependency ${dependsOn} for feature ${featureId}:`, error);
      throw error;
    }
  }

  /**
   * Get feature dependencies
   */
  async getFeatureDependencies(featureId: string): Promise<string[]> {
    try {
      const result = await this.pool.query(
        'SELECT depends_on FROM feature_dependencies WHERE feature_id = $1',
        [featureId]
      );
      
      return result.rows.map(row => row.depends_on);
    } catch (error) {
      console.error(`Failed to get dependencies for feature ${featureId}:`, error);
      throw error;
    }
  }

  /**
   * Check if feature can be safely disabled (no other features depend on it)
   */
  async canDisableFeature(featureId: string): Promise<{ canDisable: boolean; dependentFeatures: string[] }> {
    try {
      const result = await this.pool.query(
        `SELECT f.id, f.name 
         FROM features f 
         JOIN feature_dependencies fd ON f.id = fd.feature_id 
         WHERE fd.depends_on = $1 AND f.enabled = true`,
        [featureId]
      );
      
      const dependentFeatures = result.rows.map(row => row.name);
      
      return {
        canDisable: dependentFeatures.length === 0,
        dependentFeatures
      };
    } catch (error) {
      console.error(`Failed to check if feature ${featureId} can be disabled:`, error);
      throw error;
    }
  }

  /**
   * Run a database migration
   */
  private async runMigration(client: any, migration: Migration): Promise<void> {
    try {
      // Check if migration has already been run
      const existingMigration = await client.query(
        'SELECT id FROM migrations WHERE id = $1',
        [migration.id]
      );

      if (existingMigration.rows.length > 0) {
        console.log(`Migration ${migration.id} already applied, skipping`);
        return;
      }

      // Run the migration
      await client.query(migration.up);
      
      // Record that migration was run
      await client.query(
        'INSERT INTO migrations (id, applied_at) VALUES ($1, NOW())',
        [migration.id]
      );

      console.log(`Migration ${migration.id} applied successfully`);
    } catch (error) {
      console.error(`Failed to run migration ${migration.id}:`, error);
      throw error;
    }
  }

  /**
   * Remove a feature completely
   */
  async removeFeature(featureId: string): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Check if feature can be safely removed
      const dependencyCheck = await this.canDisableFeature(featureId);
      if (!dependencyCheck.canDisable) {
        throw new Error(
          `Cannot remove feature ${featureId}. Dependent features: ${dependencyCheck.dependentFeatures.join(', ')}`
        );
      }

      // Remove feature dependencies
      await client.query(
        'DELETE FROM feature_dependencies WHERE feature_id = $1 OR depends_on = $1',
        [featureId]
      );

      // Remove feature
      await client.query(
        'DELETE FROM features WHERE id = $1',
        [featureId]
      );

      await client.query('COMMIT');
      
      // Update in-memory cache
      this.activeFeatures.delete(featureId);
      
      console.log(`Feature ${featureId} removed successfully`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Failed to remove feature ${featureId}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

// Create migrations table if it doesn't exist
export async function initializeMigrationsTable(pool: Pool): Promise<void> {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT NOW()
      )
    `);
  } catch (error) {
    console.error('Failed to initialize migrations table:', error);
    throw error;
  }
}