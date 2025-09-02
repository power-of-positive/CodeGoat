import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';
import { ValidationRunDetail } from './ValidationRunDetail';
import { analyticsApi, taskApi } from '../../../shared/lib/api';
import { ValidationRun } from '../../../shared/types/index';

// Mock the API
jest.mock('../../../shared/lib/api', () => ({
  analyticsApi: {
    getValidationRuns: jest.fn(),
    getValidationRunById: jest.fn(),
    getValidationRunDetailsFromDB: jest.fn(),
  },
  taskApi: {
    getTasks: jest.fn(),
  },
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ runId: 'test-run-123' }),
  useNavigate: () => mockNavigate,
}));

const mockValidationRun: ValidationRun = {
  id: 'test-run-123',
  timestamp: '2024-01-15T10:30:00.000Z',
  success: true,
  duration: 45000,
  overallStatus: 'passed',
  stages: [
    {
      id: 'lint',
      name: 'Code Linting',
      success: true,
      duration: 5000,
      attempt: 1,
      output: 'All lint checks passed',
      status: 'passed',
    },
    {
      id: 'typecheck',
      name: 'Type Checking',
      success: false,
      duration: 8000,
      attempt: 2,
      output: 'TypeScript compilation completed',
      error: 'Type error in file.ts:15',
      status: 'failed',
    },
  ],
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

const renderWithProviders = (component: React.ReactElement) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{component}</BrowserRouter>
    </QueryClientProvider>
  );
};

describe('ValidationRunDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for taskApi to prevent unexpected calls
    (taskApi.getTasks as jest.Mock).mockResolvedValue([]);
  });

  it('should render loading state initially', () => {
    (analyticsApi.getValidationRunDetailsFromDB as jest.Mock).mockReturnValue(
      new Promise(() => {}) // Never resolves
    );

    renderWithProviders(<ValidationRunDetail />);

    expect(
      screen.getByText('Loading validation run details...')
    ).toBeInTheDocument();
  });

  it('should render error state when API fails', async () => {
    (analyticsApi.getValidationRunDetailsFromDB as jest.Mock).mockRejectedValue(
      new Error('API Error')
    );

    renderWithProviders(<ValidationRunDetail />);

    await waitFor(() => {
      expect(screen.getByText('Failed to Load')).toBeInTheDocument();
      expect(
        screen.getByText('Could not load validation run details')
      ).toBeInTheDocument();
    });
  });

  it('should render not found state when run does not exist', async () => {
    // Mock all APIs to return empty/null so no run is found
    (analyticsApi.getValidationRunDetailsFromDB as jest.Mock).mockResolvedValue(null);
    (analyticsApi.getValidationRuns as jest.Mock).mockResolvedValue([]);
    (taskApi.getTasks as jest.Mock).mockResolvedValue([]);

    renderWithProviders(<ValidationRunDetail />);

    await waitFor(() => {
      expect(screen.getByText('Run Not Found')).toBeInTheDocument();
      expect(
        screen.getByText(
          'The validation run with ID "test-run-123" could not be found.'
        )
      ).toBeInTheDocument();
    });
  });

  it('should render validation run details when data is available', async () => {
    // Set up mocks so it falls back to analytics run (not dbRun)
    (analyticsApi.getValidationRunDetailsFromDB as jest.Mock).mockResolvedValue(null); // Not found in DB, fallback to analytics
    (analyticsApi.getValidationRuns as jest.Mock).mockResolvedValue([
      mockValidationRun,
    ]);

    renderWithProviders(<ValidationRunDetail />);

    await waitFor(() => {
      expect(screen.getByText('Validation Run Details')).toBeInTheDocument();
      expect(screen.getByText(/Run ID: test-run-123/)).toBeInTheDocument();
      expect(screen.getByText('Validation Passed')).toBeInTheDocument();
    });

    // Check summary stats (using more specific selectors)
    expect(screen.getByText('Total Stages')).toBeInTheDocument();
    expect(screen.getByText('Passed')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Duration')).toBeInTheDocument();

    // Check stage details - look for stage names in the rendered DOM
    // The stages should be visible in the StageDetailExpanded components
    await waitFor(() => {
      expect(screen.getByText('Code Linting')).toBeInTheDocument();
      expect(screen.getByText('Type Checking')).toBeInTheDocument();
    });
  });

  it('should show stage logs when Show Logs button is clicked', async () => {
    // Set up mocks so it falls back to analytics run (not dbRun)
    (analyticsApi.getValidationRunDetailsFromDB as jest.Mock).mockResolvedValue(null); // Not found in DB, fallback to analytics
    (analyticsApi.getValidationRuns as jest.Mock).mockResolvedValue([
      mockValidationRun,
    ]);

    renderWithProviders(<ValidationRunDetail />);

    await waitFor(() => {
      expect(screen.getByText('Validation Run Details')).toBeInTheDocument();
    });

    // Wait for the stages to be rendered
    await waitFor(() => {
      expect(screen.getByText('Code Linting')).toBeInTheDocument();
      expect(screen.getByText('Type Checking')).toBeInTheDocument();
    });

    // Find and click the "Show Logs" button for the failed stage (Type Checking)
    const showLogsButtons = screen.getAllByText('Show Logs');
    expect(showLogsButtons.length).toBeGreaterThan(0); // At least one stage should have logs

    // Click on the first "Show Logs" button
    act(() => {
      showLogsButtons[0].click();
    });

    // Wait for logs to expand - check for either button text change or log content
    await waitFor(() => {
      // Check if logs are now visible - look for either Hide Logs button or log content
      const hideLogs = screen.queryByText('Hide Logs');
      const logContent = screen.queryByText('All lint checks passed') || 
                        screen.queryByText('TypeScript compilation completed') ||
                        screen.queryByText('Type error in file.ts:15');
      
      expect(hideLogs || logContent).toBeTruthy();
    });
  });

  it('should navigate back to analytics when back button is clicked', async () => {
    (analyticsApi.getValidationRunDetailsFromDB as jest.Mock).mockResolvedValue(null);
    (analyticsApi.getValidationRuns as jest.Mock).mockResolvedValue([
      mockValidationRun,
    ]);

    renderWithProviders(<ValidationRunDetail />);

    await waitFor(() => {
      expect(screen.getByText('Back to Analytics')).toBeInTheDocument();
    });

    act(() => {
      screen.getByText('Back to Analytics').click();
    });

    expect(mockNavigate).toHaveBeenCalledWith('/analytics');
  });

  it('should handle failed validation run correctly', async () => {
    const failedRun: ValidationRun = {
      ...mockValidationRun,
      success: false,
      stages: mockValidationRun.stages.map((stage) => ({
        ...stage,
        success: false,
      })),
    };

    // Set up mocks so it falls back to analytics run (not dbRun)
    (analyticsApi.getValidationRunDetailsFromDB as jest.Mock).mockResolvedValue(null); // Not found in DB, fallback to analytics
    (analyticsApi.getValidationRuns as jest.Mock).mockResolvedValue([
      failedRun,
    ]);

    renderWithProviders(<ValidationRunDetail />);

    await waitFor(() => {
      expect(screen.getByText('Validation Failed')).toBeInTheDocument();
    });

    // Check that the failed stats are correct using specific labels
    const stageCards = screen.getAllByText('2');
    expect(stageCards.length).toBeGreaterThan(0); // Should find stage count numbers
    expect(screen.getByText('Total Stages')).toBeInTheDocument();
    expect(screen.getByText('Passed')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });
});
