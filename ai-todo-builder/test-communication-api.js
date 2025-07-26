const http = require('http');

async function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testCommunicationAPI() {
  console.log('🧪 Testing Communication API Endpoints...\n');

  try {
    // Test 1: Test workspace API
    console.log('1. Testing Workspace API...');
    
    // Get workspace stats
    const statsResponse = await makeRequest('/api/communication/workspace?action=stats');
    if (statsResponse.status === 200 && statsResponse.data.success) {
      console.log('✅ Workspace stats endpoint working');
    } else {
      console.log('❌ Workspace stats endpoint failed:', statsResponse.data);
    }

    // Create a workspace session
    const sessionResponse = await makeRequest('/api/communication/workspace', 'POST', {
      action: 'create_session',
      agentRole: 'frontend-developer',
      projectId: 'test-project'
    });
    
    if (sessionResponse.status === 200 && sessionResponse.data.success) {
      console.log('✅ Workspace session creation working');
    } else {
      console.log('❌ Workspace session creation failed:', sessionResponse.data);
    }

    // Test 2: Test notifications API
    console.log('\n2. Testing Notifications API...');
    
    // Get notifications for an agent
    const notificationsResponse = await makeRequest('/api/communication/notifications?agentRole=frontend-developer&action=list');
    if (notificationsResponse.status === 200 && notificationsResponse.data.success) {
      console.log('✅ Notifications list endpoint working');
    } else {
      console.log('❌ Notifications list endpoint failed:', notificationsResponse.data);
    }

    // Get notification preferences
    const preferencesResponse = await makeRequest('/api/communication/notifications?agentRole=frontend-developer&action=preferences');
    if (preferencesResponse.status === 200 && preferencesResponse.data.success) {
      console.log('✅ Notification preferences endpoint working');
    } else {
      console.log('❌ Notification preferences endpoint failed:', preferencesResponse.data);
    }

    // Test 3: Test real-time API
    console.log('\n3. Testing Real-time API...');
    
    // Get connection stats
    const realtimeStatsResponse = await makeRequest('/api/communication/realtime?action=stats');
    if (realtimeStatsResponse.status === 200 && realtimeStatsResponse.data.success) {
      console.log('✅ Real-time stats endpoint working');
    } else {
      console.log('❌ Real-time stats endpoint failed:', realtimeStatsResponse.data);
    }

    // Get connections
    const connectionsResponse = await makeRequest('/api/communication/realtime?action=connections');
    if (connectionsResponse.status === 200 && connectionsResponse.data.success) {
      console.log('✅ Real-time connections endpoint working');
    } else {
      console.log('❌ Real-time connections endpoint failed:', connectionsResponse.data);
    }

    // Test 4: Test coordination API
    console.log('\n4. Testing Coordination API...');
    
    // Get coordination overview
    const coordinationResponse = await makeRequest('/api/coordination');
    if (coordinationResponse.status === 200 && coordinationResponse.data.success) {
      console.log('✅ Coordination overview endpoint working');
    } else {
      console.log('❌ Coordination overview endpoint failed:', coordinationResponse.data);
    }

    // Get agent workloads
    const workloadsResponse = await makeRequest('/api/coordination?type=workloads');
    if (workloadsResponse.status === 200 && workloadsResponse.data.success) {
      console.log('✅ Agent workloads endpoint working');
    } else {
      console.log('❌ Agent workloads endpoint failed:', workloadsResponse.data);
    }

    console.log('\n🎉 Communication API tests completed!');
    console.log('\nNote: Some endpoints may show empty data since the system is not fully running.');
    console.log('To test real-time features, start the Next.js development server with: npm run dev');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
    console.log('\n💡 Make sure the Next.js development server is running on port 3000');
    console.log('Run: npm run dev');
  }
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await makeRequest('/api/status');
    if (response.status === 200) {
      console.log('✅ Server is running, starting tests...\n');
      await testCommunicationAPI();
    } else {
      throw new Error('Server not responding correctly');
    }
  } catch (error) {
    console.log('❌ Server is not running on port 3000');
    console.log('Please start the development server with: npm run dev');
    console.log('Then run this test again.');
  }
}

checkServer();