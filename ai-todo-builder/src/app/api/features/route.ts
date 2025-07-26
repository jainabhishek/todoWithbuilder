import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { FeatureRegistryManager, initializeMigrationsTable } from '@/lib/feature-registry';
import { FeatureDefinition } from '@/types';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/ai_todo_builder'
});

// Initialize feature registry
let featureRegistry: FeatureRegistryManager;

async function getFeatureRegistry(): Promise<FeatureRegistryManager> {
  if (!featureRegistry) {
    await initializeMigrationsTable(pool);
    featureRegistry = new FeatureRegistryManager(pool);
  }
  return featureRegistry;
}

/**
 * GET /api/features - Get all features
 */
export async function GET(request: NextRequest) {
  try {
    const registry = await getFeatureRegistry();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    const features = activeOnly 
      ? registry.getActiveFeatures()
      : await registry.getAllFeatures();

    return NextResponse.json({
      success: true,
      features
    });
  } catch (error) {
    console.error('Failed to get features:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve features' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/features - Register a new feature
 */
export async function POST(request: NextRequest) {
  try {
    const registry = await getFeatureRegistry();
    const featureData = await request.json();

    // Validate required fields
    if (!featureData.id || !featureData.name || !featureData.version) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: id, name, version' 
        },
        { status: 400 }
      );
    }

    const feature: FeatureDefinition = {
      id: featureData.id,
      name: featureData.name,
      version: featureData.version,
      enabled: featureData.enabled ?? true,
      components: featureData.components || [],
      apiEndpoints: featureData.apiEndpoints || [],
      databaseMigrations: featureData.databaseMigrations || []
    };

    await registry.registerFeature(feature);

    return NextResponse.json({
      success: true,
      message: `Feature ${feature.id} registered successfully`,
      feature
    });
  } catch (error) {
    console.error('Failed to register feature:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to register feature' 
      },
      { status: 500 }
    );
  }
}