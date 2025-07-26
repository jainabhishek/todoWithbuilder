// In-memory database for development when PostgreSQL is not available
import { TodoItem } from '@/types';

interface MemoryDatabase {
  todos: TodoItem[];
}

// Simple in-memory storage
const db: MemoryDatabase = {
  todos: [
    {
      id: '1',
      title: 'Welcome to AI Todo Builder',
      description: 'This is your first todo item. Try adding more!',
      completed: false,
      metadata: {},
      createdAt: new Date('2024-01-01T10:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
    },
    {
      id: '2',
      title: 'Explore AI Features',
      description: 'Click the AI Builder button to request new features',
      completed: false,
      metadata: {},
      createdAt: new Date('2024-01-01T10:05:00Z'),
      updatedAt: new Date('2024-01-01T10:05:00Z'),
    },
  ]
};

// Generate UUID-like ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Simulate database operations
export const memoryDB = {
  // Get all todos
  async getTodos(): Promise<TodoItem[]> {
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 50));
    return [...db.todos].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  // Get todo by ID
  async getTodoById(id: string): Promise<TodoItem | null> {
    await new Promise(resolve => setTimeout(resolve, 30));
    return db.todos.find(todo => todo.id === id) || null;
  },

  // Create new todo
  async createTodo(data: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<TodoItem> {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const now = new Date();
    const newTodo: TodoItem = {
      id: generateId(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };
    
    db.todos.push(newTodo);
    return newTodo;
  },

  // Update todo
  async updateTodo(id: string, updates: Partial<TodoItem>): Promise<TodoItem | null> {
    await new Promise(resolve => setTimeout(resolve, 80));
    
    const todoIndex = db.todos.findIndex(todo => todo.id === id);
    if (todoIndex === -1) {
      return null;
    }
    
    const updatedTodo: TodoItem = {
      ...db.todos[todoIndex],
      ...updates,
      id, // Ensure ID doesn't change
      updatedAt: new Date(),
    };
    
    db.todos[todoIndex] = updatedTodo;
    return updatedTodo;
  },

  // Delete todo
  async deleteTodo(id: string): Promise<boolean> {
    await new Promise(resolve => setTimeout(resolve, 60));
    
    const initialLength = db.todos.length;
    db.todos = db.todos.filter(todo => todo.id !== id);
    return db.todos.length < initialLength;
  },

  // Reset database (for testing)
  reset(): void {
    db.todos = [];
  },

  // Get database stats
  getStats() {
    return {
      totalTodos: db.todos.length,
      completedTodos: db.todos.filter(t => t.completed).length,
      pendingTodos: db.todos.filter(t => !t.completed).length,
    };
  }
};

// Check if we should use memory database
export function shouldUseMemoryDB(): boolean {
  return !process.env.DATABASE_URL || process.env.USE_MEMORY_DB === 'true';
}