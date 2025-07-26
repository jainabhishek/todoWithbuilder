#!/usr/bin/env node

/**
 * Test script for project orchestration system
 */

const { ProjectManager } = require('./src/lib/project-manager.ts');

async function testProjectOrchestration() {
  console.log('🧪 Testing Project Orchestration System...\n');

  try {
    // Initialize project manager
    console.log('1. Initializing Project Manager...');
    const projectManager = new ProjectManager();
    await projectManager.initialize();
    console.log('✅ Project Manager initialized\n');

    // Create a test project
    console.log('2. Creating test project...');
    const project = await projectManager.createProject({
      title: 'Test Feature: Priority System',
      description: 'Add priority levels to todo items',
      userRequest: 'I want to be able to set priority levels (low, medium, high, urgent) for my todo items',
      priority: 'medium'
    });
    console.log('✅ Project created:', project.id, '\n');

    // Auto-assign agents
    console.log('3. Auto-assigning agents...');
    const assignments = await projectManager.autoAssignAgents(project.id);
    console.log('✅ Agents assigned:', assignments.map(a => a.agentRole).join(', '), '\n');

    // Get project statistics
    console.log('4. Getting project statistics...');
    const stats = projectManager.getProjectStatistics();
    console.log('✅ Statistics:', {
      total: stats.total,
      byStatus: stats.byStatus,
      activeAgents: stats.activeAgents
    }, '\n');

    // Get agent workloads
    console.log('5. Getting agent workloads...');
    const workloads = projectManager.getAgentWorkloads();
    console.log('✅ Agent workloads:');
    workloads.forEach(w => {
      console.log(`  - ${w.agentRole}: ${w.currentTasks}/${w.maxCapacity} (${w.availability})`);
    });
    console.log();

    // Get project health
    console.log('6. Getting project health...');
    const health = projectManager.getProjectHealth(project.id);
    console.log('✅ Project health:', {
      score: health.score,
      issues: health.issues,
      recommendations: health.recommendations
    }, '\n');

    // Create communication thread
    console.log('7. Creating communication thread...');
    const threadId = await projectManager.createProjectThread(
      project.id,
      'Feature Discussion',
      ['product-manager', 'frontend-developer']
    );
    console.log('✅ Thread created:', threadId, '\n');

    // Test coordination features
    console.log('8. Testing coordination features...');
    const coordination = await projectManager.getProjectProgressWithCoordination(project.id);
    console.log('✅ Coordination data:', {
      activeThreads: coordination.coordination.activeThreads,
      pendingHandoffs: coordination.coordination.pendingHandoffs,
      agentWorkloads: coordination.coordination.agentWorkloads.length
    }, '\n');

    // Test workload rebalancing
    console.log('9. Testing workload rebalancing...');
    const rebalance = await projectManager.rebalanceWorkloads();
    console.log('✅ Rebalance result:', rebalance, '\n');

    console.log('🎉 All project orchestration tests passed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testProjectOrchestration();
}

module.exports = { testProjectOrchestration };