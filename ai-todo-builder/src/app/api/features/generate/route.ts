import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { CodeGenerator } from '@/lib/code-generator';
import { CodeIntegrator } from '@/lib/code-integrator';
import { TestingPipeline } from '@/lib/testing-pipeline';
import { FeatureRegistryManager, initializeMigrationsTable } from '@/lib/feature-registry';
import { ClaudeCodeSDK } from '@/lib/claude-sdk';
import { FeatureDefinition, ComponentSpec, APISpec } from '@/types';

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/ai_todo_builder'
});

// Initialize services
let featureRegistry: FeatureRegistryManager;
let codeGenerator: CodeGenerator;
let codeIntegrator: CodeIntegrator;
let testingPipeline: TestingPipeline;

async function initializeServices() {
  if (!featureRegistry) {
    await initializeMigrationsTable(pool);
    featureRegistry = new FeatureRegistryManager(pool);
    
    const claudeSDK = new ClaudeCodeSDK();
    codeGenerator = new CodeGenerator(claudeSDK);
    codeIntegrator = new CodeIntegrator(pool, featureRegistry);
    testingPipeline = new TestingPipeline();
  }
}

/**
 * POST /api/features/generate - Generate and integrate a new feature
 */
export async function POST(request: NextRequest) {
  try {
    await initializeServices();
    
    const requestData = await request.json();
    const {
      featureId,
      featureName,
      featureVersion = '1.0.0',
      description,
      components = [],
      apiEndpoints = [],
      generateTests = true,
      dryRun = false,
      sessionId
    } = requestData;

    // Validate required fields
    if (!featureId || !featureName || !description) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: featureId, featureName, description' 
        },
        { status: 400 }
      );
    }

    console.log(`Starting feature generation for: ${featureId}`);

    // Step 1: Check if feature can be integrated
    const integrationCheck = await codeIntegrator.canIntegrateFeature(featureId);
    if (!integrationCheck.canIntegrate) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Feature cannot be integrated',
          conflicts: integrationCheck.conflicts
        },
        { status: 400 }
      );
    }

    const generationResults = {
      featureId,
      components: [] as any[],
      apiEndpoints: [] as any[],
      migrations: [] as any[],
      tests: [] as any[],
      errors: [] as string[],
      warnings: integrationCheck.warnings
    };

    // Step 2: Generate components
    for (const componentSpec of components) {
      try {
        console.log(`Generating component: ${componentSpec.name}`);
        const componentCode = await codeGenerator.generateComponent(componentSpec, {
          sessionId,
          includeTests: generateTests
        });
        
        generationResults.components.push({
          name: componentSpec.name,
          files: componentCode.files,
          tests: componentCode.tests
        });
        
      } catch (error) {
        generationResults.errors.push(`Failed to generate component ${componentSpec.name}: ${error}`);
      }
    }

    // Step 3: Generate API endpoints
    for (const apiSpec of apiEndpoints) {
      try {
        console.log(`Generating API endpoint: ${apiSpec.endpoint}`);
        const apiCode = await codeGenerator.generateAPI(apiSpec, {
          sessionId,
          includeTests: generateTests
        });
        
        generationResults.apiEndpoints.push({
          endpoint: apiSpec.endpoint,
          files: apiCode.files,
          tests: apiCode.tests
        });
        
      } catch (error) {
        generationResults.errors.push(`Failed to generate API ${apiSpec.endpoint}: ${error}`);
      }
    }

    // Step 4: Generate database migrations if needed
    if (description.toLowerCase().includes('database') || description.toLowerCase().includes('table')) {
      try {
        console.log('Generating database migration');
        const migration = await codeGenerator.generateMigration(description, { sessionId });
        generationResults.migrations.push(migration);
      } catch (error) {
        generationResults.errors.push(`Failed to generate migration: ${error}`);
      }
    }

    // Step 5: Combine all generated code
    const allFiles = [
      ...generationResults.components.flatMap(c => c.files),
      ...generationResults.apiEndpoints.flatMap(a => a.files)
    ];

    const allTests = [
      ...generationResults.components.flatMap(c => c.tests),
      ...generationResults.apiEndpoints.flatMap(a => a.tests)
    ];

    const generatedCode = {
      files: allFiles,
      tests: allTests,
      migrations: generationResults.migrations,
      dependencies: [], // Would be extracted from generated code
      sessionId: sessionId || 'default'
    };

    // Step 6: Run testing pipeline if not dry run
    let testResults;
    if (!dryRun && generateTests && allTests.length > 0) {
      console.log('Running testing pipeline');
      testResults = await testingPipeline.runPipeline(generatedCode, {
        runUnit: true,
        runIntegration: false,
        runE2E: false,
        generateCoverage: true
      });
      
      if (!testResults.success) {
        generationResults.errors.push(...testResults.errors);
      }
    }

    // Step 7: Create feature definition
    const featureDefinition: FeatureDefinition = {
      id: featureId,
      name: featureName,
      version: featureVersion,
      enabled: true,
      components: [], // Would be populated with actual React components
      apiEndpoints: [], // Would be populated with actual API endpoints
      databaseMigrations: generationResults.migrations
    };

    // Step 8: Integrate the feature if no errors
    let integrationResult;
    if (generationResults.errors.length === 0) {
      console.log('Integrating feature');
      integrationResult = await codeIntegrator.integrateFeature(
        generatedCode,
        featureDefinition,
        {
          dryRun,
          createBackup: true,
          runTests: generateTests,
          validateCode: true,
          featureId
        }
      );
      
      if (!integrationResult.success) {
        generationResults.errors.push(...integrationResult.errors);
      }
    }

    // Step 9: Prepare response
    const response = {
      success: generationResults.errors.length === 0,
      featureId,
      featureName,
      dryRun,
      generation: {
        componentsGenerated: generationResults.components.length,
        apiEndpointsGenerated: generationResults.apiEndpoints.length,
        migrationsGenerated: generationResults.migrations.length,
        testsGenerated: allTests.length
      },
      testing: testResults ? {
        testsPassed: testResults.testsPassed,
        testsFailed: testResults.testsFailed,
        coverage: testResults.coverage
      } : null,
      integration: integrationResult ? {
        filesCreated: integrationResult.filesCreated,
        testsCreated: integrationResult.testsCreated,
        migrationsApplied: integrationResult.migrationsApplied
      } : null,
      errors: generationResults.errors,
      warnings: generationResults.warnings
    };

    const statusCode = response.success ? 200 : 400;
    
    console.log(`Feature generation completed for ${featureId}. Success: ${response.success}`);
    
    return NextResponse.json(response, { status: statusCode });

  } catch (error) {
    console.error('Feature generation error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Feature generation failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/features/generate - Get generation status or capabilities
 */
export async function GET() {
  try {
    await initializeServices();
    
    return NextResponse.json({
      success: true,
      capabilities: {
        componentGeneration: true,
        apiGeneration: true,
        testGeneration: true,
        migrationGeneration: true,
        codeIntegration: true,
        automatedTesting: true
      },
      supportedFrameworks: ['react', 'next'],
      supportedTestFrameworks: ['vitest', 'jest'],
      supportedLanguages: ['typescript', 'javascript']
    });
  } catch (error) {
    console.error('Failed to get generation capabilities:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get capabilities' 
      },
      { status: 500 }
    );
  }
}