import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { BDDScenariosDashboard } from './BDDScenariosDashboard';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock child components
jest.mock('./BDDScenarioCard', () => ({ ScenarioCard: ({ scenario, onExecute }: any) => (
  <div data-testid="scenario-card">
    <span data-testid="scenario-title">{scenario.title}</span>
    <span data-testid="scenario-status">{scenario.status}</span>
    <button onClick={() => onExecute(scenario.id)} data-testid="execute-scenario">Execute</button>
  </div>
)}));

jest.mock('./BDDStatsCard', () => ({ StatsCard: ({ title, count, testId }: any) => (
  <div data-testid={testId}><span>{title}: {count}</span></div>
)}));

// Test data
const mockScenarios = [
  { id: '1', todoTaskId: 'task-1', title: 'User Login Scenario', feature: 'Authentication', 
    description: 'Test user login flow', gherkinContent: 'Given user is on login page...', 
    status: 'pending' as const, createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
  { id: '2', todoTaskId: 'task-2', title: 'Password Reset', feature: 'Authentication',
    description: 'Test password reset', gherkinContent: 'Given user forgot password...',
    status: 'passed' as const, executedAt: '2024-01-02T00:00:00Z', executionDuration: 1500,
    createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-02T00:00:00Z' },
  { id: '3', todoTaskId: 'task-3', title: 'Failed Scenario', feature: 'Orders',
    description: 'Test order creation', gherkinContent: 'Given user has items in cart...',
    status: 'failed' as const, errorMessage: 'Test failed due to network error',
    createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' }
];

const mockStats = { total: 3, passed: 1, failed: 1, pending: 1, skipped: 0, passRate: 33.3 };

// Test utilities
const createTestQueryClient = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });
const renderWithQueryClient = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>);
};

const mockSuccessResponse = (data: any) => ({ ok: true, json: () => Promise.resolve({ data }) });

describe('BDDScenariosDashboard', () => {
  beforeEach(() => mockFetch.mockClear());

  describe('Basic Functionality', () => {
    it('renders loading state', () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves
      renderWithQueryClient(<BDDScenariosDashboard />);
      expect(screen.getByText('Loading BDD scenarios...')).toBeInTheDocument();
    });

    it('shows error state on network failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      renderWithQueryClient(<BDDScenariosDashboard />);
      await waitFor(() => {
        expect(screen.getByText('Error Loading BDD Scenarios')).toBeInTheDocument();
        expect(screen.getByText('Failed to load BDD scenarios. Please try again later.')).toBeInTheDocument();
      });
    });

    it('renders scenarios when data loads successfully', async () => {
      mockFetch
        .mockResolvedValueOnce(mockSuccessResponse(mockScenarios))
        .mockResolvedValueOnce(mockSuccessResponse(mockStats));

      renderWithQueryClient(<BDDScenariosDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('BDD Test Scenarios')).toBeInTheDocument();
        expect(screen.getAllByTestId('scenario-card')).toHaveLength(3);
      });
    });

    it('handles empty scenarios array', async () => {
      mockFetch
        .mockResolvedValueOnce(mockSuccessResponse([]))
        .mockResolvedValueOnce(mockSuccessResponse({ ...mockStats, total: 0 }));

      renderWithQueryClient(<BDDScenariosDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('No BDD Scenarios Found')).toBeInTheDocument();
      });
    });

    it('filters scenarios by search term', async () => {
      mockFetch
        .mockResolvedValueOnce(mockSuccessResponse(mockScenarios))
        .mockResolvedValueOnce(mockSuccessResponse(mockStats));

      renderWithQueryClient(<BDDScenariosDashboard />);
      
      await waitFor(() => {
        expect(screen.getAllByTestId('scenario-card')).toHaveLength(3);
      });

      const searchInput = screen.getByTestId('search-scenarios');
      fireEvent.change(searchInput, { target: { value: 'Login' } });

      await waitFor(() => {
        expect(screen.getAllByTestId('scenario-card')).toHaveLength(1);
        expect(screen.getByText('User Login Scenario')).toBeInTheDocument();
      });
    });

    it('filters scenarios by status', async () => {
      mockFetch
        .mockResolvedValueOnce(mockSuccessResponse(mockScenarios))
        .mockResolvedValueOnce(mockSuccessResponse(mockStats));

      renderWithQueryClient(<BDDScenariosDashboard />);
      
      await waitFor(() => {
        expect(screen.getAllByTestId('scenario-card')).toHaveLength(3);
      });

      const statusFilter = screen.getByTestId('status-filter');
      fireEvent.change(statusFilter, { target: { value: 'pending' } });

      await waitFor(() => {
        expect(screen.getAllByTestId('scenario-card')).toHaveLength(1);
        expect(screen.getByText('User Login Scenario')).toBeInTheDocument();
      });
    });

    it('handles button actions', async () => {
      mockFetch
        .mockResolvedValueOnce(mockSuccessResponse(mockScenarios))
        .mockResolvedValueOnce(mockSuccessResponse(mockStats));

      renderWithQueryClient(<BDDScenariosDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('Create Comprehensive Scenarios')).toBeInTheDocument();
        expect(screen.getByText('Execute All Scenarios')).toBeInTheDocument();
      });

      // Test create scenarios API call - mock the response first
      mockFetch.mockResolvedValueOnce(mockSuccessResponse({ success: true }));
      fireEvent.click(screen.getByText('Create Comprehensive Scenarios'));
      
      // Wait for the API call to be made and check it was called correctly
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/bdd-scenarios/comprehensive', { method: 'POST' });
      });
    });
  });
});