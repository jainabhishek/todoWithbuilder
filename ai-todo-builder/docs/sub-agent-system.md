# Sub-Agent System Documentation

## Overview

The AI Todo Builder implements a sophisticated sub-agent system using Claude Code SDK that enables specialized AI agents to collaborate on feature development. Each agent has a specific role and expertise area, working together like a professional software development team.

## Architecture

### Core Components

1. **SubAgentManager** (`src/lib/sub-agent-manager.ts`)
   - Central orchestrator for all sub-agent operations
   - Handles agent creation, configuration, and lifecycle management
   - Manages inter-agent communication and task delegation

2. **Sub-Agent Configurations** (`.claude/agents/*.md`)
   - Markdown files with YAML frontmatter defining each agent
   - Contains system prompts, tool permissions, and descriptions
   - Automatically loaded by Claude Code for direct invocation

3. **API Endpoints** (`src/app/api/sub-agents/`)
   - REST API for managing agents and delegating tasks
   - Communication endpoints for inter-agent messaging
   - Real-time status updates and progress tracking

4. **React Components** (`src/components/SubAgentConsole.tsx`)
   - User interface for interacting with the sub-agent system
   - Real-time status monitoring and task delegation
   - Visual representation of agent activities

## Available Agents

### Product Manager (`product-manager`)
- **Role**: Requirements analysis and user story creation
- **Tools**: Read, Write, Grep
- **Specialization**: Feature planning, stakeholder communication, project specifications

### UX Designer (`ux-designer`)
- **Role**: UI/UX design and user experience optimization
- **Tools**: Read, Write, Bash
- **Specialization**: Wireframes, mockups, user flows, accessibility compliance

### Solutions Architect (`solutions-architect`)
- **Role**: System architecture and technical design decisions
- **Tools**: Read, Write, Grep, Glob
- **Specialization**: Scalable system design, technology decisions, technical specifications

### Frontend Developer (`frontend-developer`)
- **Role**: React/TypeScript frontend development
- **Tools**: Read, Write, Edit, Bash, Grep, Glob
- **Specialization**: UI implementation, component creation, responsive design

### Backend Developer (`backend-developer`)
- **Role**: Node.js/Express API development and database operations
- **Tools**: Read, Write, Edit, Bash, Grep, Glob
- **Specialization**: REST APIs, database design, business logic, security

### QA Engineer (`qa-engineer`)
- **Role**: Testing and quality assurance
- **Tools**: Read, Write, Bash, Grep, Glob
- **Specialization**: Test plans, automated testing, bug reporting, quality standards

### DevOps Engineer (`devops-engineer`)
- **Role**: Infrastructure, deployment, and CI/CD pipeline management
- **Tools**: Read, Write, Bash, Grep, Glob
- **Specialization**: Deployment automation, infrastructure, monitoring, security

### Scrum Master (`scrum-master`)
- **Role**: Project coordination and agile process facilitation
- **Tools**: Read, Write
- **Specialization**: Sprint planning, team coordination, progress tracking

## Usage

### Direct Claude Code Invocation

You can invoke any sub-agent directly in Claude Code:

```
Use the frontend-developer sub-agent to create a new React component for displaying user profiles
```

```
Ask the product-manager sub-agent to analyze this feature request and create user stories
```

### Programmatic Usage

```typescript
import { SubAgentManager } from '@/lib/sub-agent-manager';

const manager = new SubAgentManager();
await manager.initialize();

// Delegate a task
const result = await manager.delegateTask(
  'frontend-developer',
  'Create a responsive navigation component with mobile menu support'
);

// Handle agent handoff
const handoffResult = await manager.handleHandoff(
  'product-manager',
  'ux-designer',
  { requirements: [...] },
  'Create wireframes based on these requirements'
);
```

### React Component Usage

```tsx
import { SubAgentConsole } from '@/components';

function AIBuilderPage() {
  return (
    <div>
      <h1>AI Builder</h1>
      <SubAgentConsole />
    </div>
  );
}
```

## API Endpoints

### GET /api/sub-agents
Get all available sub-agents and their current status.

### POST /api/sub-agents
Create a new sub-agent or delegate a task to an existing agent.

**Task Delegation:**
```json
{
  "action": "delegate",
  "agentName": "frontend-developer",
  "taskDescription": "Create a new component",
  "options": {}
}
```

**Agent Creation:**
```json
{
  "name": "custom-agent",
  "description": "Custom agent description",
  "tools": ["Read", "Write"],
  "systemPrompt": "Custom system prompt"
}
```

### PUT /api/sub-agents
Update an existing sub-agent configuration.

### DELETE /api/sub-agents?name=agent-name
Delete a sub-agent.

### POST /api/sub-agents/communication
Send messages between agents or create communication threads.

**Message Sending:**
```json
{
  "from": "product-manager",
  "to": "frontend-developer",
  "type": "task_assignment",
  "content": { "task": "Implement user story" },
  "sessionId": "session-123"
}
```

**Thread Creation:**
```json
{
  "action": "create_thread",
  "participants": ["product-manager", "ux-designer", "frontend-developer"],
  "topic": "User authentication feature"
}
```

## Configuration Management

### Initialization

Run the initialization script to set up default agents:

```bash
npm run init:agents
```

Or use the full setup command:

```bash
npm run setup
```

### Custom Agent Creation

Create a new agent file in `.claude/agents/`:

```markdown
---
name: custom-specialist
description: Specialized agent for custom tasks. Use proactively for specific domain expertise.
tools: Read, Write, Edit, Bash
---

You are a specialist in [domain]. When invoked:

1. Analyze the specific requirements
2. Apply domain expertise
3. Provide detailed solutions
4. Ensure best practices

Focus on [specific areas of expertise].
```

## Communication System

### Message Types

- `TASK_ASSIGNMENT`: Assigning tasks between agents
- `TASK_RESULT`: Sharing task completion results
- `QUESTION`: Asking questions between agents
- `ANSWER`: Providing answers to questions
- `STATUS_UPDATE`: Updating work progress
- `HANDOFF`: Transferring work between agents
- `BROADCAST`: System-wide announcements

### Thread Management

Agents can create communication threads for coordinated work:

```typescript
const threadId = await manager.createThread(
  ['product-manager', 'ux-designer', 'frontend-developer'],
  'User dashboard redesign'
);
```

## Best Practices

### Agent Design

1. **Single Responsibility**: Each agent should have a clear, focused role
2. **Detailed Prompts**: Include specific instructions and examples
3. **Tool Limitations**: Only grant necessary tools for security
4. **Proactive Usage**: Design descriptions to encourage automatic invocation

### Task Delegation

1. **Clear Descriptions**: Provide specific, actionable task descriptions
2. **Context Sharing**: Include relevant context for better results
3. **Incremental Work**: Break complex tasks into smaller, manageable pieces
4. **Validation**: Always validate agent outputs before integration

### Communication

1. **Structured Messages**: Use appropriate message types for clarity
2. **Thread Organization**: Group related communications in threads
3. **Status Updates**: Keep agents informed of progress and changes
4. **Error Handling**: Implement robust error handling for failed communications

## Troubleshooting

### Common Issues

1. **Agent Not Found**: Ensure agent configuration exists in `.claude/agents/`
2. **Task Delegation Fails**: Check agent tools and system prompt configuration
3. **Communication Errors**: Verify message format and required fields
4. **Performance Issues**: Monitor agent resource usage and session management

### Debugging

Enable verbose logging for detailed debugging information:

```typescript
const result = await manager.delegateTask(agentName, task, {
  verbose: true
});
```

## Future Enhancements

1. **Agent Learning**: Implement feedback loops for agent improvement
2. **Workflow Automation**: Create predefined workflows for common tasks
3. **Performance Monitoring**: Add detailed metrics and performance tracking
4. **Advanced Communication**: Implement more sophisticated inter-agent protocols
5. **Visual Workflow**: Create visual representations of agent interactions

## Security Considerations

1. **Tool Permissions**: Carefully control which tools each agent can access
2. **Input Validation**: Validate all inputs to prevent injection attacks
3. **Session Management**: Implement proper session isolation and cleanup
4. **Audit Logging**: Log all agent activities for security monitoring
5. **Rate Limiting**: Implement rate limiting to prevent abuse

## Contributing

When adding new agents or modifying existing ones:

1. Follow the established naming conventions
2. Include comprehensive system prompts
3. Test agent behavior thoroughly
4. Update documentation
5. Add appropriate tests

For more information, see the main project documentation and the Claude Code SDK documentation.