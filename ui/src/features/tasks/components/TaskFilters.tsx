import React from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent, CardHeader } from '../../../shared/ui/card';
import { Badge } from '../../../shared/ui/badge';
import { Task } from '../../../shared/types/index';

// Types for filtering
export interface TaskFiltersState {
  status?: Task['status'] | 'all';
  priority?: Task['priority'] | 'all';
  taskType?: Task['taskType'] | 'all';
  dateRange?: 'today' | 'week' | 'month' | 'all';
  search?: string;
  executor?: string;
}

interface FilterPanelProps {
  filters: TaskFiltersState;
  onFiltersChange: (filters: TaskFiltersState) => void;
  isOpen: boolean;
  onToggle: () => void;
}

// Filter options
const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const priorityOptions = [
  { value: 'all', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const taskTypeOptions = [
  { value: 'all', label: 'All Types' },
  { value: 'task', label: 'Technical Task' },
  { value: 'story', label: 'User Story' },
];

const dateRangeOptions = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

export function TaskFilters({ filters, onFiltersChange, isOpen, onToggle }: FilterPanelProps) {
  const clearAllFilters = () => {
    onFiltersChange({
      status: 'all',
      priority: 'all',
      taskType: 'all',
      dateRange: 'all',
      search: '',
      executor: '',
    });
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value && value !== 'all' && value !== ''
  );

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggle}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters & Search
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            {hasActiveFilters && (
              <Badge variant="secondary" className="text-xs">
                Active
              </Badge>
            )}
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="space-y-4">
          {/* Search */}
          <div>
            <label htmlFor="search-tasks" className="block text-sm font-medium text-gray-700 mb-2">
              Search Tasks
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                id="search-tasks"
                type="text"
                value={filters.search || ''}
                onChange={(e) =>
                  onFiltersChange({ ...filters, search: e.target.value })
                }
                placeholder="Search by task content or ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          {/* Filter controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label htmlFor="filter-status" className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                id="filter-status"
                value={filters.status || 'all'}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    status: e.target.value as TaskFiltersState['status'],
                  })
                }
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-priority" className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                id="filter-priority"
                value={filters.priority || 'all'}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    priority: e.target.value as TaskFiltersState['priority'],
                  })
                }
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type
              </label>
              <select
                value={filters.taskType || 'all'}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    taskType: e.target.value as TaskFiltersState['taskType'],
                  })
                }
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                {taskTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <select
                value={filters.dateRange || 'all'}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    dateRange: e.target.value as TaskFiltersState['dateRange'],
                  })
                }
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                {dateRangeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-executor" className="block text-sm font-medium text-gray-700 mb-2">
                Executor
              </label>
              <input
                id="filter-executor"
                type="text"
                value={filters.executor || ''}
                onChange={(e) =>
                  onFiltersChange({ ...filters, executor: e.target.value })
                }
                placeholder="Filter by executor..."
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}