'use client';

import { useState, useEffect } from 'react';
import { TodoItem } from '@/types';
import { todoAPI, handleAPICall } from '@/lib/api-client';

export function useTodos() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTodos = async () => {
    setLoading(true);
    setError(null);
    
    const result = await handleAPICall(
      () => todoAPI.getTodos(),
      'Failed to fetch todos'
    );
    
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setTodos(result.data);
    }
    
    setLoading(false);
  };

  const addTodo = async (todoData: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    const result = await handleAPICall(
      () => todoAPI.createTodo(todoData),
      'Failed to create todo'
    );
    
    if (result.error) {
      setError(result.error);
      throw new Error(result.error);
    } else if (result.data) {
      setTodos(prev => [result.data!, ...prev]);
      setError(null);
      return result.data;
    }
  };

  const updateTodo = async (id: string, updates: Partial<TodoItem>) => {
    const result = await handleAPICall(
      () => todoAPI.updateTodo(id, updates),
      'Failed to update todo'
    );
    
    if (result.error) {
      setError(result.error);
      throw new Error(result.error);
    } else if (result.data) {
      setTodos(prev => prev.map(todo => 
        todo.id === id ? result.data! : todo
      ));
      setError(null);
      return result.data;
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    return updateTodo(id, { completed });
  };

  const deleteTodo = async (id: string) => {
    const result = await handleAPICall(
      () => todoAPI.deleteTodo(id),
      'Failed to delete todo'
    );
    
    if (result.error) {
      setError(result.error);
      throw new Error(result.error);
    } else {
      setTodos(prev => prev.filter(todo => todo.id !== id));
      setError(null);
    }
  };

  const clearError = () => setError(null);

  useEffect(() => {
    fetchTodos();
  }, []);

  return {
    todos,
    loading,
    error,
    addTodo,
    updateTodo,
    toggleTodo,
    deleteTodo,
    refetch: fetchTodos,
    clearError
  };
}