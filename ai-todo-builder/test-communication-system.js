const { SubAgentManager } = require('./src/lib/sub-agent-manager');
const { SharedWorkspace } = require('./src/lib/shared-workspace');
const { CommunicationManager } = require('./src/lib/communication-manager');
const { NotificationSystem } = require('./src/lib/notification-system');
const { RealtimeCommunication } = require('./src/lib/realtime-communication');

async function testCommunicationSystem() {
  console.log('🧪 Testing Communication System Implementation...\n');

  try {
    // Test 1: Initialize Sub-Agent Manager
    console.log('1. Testing Sub-Agent Manager initialization...');
    const subAgentManager = new SubAgentManager();
    await subAgentManager.initialize();
    
    const agents = subAgentManager.getAvailableAgents();
    console.log(`✅ Sub-Agent Manager initialized with ${agents.length} agents`);

    // Test 2: Initialize Shared Workspace
    console.log('\n2. Testing Shared Workspace initialization...');
    const sharedWorkspace = new SharedWorkspace();
    await sharedWorkspace.initialize();
    
    const stats = sharedWorkspace.getWorkspaceStats();
    console.log(`✅ Shared Workspace initialized - ${stats.totalFiles} files, ${stats.activeSessions} sessions`);

    // Test 3: Initialize Real-time Communication
    console.log('\n3. Testing Real-time Communication initialization...');
    const realtimeComm = new RealtimeCommunication();
    
    const connectionStats = realtimeComm.getConnectionStats();
    console.log(`✅ Real-time Communication initialized - ${connectionStats.totalConnections} connections`);

    // Test 4: Initialize Communication Manager
    console.log('\n4. Testing Communication Manager initialization...');
    const communicationManager = new CommunicationManager(
      subAgentManager,
      sharedWorkspace,
      realtimeComm
    );
    
    const workloads = communicationManager.getAllAgentWorkloads();
    console.log(`✅ Communication Manager initialized with ${workloads.length} agent workloads`);

    // Test 5: Test Workspace File Operations
    console.log('\n5. Testing Workspace file operations...');
    
    // Create a session
    const session = await sharedWorkspace.createSession('frontend-developer', 'test-project-1');
    console.log(`✅ Created workspace session: ${session.id}`);

    // Create a file
    const file = await sharedWorkspace.createFile({
      name: 'test-component.tsx',
      content: 'import React from "react";\n\nexport function TestComponent() {\n  return <div>Test</div>;\n}',
      type: 'code',
      createdBy: 'frontend-developer',
      projectId: 'test-project-1'
    });
    console.log(`✅ Created workspace file: ${file.name} (${file.id})`);

    // Lock the file
    const locked = await sharedWorkspace.lockFile(file.id, 'frontend-developer');
    console.log(`✅ File lock ${locked ? 'successful' : 'failed'}`);

    // Add a comment
    const comment = await sharedWorkspace.addComment({
      fileId: file.id,
      agentRole: 'ux-designer',
      content: 'This component needs better styling',
      lineNumber: 3
    });
    console.log(`✅ Added comment: ${comment.id}`);

    // Test 6: Test Communication Thread
    console.log('\n6. Testing Communication threads...');
    
    const thread = await communicationManager.createThread(
      'Feature Discussion',
      ['frontend-developer', 'ux-designer', 'product-manager'],
      'test-project-1'
    );
    console.log(`✅ Created communication thread: ${thread.id}`);

    // Send a message
    await communicationManager.sendMessage(
      thread.id,
      'product-manager',
      {
        type: 'feature_request',
        message: 'We need to implement a new todo priority system',
        priority: 'high'
      }
    );
    console.log(`✅ Sent message in thread`);

    // Test 7: Test Handoff System
    console.log('\n7. Testing Agent handoff system...');
    
    const handoffRequest = await communicationManager.suggestHandoff(
      'product-manager',
      'frontend-developer',
      'Need UI implementation for priority system',
      { specifications: 'Priority levels: Low, Medium, High, Urgent' },
      'Implement priority selection UI component',
      'test-project-1'
    );
    console.log(`✅ Created handoff request: ${handoffRequest.id}`);

    // Accept the handoff
    await communicationManager.acceptHandoff(handoffRequest.id);
    console.log(`✅ Handoff accepted and processed`);

    // Test 8: Test Notification System
    console.log('\n8. Testing Notification system...');
    
    const notificationSystem = communicationManager.getNotificationSystem();
    
    // Send a project notification
    await notificationSystem.sendProjectNotification(
      'phase_started',
      {
        projectId: 'test-project-1',
        projectTitle: 'Todo Priority System',
        phase: 'development'
      },
      'frontend-developer'
    );
    console.log(`✅ Sent project notification`);

    // Get notifications
    const notifications = notificationSystem.getNotifications('frontend-developer', {
      unreadOnly: true,
      limit: 5
    });
    console.log(`✅ Retrieved ${notifications.length} notifications for frontend-developer`);

    // Test 9: Test Workspace Search
    console.log('\n9. Testing Workspace search...');
    
    const searchResults = sharedWorkspace.searchFiles('component', 'test-project-1');
    console.log(`✅ Found ${searchResults.length} files matching 'component'`);

    // Test 10: Test Statistics and Cleanup
    console.log('\n10. Testing Statistics and cleanup...');
    
    const workspaceStats = sharedWorkspace.getWorkspaceStats();
    const notificationStats = notificationSystem.getStatistics('frontend-developer');
    
    console.log(`✅ Workspace stats: ${workspaceStats.totalFiles} files, ${workspaceStats.totalComments} comments`);
    console.log(`✅ Notification stats: ${notificationStats.total} total, ${notificationStats.unread} unread`);

    // Cleanup
    await communicationManager.cleanup();
    console.log(`✅ Cleanup completed`);

    console.log('\n🎉 All communication system tests passed!');
    console.log('\n📊 Summary:');
    console.log(`- Agents initialized: ${agents.length}`);
    console.log(`- Files created: ${workspaceStats.totalFiles}`);
    console.log(`- Comments added: ${workspaceStats.totalComments}`);
    console.log(`- Threads created: 1`);
    console.log(`- Handoffs processed: 1`);
    console.log(`- Notifications sent: ${notificationStats.total}`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testCommunicationSystem().catch(console.error);