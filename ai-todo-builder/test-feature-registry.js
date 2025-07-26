const { Pool } = require('pg');

// Test the feature registry system
async function testFeatureRegistry() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/ai_todo_builder'
  });

  try {
    console.log('🧪 Testing Feature Registry System...\n');

    // Test 1: Register a sample feature
    console.log('1. Testing feature registration...');
    const registerResponse = await fetch('http://localhost:3000/api/features', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'priority-system',
        name: 'Priority System',
        version: '1.0.0',
        enabled: true,
        components: [],
        apiEndpoints: [],
        databaseMigrations: [
          {
            id: 'add_priority_column',
            up: 'ALTER TABLE todos ADD COLUMN priority INTEGER DEFAULT 0;',
            down: 'ALTER TABLE todos DROP COLUMN priority;'
          }
        ]
      }),
    });

    const registerData = await registerResponse.json();
    console.log('Registration result:', registerData);

    // Test 2: Get all features
    console.log('\n2. Testing feature retrieval...');
    const featuresResponse = await fetch('http://localhost:3000/api/features');
    const featuresData = await featuresResponse.json();
    console.log('Features:', featuresData);

    // Test 3: Get specific feature
    console.log('\n3. Testing specific feature retrieval...');
    const featureResponse = await fetch('http://localhost:3000/api/features/priority-system');
    const featureData = await featureResponse.json();
    console.log('Specific feature:', featureData);

    // Test 4: Disable feature
    console.log('\n4. Testing feature disable...');
    const disableResponse = await fetch('http://localhost:3000/api/features/priority-system', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled: false }),
    });
    const disableData = await disableResponse.json();
    console.log('Disable result:', disableData);

    // Test 5: Enable feature
    console.log('\n5. Testing feature enable...');
    const enableResponse = await fetch('http://localhost:3000/api/features/priority-system', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled: true }),
    });
    const enableData = await enableResponse.json();
    console.log('Enable result:', enableData);

    // Test 6: Add dependency
    console.log('\n6. Testing dependency addition...');
    
    // First register another feature to depend on
    await fetch('http://localhost:3000/api/features', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: 'base-system',
        name: 'Base System',
        version: '1.0.0',
        enabled: true
      }),
    });

    const dependencyResponse = await fetch('http://localhost:3000/api/features/priority-system/dependencies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dependsOn: 'base-system',
        dependencyType: 'required'
      }),
    });
    const dependencyData = await dependencyResponse.json();
    console.log('Dependency addition result:', dependencyData);

    // Test 7: Get dependencies
    console.log('\n7. Testing dependency retrieval...');
    const depsResponse = await fetch('http://localhost:3000/api/features/priority-system/dependencies');
    const depsData = await depsResponse.json();
    console.log('Dependencies:', depsData);

    // Test 8: Try to disable base-system (should fail due to dependency)
    console.log('\n8. Testing dependency protection...');
    const protectionResponse = await fetch('http://localhost:3000/api/features/base-system', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ enabled: false }),
    });
    const protectionData = await protectionResponse.json();
    console.log('Dependency protection result:', protectionData);

    // Test 9: Get active features only
    console.log('\n9. Testing active features filter...');
    const activeResponse = await fetch('http://localhost:3000/api/features?active=true');
    const activeData = await activeResponse.json();
    console.log('Active features:', activeData);

    console.log('\n✅ Feature Registry tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await pool.end();
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testFeatureRegistry();
}

module.exports = { testFeatureRegistry };