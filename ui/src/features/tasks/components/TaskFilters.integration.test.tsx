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

// Test component that uses TaskFilters
const TestTaskFiltersComponent: React.FC = () => {
  const [filters, setFilters] = useState<TaskFiltersState>({
    search: '',
    status: 'all',
    priority: 'all',
    taskType: 'all',
    dateRange: 'all',
    executor: '',
  });
  const [isOpen, setIsOpen] = useState(true);

  return (
    <TaskFilters
      filters={filters}
      onFiltersChange={setFilters}
      isOpen={isOpen}
      onToggle={() => setIsOpen(!isOpen)}
    />
  );
};

describe('TaskFilters Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Filter Integration', () => {
    it('should work with real state management', async () => {
      render(<TestTaskFiltersComponent />);

      const searchInput = screen.getByPlaceholderText('Search by task content or ID...');
      await userEvent.type(searchInput, 'test query');
      
      await waitFor(() => {
        expect(searchInput).toHaveValue('test query');
      });
    });

    it('should integrate all filter controls', async () => {
      render(<TestTaskFiltersComponent />);

      // Test search
      const searchInput = screen.getByPlaceholderText('Search by task content or ID...');
      await userEvent.type(searchInput, 'integration test');
      
      // Test status filter
      const statusSelect = screen.getByDisplayValue('All Statuses');
      await userEvent.click(statusSelect);
      const pendingOption = screen.getByText('Pending');
      await userEvent.click(pendingOption);

      await waitFor(() => {
        expect(searchInput).toHaveValue('integration test');
      });
    });
  });
});