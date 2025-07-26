#!/usr/bin/env node

/**
 * Simple verification script for sub-agent configurations
 */

const fs = require('fs').promises;
const path = require('path');

async function verifySubAgents() {
  console.log('🔍 Verifying Sub-Agent Configurations...\n');

  const agentsDir = path.join(__dirname, '.claude', 'agents');
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

  try {
    // Check if agents directory exists
    await fs.access(agentsDir);
    console.log('✅ .claude/agents directory exists');

    // Get all agent files
    const files = await fs.readdir(agentsDir);
    const agentFiles = files.filter(file => file.endsWith('.md'));
    console.log(`✅ Found ${agentFiles.length} agent files`);

    // Check each required agent
    console.log('\n📋 Checking required agents:');
    let allPresent = true;

    for (const agentName of requiredAgents) {
      const agentFile = `${agentName}.md`;
      
      if (agentFiles.includes(agentFile)) {
        // Read and validate the agent file
        const agentPath = path.join(agentsDir, agentFile);
        const content = await fs.readFile(agentPath, 'utf-8');
        
        // Basic validation
        const hasName = content.includes(`name: ${agentName}`);
        const hasDescription = content.includes('description:');
        const hasTools = content.includes('tools:');
        const hasSystemPrompt = content.includes('When invoked:');

        if (hasName && hasDescription && hasTools && hasSystemPrompt) {
          console.log(`   ✅ ${agentName}: Complete configuration`);
        } else {
          console.log(`   ⚠️  ${agentName}: Missing some configuration elements`);
        }
      } else {
        console.log(`   ❌ ${agentName}: File not found`);
        allPresent = false;
      }
    }

    // Check for extra files
    const extraFiles = agentFiles.filter(file => {
      const agentName = file.replace('.md', '');
      return !requiredAgents.includes(agentName);
    });

    if (extraFiles.length > 0) {
      console.log(`\n📄 Additional agent files found: ${extraFiles.join(', ')}`);
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log(`   - Required agents: ${requiredAgents.length}`);
    console.log(`   - Present agents: ${agentFiles.length}`);
    console.log(`   - All required present: ${allPresent ? 'Yes' : 'No'}`);

    if (allPresent) {
      console.log('\n🎉 All sub-agents are properly configured!');
      
      console.log('\n💡 You can now use these agents in Claude Code:');
      console.log('   Example: "Use the frontend-developer sub-agent to create a new component"');
      console.log('   Example: "Ask the product-manager sub-agent to analyze this feature request"');
      
      return true;
    } else {
      console.log('\n❌ Some required agents are missing. Run "npm run init:agents" to create them.');
      return false;
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

// Run verification if this script is executed directly
if (require.main === module) {
  verifySubAgents().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { verifySubAgents };