import { TodoItem } from '@/types';

// API client for todo operations
export class TodoAPIClient {
  private baseUrl: string;

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl;
  }

  // Get all todos
  async getTodos(): Promise<TodoItem[]> {
    const response = await fetch(`${this.baseUrl}/todos`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch todos');
    }
    
    return response.json();
  }

  // Get a single todo by ID
  async getTodo(id: string): Promise<TodoItem> {
    const response = await fetch(`${this.baseUrl}/todos/${id}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch todo');
    }
    
    return response.json();
  }

  // Create a new todo
  async createTodo(todo: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<TodoItem> {
    const response = await fetch(`${this.baseUrl}/todos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(todo),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create todo');
    }
    
    return response.json();
  }

  // Update an existing todo
  async updateTodo(id: string, updates: Partial<TodoItem>): Promise<TodoItem> {
    const response = await fetch(`${this.baseUrl}/todos/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update todo');
    }
    
    return response.json();
  }

  // Delete a todo
  async deleteTodo(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/todos/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete todo');
    }
  }

  // Toggle todo completion status
  async toggleTodo(id: string, completed: boolean): Promise<TodoItem> {
    return this.updateTodo(id, { completed });
  }
}

// Default instance
export const todoAPI = new TodoAPIClient();

// Error handling utility for API calls
export async function handleAPICall<T>(
  apiCall: () => Promise<T>,
  errorMessage: string = 'API call failed'
): Promise<{ data?: T; error?: string }> {
  try {
    const data = await apiCall();
    return { data };
  } catch (error) {
    console.error(errorMessage, error);
    return { 
      error: error instanceof Error ? error.message : errorMessage 
    };
  }
}