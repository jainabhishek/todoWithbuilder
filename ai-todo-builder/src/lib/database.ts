import { Pool } from 'pg';
import { memoryDB, shouldUseMemoryDB } from './memory-database';
import { TodoItem } from '@/types';

// Database connection pool
let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

// Database query helper
export async function query(text: string, params?: unknown[]) {
  // Use memory database if PostgreSQL is not available
  if (shouldUseMemoryDB()) {
    throw new Error('PostgreSQL not available - use memory database methods instead');
  }
  
  const pool = getPool();
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// Close database connection
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// High-level database operations that work with both PostgreSQL and memory DB
export const db = {
  async getTodos(): Promise<TodoItem[]> {
    if (shouldUseMemoryDB()) {
      return memoryDB.getTodos();
    }
    
    const result = await query(
      'SELECT id, title, description, completed, metadata, created_at, updated_at FROM todos ORDER BY created_at DESC'
    );
    
    return result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      completed: row.completed,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));
  },

  async getTodoById(id: string): Promise<TodoItem | null> {
    if (shouldUseMemoryDB()) {
      return memoryDB.getTodoById(id);
    }
    
    const result = await query(
      'SELECT id, title, description, completed, metadata, created_at, updated_at FROM todos WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      completed: row.completed,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  },

  async createTodo(data: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<TodoItem> {
    if (shouldUseMemoryDB()) {
      return memoryDB.createTodo(data);
    }
    
    const result = await query(
      'INSERT INTO todos (title, description, metadata) VALUES ($1, $2, $3) RETURNING *',
      [data.title, data.description, data.metadata]
    );
    
    const row = result.rows[0];
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      completed: row.completed,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  },

  async updateTodo(id: string, updates: Partial<TodoItem>): Promise<TodoItem | null> {
    if (shouldUseMemoryDB()) {
      return memoryDB.updateTodo(id, updates);
    }
    
    const { title, description, completed, metadata } = updates;
    const result = await query(
      `UPDATE todos 
       SET title = COALESCE($1, title), 
           description = COALESCE($2, description), 
           completed = COALESCE($3, completed), 
           metadata = COALESCE($4, metadata),
           updated_at = NOW()
       WHERE id = $5 
       RETURNING *`,
      [title, description, completed, metadata, id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      completed: row.completed,
      metadata: row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  },

  async deleteTodo(id: string): Promise<boolean> {
    if (shouldUseMemoryDB()) {
      return memoryDB.deleteTodo(id);
    }
    
    const result = await query(
      'DELETE FROM todos WHERE id = $1 RETURNING id',
      [id]
    );
    
    return result.rows.length > 0;
  }
};