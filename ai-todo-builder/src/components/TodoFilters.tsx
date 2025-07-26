'use client';

export type FilterType = 'all' | 'pending' | 'completed';
export type SortType = 'newest' | 'oldest' | 'alphabetical' | 'completion';

interface TodoFiltersProps {
  filter: FilterType;
  sort: SortType;
  onFilterChange: (filter: FilterType) => void;
  onSortChange: (sort: SortType) => void;
  totalCount: number;
  filteredCount: number;
}

export default function TodoFilters({ 
  filter, 
  sort, 
  onFilterChange, 
  onSortChange, 
  totalCount, 
  filteredCount 
}: TodoFiltersProps) {
  const filterOptions: { value: FilterType; label: string; color: string }[] = [
    { value: 'all', label: 'All', color: 'text-gray-600' },
    { value: 'pending', label: 'Pending', color: 'text-blue-600' },
    { value: 'completed', label: 'Completed', color: 'text-green-600' },
  ];

  const sortOptions: { value: SortType; label: string }[] = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'alphabetical', label: 'Alphabetical' },
    { value: 'completion', label: 'By Status' },
  ];

  if (totalCount === 0) {
    return null;
  }

  return (
    <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Filter buttons */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {filterOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => onFilterChange(option.value)}
                className={`px-3 py-1 text-sm font-medium transition-colors ${
                  filter === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sort dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Sort:</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortType)}
            className="px-3 py-1 text-sm bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="mt-3 text-sm text-gray-500">
        Showing {filteredCount} of {totalCount} todos
        {filter !== 'all' && (
          <span className="ml-1">
            ({filter === 'pending' ? 'pending' : 'completed'})
          </span>
        )}
      </div>
    </div>
  );
}