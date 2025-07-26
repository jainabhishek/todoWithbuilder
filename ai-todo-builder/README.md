# AI Todo Builder

A modern todo list application enhanced with an AI builder functionality that allows users to request new features through natural language. The system uses Claude Code SDK to orchestrate multiple specialized AI agents that collaborate like a real software development team.

## Features

- **Modern Todo App**: Clean, responsive interface built with Next.js, TypeScript, and Tailwind CSS
- **AI Builder**: Request new features using natural language
- **Multi-Agent System**: Specialized AI agents for different development roles (PM, Designer, Developer, QA, DevOps)
- **Real-time Collaboration**: AI agents communicate and coordinate like a real software team
- **Dynamic Feature Integration**: New features are automatically implemented and integrated
- **Data Safety**: Automatic backups and rollback capabilities

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js, PostgreSQL, Redis
- **AI Integration**: Claude Code SDK with sub-agents
- **Database**: PostgreSQL with Docker
- **Caching**: Redis for session management

## Getting Started

### Prerequisites

- Node.js 18+ 
- Docker and Docker Compose (optional, for PostgreSQL)
- Claude API key (for AI features)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd ai-todo-builder
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# The .env.local file is already configured for development
# For production, update DATABASE_URL to use PostgreSQL
```

4. **Option A: Quick Start (In-Memory Database)**
```bash
npm run dev
```

5. **Option B: Full Setup (PostgreSQL)**
```bash
npm run db:up  # Start PostgreSQL and Redis
# Update .env.local to uncomment DATABASE_URL and comment USE_MEMORY_DB
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Database Modes

The application supports two database modes:

**In-Memory Database (Default)**
- No external dependencies required
- Perfect for development and testing
- Data is reset on server restart
- Automatically used when `USE_MEMORY_DB="true"` in `.env.local`

**PostgreSQL (Production)**
- Persistent data storage
- Full SQL capabilities
- Requires Docker or local PostgreSQL installation
- Used when `DATABASE_URL` is set in `.env.local`

## Development Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:up` - Start PostgreSQL and Redis with Docker
- `npm run db:down` - Stop database containers
- `npm run db:reset` - Reset database with fresh data

## Project Structure

```
ai-todo-builder/
├── src/
│   ├── app/                 # Next.js app router
│   │   ├── api/            # API routes
│   │   └── page.tsx        # Main page
│   ├── components/         # React components
│   ├── lib/               # Utility libraries
│   │   ├── database.ts    # Database connection
│   │   ├── claude-sdk.ts  # Claude Code SDK integration
│   │   └── redis.ts       # Redis connection
│   └── types/             # TypeScript type definitions
├── .claude/
│   └── agents/            # AI sub-agent configurations
├── database/
│   └── init/              # Database initialization scripts
├── docker-compose.yml     # Database services
└── README.md
```

## AI Agent System

The application includes specialized AI agents:

- **Product Manager**: Requirements analysis and user story creation
- **Frontend Developer**: React/TypeScript UI implementation
- **Backend Developer**: Node.js API and database development
- **QA Engineer**: Testing and quality assurance

Each agent is configured as a Claude Code sub-agent with specialized tools and system prompts.

## Database Schema

The application uses PostgreSQL with the following main tables:

- `todos` - Core todo items with extensible metadata
- `todo_extensions` - Feature-specific data extensions
- `projects` - AI development projects
- `agent_assignments` - Agent work tracking
- `agent_messages` - Inter-agent communication
- `deliverables` - Generated code and artifacts
- `features` - AI-implemented features registry

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.