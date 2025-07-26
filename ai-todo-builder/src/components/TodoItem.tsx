'use client';

import { useState } from 'react';
import { TodoItem as TodoItemType } from '@/types';

interface TodoItemProps {
  todo: TodoItemType;
  onToggle: (id: string, completed: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<TodoItemType>) => Promise<void>;
}

export default function TodoItem({ todo, onToggle, onDelete, onUpdate }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(todo.title);
  const [editDescription, setEditDescription] = useState(todo.description || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleEdit = async () => {
    if (!editTitle.trim()) return;
    
    setIsLoading(true);
    try {
      await onUpdate(todo.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating todo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditTitle(todo.title);
    setEditDescription(todo.description || '');
    setIsEditing(false);
  };

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      await onToggle(todo.id, !todo.completed);
    } catch (error) {
      console.error('Error toggling todo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this todo?')) {
      setIsLoading(true);
      try {
        await onDelete(todo.id);
      } catch (error) {
        console.error('Error deleting todo:', error);
        setIsLoading(false);
      }
    }
  };

  if (isEditing) {
    return (
      <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="space-y-3">
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
            placeholder="Todo title..."
            disabled={isLoading}
          />
          <textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder-gray-500"
            placeholder="Description (optional)..."
            rows={2}
            disabled={isLoading}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleCancel}
              disabled={isLoading}
              className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 focus:outline-none disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleEdit}
              disabled={isLoading || !editTitle.trim()}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow ${isLoading ? 'opacity-50' : ''}`}>
      <input
        type="checkbox"
        checked={todo.completed}
        onChange={handleToggle}
        disabled={isLoading}
        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
      />
      
      <div className="flex-1 min-w-0">
        <h3 className={`font-medium truncate ${
          todo.completed 
            ? 'text-gray-500 line-through' 
            : 'text-gray-900'
        }`}>
          {todo.title}
        </h3>
        {todo.description && (
          <p className={`text-sm mt-1 ${
            todo.completed 
              ? 'text-gray-400 line-through' 
              : 'text-gray-600'
          }`}>
            {todo.description}
          </p>
        )}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
          <span>Created: {new Date(todo.createdAt).toLocaleDateString()}</span>
          {todo.updatedAt !== todo.createdAt && (
            <span>Updated: {new Date(todo.updatedAt).toLocaleDateString()}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsEditing(true)}
          disabled={isLoading}
          className="text-gray-400 hover:text-blue-600 focus:outline-none disabled:opacity-50"
          title="Edit todo"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        
        <button
          onClick={handleDelete}
          disabled={isLoading}
          className="text-gray-400 hover:text-red-600 focus:outline-none disabled:opacity-50"
          title="Delete todo"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}