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

// Clear all filters utility
function createClearAllFilters(onFiltersChange: (filters: TaskFiltersState) => void) {
  return () => {
    onFiltersChange({
      status: 'all',
      priority: 'all',
      taskType: 'all',
      dateRange: 'all',
      search: '',
      executor: '',
    });
  };
}

// Check if any filters are active
function hasActiveFilters(filters: TaskFiltersState): boolean {
  return Object.values(filters).some(
    (value) => value && value !== 'all' && value !== ''
  );
}

// Filter header component
function FilterHeader({ isOpen, onToggle, hasActiveFilters, onClearAll }: {
  isOpen: boolean;
  onToggle: () => void;
  hasActiveFilters: boolean;
  onClearAll: () => void;
}) {
  return (
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
          <Button variant="ghost" size="sm" onClick={onClearAll}>
            <X className="h-4 w-4 mr-1" />
            Clear All
          </Button>
        )}
      </div>
    </CardHeader>
  );
}

// Search input component
function SearchInput({ filters, onFiltersChange }: {
  filters: TaskFiltersState;
  onFiltersChange: (filters: TaskFiltersState) => void;
}) {
  return (
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
  );
}

// Select filter component
function SelectFilter({ label, value, options, onChange, id }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  id?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded-md text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Text filter component
function TextFilter({ label, value, onChange, placeholder, id }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  id?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-2 border border-gray-300 rounded-md text-sm"
      />
    </div>
  );
}

// Filter controls component
function FilterControls({ filters, onFiltersChange }: {
  filters: TaskFiltersState;
  onFiltersChange: (filters: TaskFiltersState) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <SelectFilter
        label="Status"
        id="filter-status"
        value={filters.status || 'all'}
        options={statusOptions}
        onChange={(value) => onFiltersChange({ ...filters, status: value as TaskFiltersState['status'] })}
      />
      <SelectFilter
        label="Priority"
        id="filter-priority"
        value={filters.priority || 'all'}
        options={priorityOptions}
        onChange={(value) => onFiltersChange({ ...filters, priority: value as TaskFiltersState['priority'] })}
      />
      <SelectFilter
        label="Type"
        id="filter-type"
        value={filters.taskType || 'all'}
        options={taskTypeOptions}
        onChange={(value) => onFiltersChange({ ...filters, taskType: value as TaskFiltersState['taskType'] })}
      />
      <SelectFilter
        label="Date Range"
        id="filter-date-range"
        value={filters.dateRange || 'all'}
        options={dateRangeOptions}
        onChange={(value) => onFiltersChange({ ...filters, dateRange: value as TaskFiltersState['dateRange'] })}
      />
      <TextFilter
        label="Executor"
        id="filter-executor"
        value={filters.executor || ''}
        onChange={(value) => onFiltersChange({ ...filters, executor: value })}
        placeholder="Filter by executor..."
      />
    </div>
  );
}

export function TaskFilters({ filters, onFiltersChange, isOpen, onToggle }: FilterPanelProps) {
  const clearAllFilters = createClearAllFilters(onFiltersChange);
  const hasActiveFiltersState = hasActiveFilters(filters);

  return (
    <Card className="mb-6">
      <FilterHeader 
        isOpen={isOpen} 
        onToggle={onToggle} 
        hasActiveFilters={hasActiveFiltersState} 
        onClearAll={clearAllFilters}
      />
      {isOpen && (
        <CardContent className="space-y-4">
          <SearchInput filters={filters} onFiltersChange={onFiltersChange} />
          <FilterControls filters={filters} onFiltersChange={onFiltersChange} />
        </CardContent>
      )}
    </Card>
  );
}