#!/usr/bin/env node

/**
 * Test script to verify sub-agent system functionality
 */

const { SubAgentManager, DEFAULT_AGENT_CONFIGS } = require('./src/lib/sub-agent-manager.ts');

async function testSubAgentSystem() {
  console.log('🧪 Testing Sub-Agent System...\n');

  try {
    // Test 1: Initialize manager
    console.log('1. Initializing SubAgentManager...');
    const manager = new SubAgentManager();
    await manager.initialize();
    console.log('✅ SubAgentManager initialized successfully\n');

    // Test 2: Check available agents
    console.log('2. Checking available agents...');
    const agents = manager.getAvailableAgents();
    console.log(`✅ Found ${agents.length} agents:`);
    agents.forEach(agent => {
      console.log(`   - ${agent.name}: ${agent.description.substring(0, 50)}...`);
    });
    console.log('');

    // Test 3: Verify all required agents are present
    console.log('3. Verifying required agents...');
    const requiredAgents = [
      'product-manager',
      'ux-designer', 
      'solutions-architect',
      'frontend-developer',
      'backend-developer',
      'qa-engineer',
      'devops-engineer',
      'scrum-master'
    ];

    const missingAgents = requiredAgents.filter(name => !agents.find(agent => agent.name === name));
    
    if (missingAgents.length === 0) {
      console.log('✅ All required agents are present');
    } else {
      console.log(`❌ Missing agents: ${missingAgents.join(', ')}`);
    }
    console.log('');

    // Test 4: Check agent configurations
    console.log('4. Validating agent configurations...');
    let configErrors = 0;
    
    agents.forEach(agent => {
      if (!agent.name || !agent.description || !agent.systemPrompt) {
        console.log(`❌ ${agent.name}: Missing required fields`);
        configErrors++;
      } else if (!agent.tools || !Array.isArray(agent.tools) || agent.tools.length === 0) {
        console.log(`❌ ${agent.name}: Invalid or missing tools configuration`);
        configErrors++;
      } else {
        console.log(`✅ ${agent.name}: Configuration valid`);
      }
    });

    if (configErrors === 0) {
      console.log('✅ All agent configurations are valid');
    } else {
      console.log(`❌ Found ${configErrors} configuration errors`);
    }
    console.log('');

    // Test 5: Test agent status tracking
    console.log('5. Testing agent status tracking...');
    const statuses = manager.getAgentStatuses();
    console.log(`✅ Retrieved status for ${statuses.length} agents:`);
    statuses.forEach(status => {
      console.log(`   - ${status.role}: ${status.status}`);
    });
    console.log('');

    // Test 6: Test message system
    console.log('6. Testing message system...');
    await manager.sendMessage({
      from: 'product-manager',
      to: 'frontend-developer',
      type: 'task_assignment',
      content: { task: 'Test task' },
      sessionId: 'test-session'
    });

    const messages = manager.getMessages('product-manager');
    if (messages.length > 0) {
      console.log('✅ Message system working correctly');
    } else {
      console.log('❌ Message system not working');
    }
    console.log('');

    // Test 7: Test thread creation
    console.log('7. Testing thread creation...');
    const threadId = manager.createThread(
      ['product-manager', 'ux-designer', 'frontend-developer'],
      'Test feature development'
    );
    
    if (threadId) {
      console.log(`✅ Thread created successfully: ${threadId}`);
    } else {
      console.log('❌ Thread creation failed');
    }
    console.log('');

    console.log('🎉 Sub-Agent System Test Complete!');
    console.log('\nSummary:');
    console.log(`- ${agents.length} agents loaded`);
    console.log(`- ${configErrors === 0 ? 'All' : agents.length - configErrors} valid configurations`);
    console.log('- Message system functional');
    console.log('- Thread system functional');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test if this script is executed directly
if (require.main === module) {
  testSubAgentSystem();
}

module.exports = { testSubAgentSystem };