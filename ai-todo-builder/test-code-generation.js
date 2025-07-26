const fetch = require('node-fetch');

// Test the code generation and integration pipeline
async function testCodeGeneration() {
  try {
    console.log('🧪 Testing Code Generation and Integration Pipeline...\n');

    // Test 1: Get generation capabilities
    console.log('1. Testing generation capabilities...');
    const capabilitiesResponse = await fetch('http://localhost:3000/api/features/generate');
    const capabilitiesData = await capabilitiesResponse.json();
    console.log('Capabilities:', JSON.stringify(capabilitiesData, null, 2));

    // Test 2: Generate a simple priority feature (dry run)
    console.log('\n2. Testing feature generation (dry run)...');
    const dryRunRequest = {
      featureId: 'priority-system',
      featureName: 'Priority System',
      featureVersion: '1.0.0',
      description: 'Add priority levels to todo items with visual indicators and sorting capabilities',
      components: [
        {
          name: 'PrioritySelector',
          props: {
            priority: 'number',
            onChange: 'function',
            disabled: 'boolean'
          },
          functionality: [
            'Display priority levels (Low, Medium, High, Critical)',
            'Handle priority changes with callbacks',
            'Show visual priority indicators with colors',
            'Support keyboard navigation'
          ],
          styling: 'Tailwind CSS with priority-based color coding (green, yellow, orange, red)'
        }
      ],
      apiEndpoints: [
        {
          endpoint: '/api/todos/[id]/priority',
          method: 'PATCH',
          parameters: {
            id: 'string',
            priority: 'number'
          },
          response: {
            success: 'boolean',
            todo: 'TodoItem',
            message: 'string'
          },
          validation: [
            'Valid todo ID format',
            'Priority must be between 0-3',
            'Todo must exist in database'
          ]
        }
      ],
      generateTests: true,
      dryRun: true
    };

    const dryRunResponse = await fetch('http://localhost:3000/api/features/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(dryRunRequest),
    });

    const dryRunData = await dryRunResponse.json();
    console.log('Dry run result:', JSON.stringify(dryRunData, null, 2));

    // Test 3: Generate a simple feature (actual generation)
    console.log('\n3. Testing actual feature generation...');
    const actualRequest = {
      ...dryRunRequest,
      featureId: 'simple-priority',
      featureName: 'Simple Priority',
      dryRun: false,
      components: [
        {
          name: 'SimplePriorityBadge',
          props: {
            priority: 'number'
          },
          functionality: [
            'Display priority as colored badge',
            'Show priority text (Low, Medium, High)'
          ],
          styling: 'Tailwind CSS with simple badge styling'
        }
      ],
      apiEndpoints: [] // Simplified - no API endpoints for this test
    };

    const actualResponse = await fetch('http://localhost:3000/api/features/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(actualRequest),
    });

    const actualData = await actualResponse.json();
    console.log('Actual generation result:', JSON.stringify(actualData, null, 2));

    // Test 4: Test feature registry after generation
    console.log('\n4. Testing feature registry after generation...');
    const featuresResponse = await fetch('http://localhost:3000/api/features');
    const featuresData = await featuresResponse.json();
    console.log('Registered features:', JSON.stringify(featuresData, null, 2));

    // Test 5: Test error handling with invalid request
    console.log('\n5. Testing error handling...');
    const invalidRequest = {
      featureName: 'Invalid Feature',
      // Missing required featureId and description
      components: []
    };

    const errorResponse = await fetch('http://localhost:3000/api/features/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidRequest),
    });

    const errorData = await errorResponse.json();
    console.log('Error handling result:', JSON.stringify(errorData, null, 2));

    console.log('\n✅ Code Generation and Integration Pipeline tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Helper function to test specific generation scenarios
async function testSpecificScenarios() {
  console.log('\n🎯 Testing Specific Generation Scenarios...\n');

  // Scenario 1: Component-only feature
  console.log('Scenario 1: Component-only feature...');
  const componentOnlyRequest = {
    featureId: 'todo-counter',
    featureName: 'Todo Counter',
    description: 'Display count of completed and pending todos',
    components: [
      {
        name: 'TodoCounter',
        props: {
          todos: 'TodoItem[]'
        },
        functionality: [
          'Count completed todos',
          'Count pending todos',
          'Display completion percentage'
        ],
        styling: 'Tailwind CSS with progress indicators'
      }
    ],
    generateTests: true,
    dryRun: true
  };

  const componentResponse = await fetch('http://localhost:3000/api/features/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(componentOnlyRequest),
  });

  const componentData = await componentResponse.json();
  console.log('Component-only result:', componentData.success ? 'SUCCESS' : 'FAILED');
  if (!componentData.success) {
    console.log('Errors:', componentData.errors);
  }

  // Scenario 2: API-only feature
  console.log('\nScenario 2: API-only feature...');
  const apiOnlyRequest = {
    featureId: 'todo-export',
    featureName: 'Todo Export',
    description: 'Export todos to various formats',
    apiEndpoints: [
      {
        endpoint: '/api/todos/export',
        method: 'GET',
        parameters: {
          format: 'string',
          filter: 'object'
        },
        response: {
          success: 'boolean',
          data: 'string',
          filename: 'string'
        },
        validation: [
          'Valid export format (json, csv, txt)',
          'Valid filter parameters'
        ]
      }
    ],
    generateTests: true,
    dryRun: true
  };

  const apiResponse = await fetch('http://localhost:3000/api/features/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(apiOnlyRequest),
  });

  const apiData = await apiResponse.json();
  console.log('API-only result:', apiData.success ? 'SUCCESS' : 'FAILED');
  if (!apiData.success) {
    console.log('Errors:', apiData.errors);
  }

  // Scenario 3: Database migration feature
  console.log('\nScenario 3: Database migration feature...');
  const migrationRequest = {
    featureId: 'todo-categories',
    featureName: 'Todo Categories',
    description: 'Add categories table and relationship to todos for better organization',
    components: [],
    apiEndpoints: [],
    generateTests: false,
    dryRun: true
  };

  const migrationResponse = await fetch('http://localhost:3000/api/features/generate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(migrationRequest),
  });

  const migrationData = await migrationResponse.json();
  console.log('Migration result:', migrationData.success ? 'SUCCESS' : 'FAILED');
  if (!migrationData.success) {
    console.log('Errors:', migrationData.errors);
  }

  console.log('\n✅ Specific scenario tests completed!');
}

// Run tests if this script is executed directly
if (require.main === module) {
  testCodeGeneration()
    .then(() => testSpecificScenarios())
    .catch(console.error);
}

module.exports = { testCodeGeneration, testSpecificScenarios };