import React, { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskFilters, TaskFiltersState } from './TaskFilters';

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Search: ({ className }: { className?: string }) => (
    <div data-testid="search-icon" className={className}>Search</div>
  ),
  Filter: ({ className }: { className?: string }) => (
    <div data-testid="filter-icon" className={className}>Filter</div>
  ),
  X: ({ className }: { className?: string }) => (
    <div data-testid="x-icon" className={className}>X</div>
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <div data-testid="chevron-down-icon" className={className}>ChevronDown</div>
  ),
  ChevronUp: ({ className }: { className?: string }) => (
    <div data-testid="chevron-up-icon" className={className}>ChevronUp</div>
  ),
}));

// Mock UI components
jest.mock('../../../shared/ui/button', () => ({
  Button: ({ children, onClick, variant, size, className, ...props }: any) => (
    <button
      data-testid="button"
      onClick={onClick}
      className={`variant-${variant} size-${size} ${className}`}
      {...props}
    >
      {children}
    </button>
  ),
}));

jest.mock('../../../shared/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div data-testid="card" className={className} {...props}>
      {children}
    </div>
  ),
  CardContent: ({ children, className, ...props }: any) => (
    <div data-testid="card-content" className={className} {...props}>
      {children}
    </div>
  ),
  CardHeader: ({ children, className, ...props }: any) => (
    <div data-testid="card-header" className={className} {...props}>
      {children}
    </div>
  ),
}));

jest.mock('../../../shared/ui/badge', () => ({
  Badge: ({ children, variant, className, ...props }: any) => (
    <span data-testid="badge" className={`variant-${variant} ${className}`} {...props}>
      {children}
    </span>
  ),
}));

// Test wrapper component to handle state
const TaskFiltersTestWrapper = ({ 
  initialFilters = {
    status: 'all' as const,
    priority: 'all' as const,
    taskType: 'all' as const,
    dateRange: 'all' as const,
    search: '',
    executor: '',
  },
  onFiltersChange,
  isOpen = true,
  onToggle = () => {},
  ...props 
}: { 
  initialFilters?: TaskFiltersState; 
  onFiltersChange?: (filters: TaskFiltersState) => void;
  isOpen?: boolean;
  onToggle?: () => void;
}) => {
  const [filters, setFilters] = useState(initialFilters);

  const handleFiltersChange = (newFilters: TaskFiltersState) => {
    setFilters(newFilters);
    onFiltersChange?.(newFilters);
  };

  return (
    <TaskFilters 
      filters={filters}
      onFiltersChange={handleFiltersChange}
      isOpen={isOpen}
      onToggle={onToggle}
      {...props}
    />
  );
};

describe('TaskFilters', () => {
  const defaultFilters: TaskFiltersState = {
    status: 'all',
    priority: 'all',
    taskType: 'all',
    dateRange: 'all',
    search: '',
    executor: '',
  };

  const mockOnFiltersChange = jest.fn();
  const mockOnToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render filter header when closed', () => {
      render(
        <TaskFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          isOpen={false}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByTestId('card-header')).toBeInTheDocument();
      expect(screen.getByText('Filters & Search')).toBeInTheDocument();
      expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('card-content')).not.toBeInTheDocument();
    });

    it('should render filter content when open', () => {
      render(
        <TaskFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          isOpen={true}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByTestId('card-content')).toBeInTheDocument();
      expect(screen.getByTestId('chevron-up-icon')).toBeInTheDocument();
      expect(screen.getByLabelText('Search Tasks')).toBeInTheDocument();
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
      expect(screen.getByLabelText('Priority')).toBeInTheDocument();
      expect(screen.getByLabelText('Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Date Range')).toBeInTheDocument();
      expect(screen.getByLabelText('Executor')).toBeInTheDocument();
    });

    it('should show active filter badge when filters are applied', () => {
      const activeFilters: TaskFiltersState = {
        ...defaultFilters,
        status: 'pending',
      };

      render(
        <TaskFilters
          filters={activeFilters}
          onFiltersChange={mockOnFiltersChange}
          isOpen={false}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByTestId('badge')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    it('should not show active filter badge when no filters are applied', () => {
      render(
        <TaskFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          isOpen={false}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.queryByTestId('badge')).not.toBeInTheDocument();
      expect(screen.queryByText('Active')).not.toBeInTheDocument();
      expect(screen.queryByText('Clear All')).not.toBeInTheDocument();
    });
  });

  describe('Filter Toggle Functionality', () => {
    it('should call onToggle when filter button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TaskFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          isOpen={false}
          onToggle={mockOnToggle}
        />
      );

      const filterButton = screen.getByRole('button', { name: /filters & search/i });
      await user.click(filterButton);

      expect(mockOnToggle).toHaveBeenCalledTimes(1);
    });

    it('should display correct chevron icon based on open state', () => {
      const { rerender } = render(
        <TaskFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          isOpen={false}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByTestId('chevron-down-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('chevron-up-icon')).not.toBeInTheDocument();

      rerender(
        <TaskFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          isOpen={true}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByTestId('chevron-up-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('chevron-down-icon')).not.toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should update search filter when search input changes', async () => {
      const user = userEvent.setup();

      render(
        <TaskFiltersTestWrapper
          initialFilters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          isOpen={true}
          onToggle={mockOnToggle}
        />
      );

      const searchInput = screen.getByLabelText('Search Tasks');
      await user.type(searchInput, 'test search');

      // Verify the input value is updated correctly
      expect((searchInput as HTMLInputElement).value).toBe('test search');
      
      // Verify onFiltersChange was called (will be called for each character)
      expect(mockOnFiltersChange).toHaveBeenCalled();
      
      // Check that the final call has the complete text
      const calls = mockOnFiltersChange.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.search).toBe('test search');
    });

    it('should display current search value', () => {
      const filtersWithSearch: TaskFiltersState = {
        ...defaultFilters,
        search: 'existing search',
      };

      render(
        <TaskFilters
          filters={filtersWithSearch}
          onFiltersChange={mockOnFiltersChange}
          isOpen={true}
          onToggle={mockOnToggle}
        />
      );

      const searchInput = screen.getByLabelText('Search Tasks') as HTMLInputElement;
      expect(searchInput.value).toBe('existing search');
    });

    it('should have correct placeholder text', () => {
      render(
        <TaskFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          isOpen={true}
          onToggle={mockOnToggle}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search by task content or ID...');
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('Filter Controls', () => {
    beforeEach(() => {
      render(
        <TaskFiltersTestWrapper
          initialFilters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          isOpen={true}
          onToggle={mockOnToggle}
        />
      );
    });

    it('should update status filter when status select changes', async () => {
      const statusSelect = screen.getByLabelText('Status');
      fireEvent.change(statusSelect, { target: { value: 'pending' } });

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith({
          ...defaultFilters,
          status: 'pending',
        });
      });
    });

    it('should update priority filter when priority select changes', async () => {
      const prioritySelect = screen.getByLabelText('Priority');
      fireEvent.change(prioritySelect, { target: { value: 'high' } });

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith({
          ...defaultFilters,
          priority: 'high',
        });
      });
    });

    it('should update task type filter when type select changes', async () => {
      const typeSelect = screen.getByLabelText('Type');
      fireEvent.change(typeSelect, { target: { value: 'story' } });

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith({
          ...defaultFilters,
          taskType: 'story',
        });
      });
    });

    it('should update date range filter when date range select changes', async () => {
      const dateRangeSelect = screen.getByLabelText('Date Range');
      fireEvent.change(dateRangeSelect, { target: { value: 'week' } });

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledWith({
          ...defaultFilters,
          dateRange: 'week',
        });
      });
    });

    it('should update executor filter when executor input changes', async () => {
      const user = userEvent.setup();
      const executorInput = screen.getByLabelText('Executor');
      await user.type(executorInput, 'john.doe');

      // Verify the input value is updated correctly
      expect((executorInput as HTMLInputElement).value).toBe('john.doe');
      
      // Check that the final call has the complete text
      const calls = mockOnFiltersChange.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.executor).toBe('john.doe');
    });
  });

  describe('Select Options', () => {
    beforeEach(() => {
      render(
        <TaskFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          isOpen={true}
          onToggle={mockOnToggle}
        />
      );
    });

    it('should have correct status options', () => {
      const statusSelect = screen.getByLabelText('Status');
      const options = Array.from(statusSelect.querySelectorAll('option'));
      const optionValues = options.map(option => option.getAttribute('value'));

      expect(optionValues).toEqual(['all', 'pending', 'in_progress', 'completed']);
    });

    it('should have correct priority options', () => {
      const prioritySelect = screen.getByLabelText('Priority');
      const options = Array.from(prioritySelect.querySelectorAll('option'));
      const optionValues = options.map(option => option.getAttribute('value'));

      expect(optionValues).toEqual(['all', 'low', 'medium', 'high']);
    });

    it('should have correct task type options', () => {
      const typeSelect = screen.getByLabelText('Type');
      const options = Array.from(typeSelect.querySelectorAll('option'));
      const optionValues = options.map(option => option.getAttribute('value'));

      expect(optionValues).toEqual(['all', 'task', 'story']);
    });

    it('should have correct date range options', () => {
      const dateRangeSelect = screen.getByLabelText('Date Range');
      const options = Array.from(dateRangeSelect.querySelectorAll('option'));
      const optionValues = options.map(option => option.getAttribute('value'));

      expect(optionValues).toEqual(['all', 'today', 'week', 'month']);
    });
  });

  describe('Clear All Filters', () => {
    it('should call onFiltersChange with default values when Clear All is clicked', async () => {
      const user = userEvent.setup();
      const activeFilters: TaskFiltersState = {
        status: 'pending',
        priority: 'high',
        taskType: 'story',
        dateRange: 'week',
        search: 'test',
        executor: 'john',
      };

      render(
        <TaskFilters
          filters={activeFilters}
          onFiltersChange={mockOnFiltersChange}
          isOpen={false}
          onToggle={mockOnToggle}
        />
      );

      const clearAllButton = screen.getByRole('button', { name: /clear all/i });
      await user.click(clearAllButton);

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        status: 'all',
        priority: 'all',
        taskType: 'all',
        dateRange: 'all',
        search: '',
        executor: '',
      });
    });

    it('should not show clear all button when no filters are active', () => {
      render(
        <TaskFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          isOpen={false}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.queryByRole('button', { name: /clear all/i })).not.toBeInTheDocument();
    });
  });

  describe('Active Filter Detection', () => {
    it('should detect active filters for non-default values', () => {
      const testCases: Array<{ filters: TaskFiltersState; shouldBeActive: boolean }> = [
        { filters: { ...defaultFilters, status: 'pending' as const }, shouldBeActive: true },
        { filters: { ...defaultFilters, priority: 'high' as const }, shouldBeActive: true },
        { filters: { ...defaultFilters, taskType: 'story' as const }, shouldBeActive: true },
        { filters: { ...defaultFilters, dateRange: 'week' as const }, shouldBeActive: true },
        { filters: { ...defaultFilters, search: 'test' }, shouldBeActive: true },
        { filters: { ...defaultFilters, executor: 'john' }, shouldBeActive: true },
        { filters: defaultFilters, shouldBeActive: false },
      ];

      testCases.forEach(({ filters, shouldBeActive }) => {
        const { unmount } = render(
          <TaskFilters
            filters={filters}
            onFiltersChange={mockOnFiltersChange}
            isOpen={false}
            onToggle={mockOnToggle}
          />
        );

        if (shouldBeActive) {
          expect(screen.getByText('Active')).toBeInTheDocument();
          expect(screen.getByText('Clear All')).toBeInTheDocument();
        } else {
          expect(screen.queryByText('Active')).not.toBeInTheDocument();
          expect(screen.queryByText('Clear All')).not.toBeInTheDocument();
        }

        unmount();
      });
    });
  });

  describe('Component Integration', () => {
    it('should maintain filter values when toggling open/closed', () => {
      const activeFilters: TaskFiltersState = {
        status: 'pending',
        priority: 'high',
        taskType: 'story',
        dateRange: 'week',
        search: 'test search',
        executor: 'john.doe',
      };

      const { rerender } = render(
        <TaskFilters
          filters={activeFilters}
          onFiltersChange={mockOnFiltersChange}
          isOpen={false}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByText('Active')).toBeInTheDocument();

      rerender(
        <TaskFilters
          filters={activeFilters}
          onFiltersChange={mockOnFiltersChange}
          isOpen={true}
          onToggle={mockOnToggle}
        />
      );

      expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('pending');
      expect((screen.getByLabelText('Priority') as HTMLSelectElement).value).toBe('high');
      expect((screen.getByLabelText('Type') as HTMLSelectElement).value).toBe('story');
      expect((screen.getByLabelText('Date Range') as HTMLSelectElement).value).toBe('week');
      expect((screen.getByLabelText('Search Tasks') as HTMLInputElement).value).toBe('test search');
      expect((screen.getByLabelText('Executor') as HTMLInputElement).value).toBe('john.doe');
    });

    it('should have proper accessibility attributes', () => {
      render(
        <TaskFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          isOpen={true}
          onToggle={mockOnToggle}
        />
      );

      expect(screen.getByLabelText('Search Tasks')).toHaveAttribute('id', 'search-tasks');
      expect(screen.getByLabelText('Status')).toHaveAttribute('id', 'filter-status');
      expect(screen.getByLabelText('Priority')).toHaveAttribute('id', 'filter-priority');
      expect(screen.getByLabelText('Executor')).toHaveAttribute('id', 'filter-executor');
    });

    it('should handle empty or undefined filter values gracefully', () => {
      const emptyFilters: TaskFiltersState = {};

      render(
        <TaskFilters
          filters={emptyFilters}
          onFiltersChange={mockOnFiltersChange}
          isOpen={true}
          onToggle={mockOnToggle}
        />
      );

      expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('all');
      expect((screen.getByLabelText('Priority') as HTMLSelectElement).value).toBe('all');
      expect((screen.getByLabelText('Type') as HTMLSelectElement).value).toBe('all');
      expect((screen.getByLabelText('Date Range') as HTMLSelectElement).value).toBe('all');
      expect((screen.getByLabelText('Search Tasks') as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText('Executor') as HTMLInputElement).value).toBe('');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid filter changes', async () => {
      const user = userEvent.setup();

      render(
        <TaskFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          isOpen={true}
          onToggle={mockOnToggle}
        />
      );

      const statusSelect = screen.getByLabelText('Status');
      const prioritySelect = screen.getByLabelText('Priority');

      // Rapid changes
      fireEvent.change(statusSelect, { target: { value: 'pending' } });
      fireEvent.change(prioritySelect, { target: { value: 'high' } });
      fireEvent.change(statusSelect, { target: { value: 'completed' } });

      await waitFor(() => {
        expect(mockOnFiltersChange).toHaveBeenCalledTimes(3);
      });
    });

    it('should handle special characters in search input', async () => {
      const user = userEvent.setup();

      render(
        <TaskFiltersTestWrapper
          initialFilters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          isOpen={true}
          onToggle={mockOnToggle}
        />
      );

      const searchInput = screen.getByLabelText('Search Tasks');
      await user.type(searchInput, '!@#$%^&*()');

      // Verify the input value is updated correctly
      expect((searchInput as HTMLInputElement).value).toBe('!@#$%^&*()');
      
      // Check that the final call has the complete text
      const calls = mockOnFiltersChange.mock.calls;
      const lastCall = calls[calls.length - 1][0];
      expect(lastCall.search).toBe('!@#$%^&*()');
    });
  });
});