import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { FeatureRegistryManager, initializeMigrationsTable } from '@/lib/feature-registry';

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
 * GET /api/features/[id]/dependencies - Get feature dependencies
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const registry = await getFeatureRegistry();
    const dependencies = await registry.getFeatureDependencies(params.id);

    return NextResponse.json({
      success: true,
      dependencies
    });
  } catch (error) {
    console.error(`Failed to get dependencies for feature ${params.id}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve feature dependencies' 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/features/[id]/dependencies - Add feature dependency
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const registry = await getFeatureRegistry();
    const { dependsOn, dependencyType = 'required' } = await request.json();

    if (!dependsOn) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'dependsOn field is required' 
        },
        { status: 400 }
      );
    }

    if (!['required', 'optional'].includes(dependencyType)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'dependencyType must be either "required" or "optional"' 
        },
        { status: 400 }
      );
    }

    await registry.addFeatureDependency(params.id, dependsOn, dependencyType);

    return NextResponse.json({
      success: true,
      message: `Dependency ${dependsOn} added to feature ${params.id}`
    });
  } catch (error) {
    console.error(`Failed to add dependency for feature ${params.id}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to add feature dependency' 
      },
      { status: 500 }
    );
  }
}