-- Initialize the AI Todo Builder database
-- This script runs when the PostgreSQL container starts for the first time

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core todo table with extensible metadata
CREATE TABLE todos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Feature-specific extensions (managed by AI agents)
CREATE TABLE todo_extensions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    todo_id UUID REFERENCES todos(id) ON DELETE CASCADE,
    feature_id VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Projects created by user requests
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    user_request TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'planning',
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Agent assignments and work tracking
CREATE TABLE agent_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    agent_role VARCHAR(50) NOT NULL,
    agent_id VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'assigned',
    started_at TIMESTAMP,
    completed_at TIMESTAMP
);

-- Inter-agent communication log
CREATE TABLE agent_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    from_agent VARCHAR(100) NOT NULL,
    to_agent VARCHAR(100),
    message_type VARCHAR(50) NOT NULL,
    content JSONB NOT NULL,
    thread_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Generated code and deliverables
CREATE TABLE deliverables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    agent_id VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'code', 'design', 'documentation', 'test'
    name VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- AI-implemented features
CREATE TABLE features (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(20) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    project_id UUID REFERENCES projects(id),
    installed_at TIMESTAMP DEFAULT NOW()
);

-- Feature dependencies and conflicts
CREATE TABLE feature_dependencies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature_id VARCHAR(100) REFERENCES features(id) ON DELETE CASCADE,
    depends_on VARCHAR(100) REFERENCES features(id) ON DELETE CASCADE,
    dependency_type VARCHAR(50) DEFAULT 'required'
);

-- Create indexes for better performance
CREATE INDEX idx_todos_completed ON todos(completed);
CREATE INDEX idx_todos_created_at ON todos(created_at);
CREATE INDEX idx_todo_extensions_todo_id ON todo_extensions(todo_id);
CREATE INDEX idx_todo_extensions_feature_id ON todo_extensions(feature_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_agent_assignments_project_id ON agent_assignments(project_id);
CREATE INDEX idx_agent_messages_project_id ON agent_messages(project_id);
CREATE INDEX idx_deliverables_project_id ON deliverables(project_id);

-- Insert some sample data for development
INSERT INTO todos (title, description) VALUES 
    ('Welcome to AI Todo Builder', 'This is your first todo item. Try adding more!'),
    ('Explore AI Features', 'Click the AI Builder button to request new features');