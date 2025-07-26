#!/usr/bin/env node

/**
 * Test script to verify sub-agent API functionality
 * Note: This requires the Next.js server to be running
 */

async function testSubAgentAPI() {
  console.log('🧪 Testing Sub-Agent API...\n');

  const baseUrl = 'http://localhost:3000';

  try {
    // Test 1: Get all sub-agents
    console.log('1. Testing GET /api/sub-agents...');
    const response = await fetch(`${baseUrl}/api/sub-agents`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.success && data.data.agents) {
      console.log(`✅ Retrieved ${data.data.agents.length} agents`);
      console.log('   Available agents:');
      data.data.agents.forEach(agent => {
        console.log(`   - ${agent.name}`);
      });
    } else {
      console.log('❌ Invalid response format');
    }

    console.log('\n2. Testing agent status...');
    if (data.data.statuses) {
      console.log(`✅ Retrieved status for ${data.data.statuses.length} agents`);
      data.data.statuses.forEach(status => {
        console.log(`   - ${status.role}: ${status.status}`);
      });
    }

    console.log('\n🎉 Sub-Agent API test completed successfully!');
    console.log('\n💡 To test task delegation, you would need to:');
    console.log('   1. Ensure Claude Code SDK is properly configured');
    console.log('   2. Have valid API credentials');
    console.log('   3. Use the delegation endpoint with a real task');

  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Connection refused. Make sure the Next.js server is running:');
      console.log('   npm run dev');
    } else {
      console.error('❌ API test failed:', error.message);
    }
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testSubAgentAPI();
}

module.exports = { testSubAgentAPI };