'use client';

import { useState } from 'react';
import { TodoItem } from '@/types';

interface TodoFormProps {
  onAdd: (todo: Omit<TodoItem, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
}

export default function TodoForm({ onAdd }: TodoFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDescription, setShowDescription] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsLoading(true);
    try {
      await onAdd({
        title: title.trim(),
        description: description.trim() || undefined,
        completed: false,
        metadata: {}
      });
      
      // Reset form
      setTitle('');
      setDescription('');
      setShowDescription(false);
    } catch (error) {
      console.error('Error adding todo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-8">
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Add a new todo..."
            className="flex-1 px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
            disabled={isLoading}
            maxLength={255}
          />
          <button
            type="button"
            onClick={() => setShowDescription(!showDescription)}
            className="px-3 py-2 text-gray-500 hover:text-gray-700 focus:outline-none"
            title="Add description"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
          </button>
          <button
            type="submit"
            disabled={isLoading || !title.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Adding...' : 'Add'}
          </button>
        </div>
        
        {showDescription && (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description (optional)..."
            className="w-full px-4 py-2 bg-white text-gray-900 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder-gray-500"
            rows={2}
            disabled={isLoading}
            maxLength={1000}
          />
        )}
      </div>
      
      <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
        <div>
          {title.length > 0 && (
            <span className={title.length > 200 ? 'text-orange-500' : ''}>
              {title.length}/255 characters
            </span>
          )}
        </div>
        {showDescription && description.length > 0 && (
          <span className={description.length > 800 ? 'text-orange-500' : ''}>
            Description: {description.length}/1000 characters
          </span>
        )}
      </div>
    </form>
  );
}