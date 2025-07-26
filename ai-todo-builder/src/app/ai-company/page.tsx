import { AICompanyConsole } from '@/components/AICompanyConsole';
import Link from 'next/link';

export default function AICompanyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-gray-900">AI Todo Builder</h1>
            <nav className="flex space-x-4">
              <Link
                href="/"
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md"
              >
                Todo App
              </Link>
              <Link
                href="/ai-company"
                className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-md"
              >
                AI Company Console
              </Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8">
        <AICompanyConsole />
      </div>
    </div>
  );
}