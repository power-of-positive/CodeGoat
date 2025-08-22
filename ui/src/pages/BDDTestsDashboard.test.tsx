import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import BDDTestsDashboard from './BDDTestsDashboard';

// Mock fetch API
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockBDDScenarios = [
  {
    id: 'scenario-1',
    todoTaskId: 'task-1',
    title: 'User creates a new task',
    feature: 'Task Management',
    description: 'Test scenario for task creation',
    gherkinContent: 'Given I am on the Tasks page\nWhen I click Add Task\nThen I should see the form',
    status: 'passed',
    executedAt: '2024-01-01T10:00:00Z',
    executionDuration: 1500,
    errorMessage: null,
    playwrightTestFile: null,
    playwrightTestName: null,
    createdAt: '2024-01-01T09:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
  },
  {
    id: 'scenario-2',
    todoTaskId: 'task-2', 
    title: 'User edits an existing task',
    feature: 'Task Management',
    description: 'Test scenario for task editing',
    gherkinContent: 'Given I have a task\nWhen I edit it\nThen I should see changes',
    status: 'failed',
    executedAt: '2024-01-01T11:00:00Z',
    executionDuration: 2000,
    errorMessage: 'Assertion failed',
    playwrightTestFile: null,
    playwrightTestName: null,
    createdAt: '2024-01-01T09:30:00Z',
    updatedAt: '2024-01-01T11:00:00Z',
  },
];

const mockStats = {
  total: 2,
  passed: 1,
  failed: 1,
  pending: 0,
  skipped: 0,
  passRate: 50,
};

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

describe.skip('BDDTestsDashboard', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should render BDD scenarios dashboard', async () => {
    // Mock API responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockBDDScenarios }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockStats }),
      });

    renderWithProviders(<BDDTestsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('BDD Test Scenarios')).toBeInTheDocument();
    });

    expect(screen.getByText('Total Scenarios')).toBeInTheDocument();
    expect(screen.getByText('Passed')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
  });

  it('should display scenario statistics', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockBDDScenarios }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockStats }),
      });

    renderWithProviders(<BDDTestsDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('total-scenarios-count')).toHaveTextContent('2');
    });

    expect(screen.getByTestId('passed-scenarios-count')).toHaveTextContent('1');
    expect(screen.getByTestId('failed-scenarios-count')).toHaveTextContent('1');
    expect(screen.getByTestId('pending-scenarios-count')).toHaveTextContent('0');
    expect(screen.getByTestId('pass-rate')).toHaveTextContent('50%');
  });

  it('should display BDD scenarios', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockBDDScenarios }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockStats }),
      });

    renderWithProviders(<BDDTestsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('User creates a new task')).toBeInTheDocument();
    });

    expect(screen.getByText('User edits an existing task')).toBeInTheDocument();
    expect(screen.getByText('Task Management')).toBeInTheDocument();
  });

  it('should create comprehensive scenarios', async () => {
    // Initial load
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { total: 0, passed: 0, failed: 0, pending: 0, skipped: 0, passRate: 0 } }),
      })
      // Create scenarios
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Created 25 comprehensive BDD scenarios' }),
      })
      // Refresh after creation
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockBDDScenarios }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockStats }),
      });

    renderWithProviders(<BDDTestsDashboard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create comprehensive scenarios/i })).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /create comprehensive scenarios/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/bdd-scenarios/comprehensive', {
        method: 'POST',
      });
    });
  });

  it('should execute all scenarios', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockBDDScenarios }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockStats }),
      })
      // Execute all
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Executed 2 scenarios' }),
      })
      // Refresh after execution
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockBDDScenarios }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockStats }),
      });

    renderWithProviders(<BDDTestsDashboard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /execute all scenarios/i })).toBeInTheDocument();
    });

    const executeButton = screen.getByRole('button', { name: /execute all scenarios/i });
    fireEvent.click(executeButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/bdd-scenarios/execute-all', {
        method: 'POST',
      });
    });
  });

  it('should filter scenarios by search term', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockBDDScenarios }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockStats }),
      });

    renderWithProviders(<BDDTestsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('User creates a new task')).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId('search-scenarios');
    fireEvent.change(searchInput, { target: { value: 'creates' } });

    await waitFor(() => {
      expect(screen.getByText('User creates a new task')).toBeInTheDocument();
      expect(screen.queryByText('User edits an existing task')).not.toBeInTheDocument();
    });
  });

  it('should filter scenarios by status', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockBDDScenarios }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockStats }),
      });

    renderWithProviders(<BDDTestsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('User creates a new task')).toBeInTheDocument();
    });

    const statusFilter = screen.getByTestId('status-filter');
    fireEvent.change(statusFilter, { target: { value: 'passed' } });

    await waitFor(() => {
      expect(screen.getByText('User creates a new task')).toBeInTheDocument();
      expect(screen.queryByText('User edits an existing task')).not.toBeInTheDocument();
    });
  });

  it('should display empty state when no scenarios exist', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: { total: 0, passed: 0, failed: 0, pending: 0, skipped: 0, passRate: 0 } }),
      });

    renderWithProviders(<BDDTestsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No BDD Scenarios Found')).toBeInTheDocument();
    }, { timeout: 10000 });

    expect(screen.getByText('Create comprehensive BDD scenarios to get started with behavioral testing.')).toBeInTheDocument();
  });

  it('should handle API errors gracefully', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Failed to fetch scenarios'))
      .mockRejectedValueOnce(new Error('Failed to fetch stats'));

    renderWithProviders(<BDDTestsDashboard />);

    // Component should show error state
    await waitFor(() => {
      expect(screen.getByText('Error Loading BDD Scenarios')).toBeInTheDocument();
    }, { timeout: 10000 });
  });
});