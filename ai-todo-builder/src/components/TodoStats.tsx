'use client';

import { TodoItem } from '@/types';

interface TodoStatsProps {
  todos: TodoItem[];
}

export default function TodoStats({ todos }: TodoStatsProps) {
  const totalTodos = todos.length;
  const completedTodos = todos.filter(todo => todo.completed).length;
  const pendingTodos = totalTodos - completedTodos;
  const completionRate = totalTodos > 0 ? Math.round((completedTodos / totalTodos) * 100) : 0;

  if (totalTodos === 0) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{totalTodos}</div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{completedTodos}</div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{pendingTodos}</div>
          <div className="text-sm text-gray-500">Pending</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{completionRate}%</div>
          <div className="text-sm text-gray-500">Complete</div>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress</span>
          <span>{completedTodos} of {totalTodos} completed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-600 h-2 rounded-full transition-all duration-300 ease-in-out"
            style={{ width: `${completionRate}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}