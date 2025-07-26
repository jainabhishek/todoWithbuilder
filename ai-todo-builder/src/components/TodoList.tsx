'use client';

import { useState, useEffect, useMemo } from 'react';
import { TodoItem } from '@/types';
import { todoAPI, handleAPICall } from '@/lib/api-client';
import TodoForm from './TodoForm';
import TodoItemComponent from './TodoItem';
import TodoStats from './TodoStats';
import TodoFilters, { FilterType, SortType } from './TodoFilters';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';

export default function TodoList() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('newest');

  useEffect(() => {
    fetchTodos();
  }, []);

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
      setTodos([result.data, ...todos]);
      setError(null);
    }
  };

  const toggleTodo = async (id: string, completed: boolean) => {
    const result = await handleAPICall(
      () => todoAPI.toggleTodo(id, completed),
      'Failed to update todo'
    );
    
    if (result.error) {
      setError(result.error);
      throw new Error(result.error);
    } else if (result.data) {
      setTodos(todos.map(todo => 
        todo.id === id ? result.data! : todo
      ));
      setError(null);
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
      setTodos(todos.map(todo => 
        todo.id === id ? result.data! : todo
      ));
      setError(null);
    }
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
      setTodos(todos.filter(todo => todo.id !== id));
      setError(null);
    }
  };

  // Filter and sort todos
  const filteredAndSortedTodos = useMemo(() => {
    let filtered = todos;
    
    // Apply filter
    switch (filter) {
      case 'pending':
        filtered = todos.filter(todo => !todo.completed);
        break;
      case 'completed':
        filtered = todos.filter(todo => todo.completed);
        break;
      default:
        filtered = todos;
    }
    
    // Apply sort
    switch (sort) {
      case 'oldest':
        filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case 'alphabetical':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'completion':
        filtered.sort((a, b) => {
          if (a.completed === b.completed) return 0;
          return a.completed ? 1 : -1;
        });
        break;
      default: // newest
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    
    return filtered;
  }, [todos, filter, sort]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <LoadingSpinner size="lg" className="min-h-64" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Todo Builder</h1>
        <p className="text-gray-600">
          Manage your tasks with an intelligent todo application
        </p>
      </div>

      {error && (
        <ErrorMessage 
          message={error} 
          onDismiss={() => setError(null)}
          className="mb-6"
        />
      )}

      <TodoForm onAdd={addTodo} />
      
      <TodoStats todos={todos} />
      
      <TodoFilters
        filter={filter}
        sort={sort}
        onFilterChange={setFilter}
        onSortChange={setSort}
        totalCount={todos.length}
        filteredCount={filteredAndSortedTodos.length}
      />

      <div className="space-y-3">
        {filteredAndSortedTodos.length === 0 ? (
          <div className="text-center py-12">
            {todos.length === 0 ? (
              <div>
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h5.586a1 1 0 00.707-.293l5.414-5.414a1 1 0 00.293-.707V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No todos yet</h3>
                <p className="text-gray-500">Get started by adding your first todo above!</p>
              </div>
            ) : (
              <div>
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No todos match your filter</h3>
                <p className="text-gray-500">
                  Try changing your filter to see {filter === 'pending' ? 'completed' : 'pending'} todos.
                </p>
              </div>
            )}
          </div>
        ) : (
          filteredAndSortedTodos.map((todo) => (
            <TodoItemComponent
              key={todo.id}
              todo={todo}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
              onUpdate={updateTodo}
            />
          ))
        )}
      </div>

      <div className="mt-12 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <svg className="h-8 w-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-blue-900 mb-2">AI Builder Coming Soon!</h2>
            <p className="text-blue-700 mb-4">
              The AI Builder feature will allow you to request new functionality for your todo app 
              using natural language. Our AI team will analyze, design, and implement features automatically.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">Priority Levels</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">Due Dates</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">Categories</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">Search</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">And More...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}