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
 * GET /api/features/[id] - Get a specific feature
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const registry = await getFeatureRegistry();
    const feature = await registry.getFeature(params.id);

    if (!feature) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Feature not found' 
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      feature
    });
  } catch (error) {
    console.error(`Failed to get feature ${params.id}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to retrieve feature' 
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/features/[id] - Enable/disable a feature
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const registry = await getFeatureRegistry();
    const { enabled } = await request.json();

    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'enabled field must be a boolean' 
        },
        { status: 400 }
      );
    }

    if (enabled) {
      await registry.enableFeature(params.id);
    } else {
      // Check if feature can be safely disabled
      const dependencyCheck = await registry.canDisableFeature(params.id);
      if (!dependencyCheck.canDisable) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Cannot disable feature. Dependent features: ${dependencyCheck.dependentFeatures.join(', ')}` 
          },
          { status: 400 }
        );
      }
      await registry.disableFeature(params.id);
    }

    return NextResponse.json({
      success: true,
      message: `Feature ${params.id} ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error(`Failed to update feature ${params.id}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update feature' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/features/[id] - Remove a feature
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const registry = await getFeatureRegistry();
    await registry.removeFeature(params.id);

    return NextResponse.json({
      success: true,
      message: `Feature ${params.id} removed successfully`
    });
  } catch (error) {
    console.error(`Failed to remove feature ${params.id}:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to remove feature' 
      },
      { status: 500 }
    );
  }
}