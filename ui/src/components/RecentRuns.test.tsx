import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RecentRuns } from './RecentRuns';
import { ValidationRun } from '../../shared/types';

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const mockRuns: ValidationRun[] = [
  {
    id: '1',
    timestamp: '2023-01-01T10:00:00Z',
    success: true,
    duration: 120000,
    stages: [
      {
        id: 'lint',
        name: 'Code Linting',
        success: true,
        duration: 30000,
        output: 'All linting checks passed',
        error: '',
        attempt: 1,
      },
      {
        id: 'test',
        name: 'Unit Tests',
        success: true,
        duration: 90000,
        output: 'All tests passed',
        error: '',
        attempt: 1,
      },
    ],
  },
  {
    id: '2',
    timestamp: '2023-01-01T09:00:00Z',
    success: false,
    duration: 150000,
    stages: [
      {
        id: 'lint',
        name: 'Code Linting',
        success: true,
        duration: 30000,
        output: 'Linting passed',
        error: '',
        attempt: 1,
      },
      {
        id: 'test',
        name: 'Unit Tests',
        success: false,
        duration: 120000,
        output: 'Some tests failed',
        error: 'Test error: Cannot read property of undefined',
        attempt: 1,
      },
    ],
  },
];

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('RecentRuns', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders with validation runs', () => {
    renderWithRouter(<RecentRuns runs={mockRuns} />);
    
    expect(screen.getByText('Recent Validation Runs')).toBeInTheDocument();
    expect(screen.getByText('2 stages')).toBeInTheDocument();
    expect(screen.getByText('1 passed • 1 failed')).toBeInTheDocument();
  });

  it('shows empty state when no runs', () => {
    renderWithRouter(<RecentRuns runs={[]} />);
    
    expect(screen.getByText('No validation runs found')).toBeInTheDocument();
  });

  it('expands run details when clicked', async () => {
    renderWithRouter(<RecentRuns runs={mockRuns} />);
    
    const runItem = screen.getAllByTestId('validation-run-item')[0];
    fireEvent.click(runItem);
    
    await waitFor(() => {
      expect(screen.getByText('Stage Details')).toBeInTheDocument();
      expect(screen.getByText('Code Linting')).toBeInTheDocument();
    });
  });

  it('navigates to details page when View Details is clicked', () => {
    renderWithRouter(<RecentRuns runs={mockRuns} />);
    
    const viewDetailsButton = screen.getAllByText('View Details')[0];
    fireEvent.click(viewDetailsButton);
    
    expect(mockNavigate).toHaveBeenCalledWith('/validation-run/1');
  });

  it('prevents event propagation when View Details is clicked', () => {
    renderWithRouter(<RecentRuns runs={mockRuns} />);
    
    const viewDetailsButton = screen.getAllByText('View Details')[0];
    fireEvent.click(viewDetailsButton);
    
    // Should not expand the run details
    expect(screen.queryByText('Stage Details')).not.toBeInTheDocument();
  });

  it('shows stage logs when stage is clicked', async () => {
    renderWithRouter(<RecentRuns runs={mockRuns} />);
    
    // First expand the run
    const runItem = screen.getAllByTestId('validation-run-item')[0];
    fireEvent.click(runItem);
    
    await waitFor(() => {
      expect(screen.getByText('Stage Details')).toBeInTheDocument();
    });

    // Then click on a stage with logs
    const stageDetail = screen.getAllByTestId('stage-detail')[0];
    fireEvent.click(stageDetail);
    
    await waitFor(() => {
      expect(screen.getByTestId('standard-output')).toBeInTheDocument();
      expect(screen.getByText('All linting checks passed')).toBeInTheDocument();
    });
  });

  it('shows error output for failed stages', async () => {
    renderWithRouter(<RecentRuns runs={mockRuns} />);
    
    // Expand the failed run
    const runItems = screen.getAllByTestId('validation-run-item');
    fireEvent.click(runItems[1]);
    
    await waitFor(() => {
      expect(screen.getByText('Stage Details')).toBeInTheDocument();
    });

    // Click on the failed stage
    const stageDetails = screen.getAllByTestId('stage-detail');
    const failedStage = stageDetails.find(stage => 
      stage.textContent?.includes('Unit Tests')
    );
    fireEvent.click(failedStage!);
    
    await waitFor(() => {
      expect(screen.getByTestId('error-output')).toBeInTheDocument();
      expect(screen.getByText('Test error: Cannot read property of undefined')).toBeInTheDocument();
    });
  });

  it('handles pagination controls', () => {
    const manyRuns = Array.from({ length: 12 }, (_, i) => ({
      ...mockRuns[0],
      id: `run-${i}`,
      timestamp: `2023-01-${i + 1}T10:00:00Z`,
    }));

    renderWithRouter(<RecentRuns runs={manyRuns} />);
    
    expect(screen.getByTestId('pagination-controls')).toBeInTheDocument();
    expect(screen.getByText('Showing 1-5 of 12')).toBeInTheDocument();
  });

  it('changes page when pagination button is clicked', () => {
    const manyRuns = Array.from({ length: 12 }, (_, i) => ({
      ...mockRuns[0],
      id: `run-${i}`,
      timestamp: `2023-01-${i + 1}T10:00:00Z`,
    }));

    renderWithRouter(<RecentRuns runs={manyRuns} />);
    
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    
    expect(screen.getByText('Showing 6-10 of 12')).toBeInTheDocument();
  });

  it('changes runs per page when selector is changed', async () => {
    const manyRuns = Array.from({ length: 12 }, (_, i) => ({
      ...mockRuns[0],
      id: `run-${i}`,
      timestamp: `2023-01-${i + 1}T10:00:00Z`,
    }));

    renderWithRouter(<RecentRuns runs={manyRuns} />);
    
    const selector = screen.getByTestId('runs-per-page-select');
    fireEvent.change(selector, { target: { value: '10' } });
    
    await waitFor(() => {
      expect(screen.getByText('Showing 1-10 of 12')).toBeInTheDocument();
    });
  });

  it('resets to first page when runs per page changes', async () => {
    const manyRuns = Array.from({ length: 15 }, (_, i) => ({
      ...mockRuns[0],
      id: `run-${i}`,
      timestamp: `2023-01-${i + 1}T10:00:00Z`,
    }));

    renderWithRouter(<RecentRuns runs={manyRuns} />);
    
    // Go to page 2
    const nextButton = screen.getByText('Next');
    fireEvent.click(nextButton);
    expect(screen.getByText('Showing 6-10 of 15')).toBeInTheDocument();
    
    // Change runs per page
    const selector = screen.getByTestId('runs-per-page-select');
    fireEvent.change(selector, { target: { value: '10' } });
    
    await waitFor(() => {
      expect(screen.getByText('Showing 1-10 of 15')).toBeInTheDocument();
    });
  });

  it('handles ellipsis pagination for many pages', () => {
    const manyRuns = Array.from({ length: 50 }, (_, i) => ({
      ...mockRuns[0],
      id: `run-${i}`,
      timestamp: `2023-01-${i + 1}T10:00:00Z`,
    }));

    renderWithRouter(<RecentRuns runs={manyRuns} />);
    
    // Should show ellipsis
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  it('disables pagination buttons appropriately', () => {
    const manyRuns = Array.from({ length: 12 }, (_, i) => ({
      ...mockRuns[0],
      id: `run-${i}`,
      timestamp: `2023-01-${i + 1}T10:00:00Z`,
    }));

    renderWithRouter(<RecentRuns runs={manyRuns} />);
    
    // Previous should be disabled on first page
    const previousButton = screen.getByText('Previous');
    expect(previousButton).toBeDisabled();
    
    // Go to last page
    const lastButton = screen.getByText('⟩⟩');
    fireEvent.click(lastButton);
    
    // Next should be disabled on last page
    const nextButton = screen.getByText('Next');
    expect(nextButton).toBeDisabled();
  });

  it('toggles chevron icons when stage logs are shown/hidden', async () => {
    renderWithRouter(<RecentRuns runs={mockRuns} />);
    
    // Expand the run
    const runItem = screen.getAllByTestId('validation-run-item')[0];
    fireEvent.click(runItem);
    
    await waitFor(() => {
      expect(screen.getByText('Stage Details')).toBeInTheDocument();
    });

    // Should show chevron-right initially
    expect(screen.getByTestId('chevron-right')).toBeInTheDocument();
    
    // Click to show logs
    const stageDetail = screen.getAllByTestId('stage-detail')[0];
    fireEvent.click(stageDetail);
    
    await waitFor(() => {
      expect(screen.getByTestId('chevron-down')).toBeInTheDocument();
    });
  });

  it('shows file icon when stage has logs', async () => {
    renderWithRouter(<RecentRuns runs={mockRuns} />);
    
    // Expand the run
    const runItem = screen.getAllByTestId('validation-run-item')[0];
    fireEvent.click(runItem);
    
    await waitFor(() => {
      expect(screen.getByTestId('file-icon')).toBeInTheDocument();
    });
  });

  it('handles stage without logs', async () => {
    const runsWithoutLogs: ValidationRun[] = [
      {
        id: '1',
        timestamp: '2023-01-01T10:00:00Z',
        success: true,
        duration: 120000,
        stages: [
          {
            id: 'lint',
            name: 'Code Linting',
            success: true,
            duration: 30000,
            output: '',
            error: '',
        attempt: 1,
          },
        ],
      },
    ];

    renderWithRouter(<RecentRuns runs={runsWithoutLogs} />);
    
    // Expand the run
    const runItem = screen.getByTestId('validation-run-item');
    fireEvent.click(runItem);
    
    await waitFor(() => {
      expect(screen.getByText('Stage Details')).toBeInTheDocument();
    });

    // Stage without logs should not be clickable for logs
    const stageDetail = screen.getByTestId('stage-detail');
    fireEvent.click(stageDetail);
    
    // Should not show logs
    expect(screen.queryByTestId('stage-logs')).not.toBeInTheDocument();
  });

  it('shows duration correctly', () => {
    renderWithRouter(<RecentRuns runs={mockRuns} />);
    
    // Should show duration in seconds
    expect(screen.getByText('120.0s')).toBeInTheDocument();
    expect(screen.getByText('150.0s')).toBeInTheDocument();
  });

  it('uses stage name when available, otherwise uses id', async () => {
    const runsWithMixedStages: ValidationRun[] = [
      {
        id: '1',
        timestamp: '2023-01-01T10:00:00Z',
        success: true,
        duration: 120000,
        stages: [
          {
            id: 'lint',
            name: 'Code Linting',
            success: true,
            duration: 30000,
            output: 'Output',
            error: '',
        attempt: 1,
          },
          {
            id: 'test-stage',
            name: '',
            success: true,
            duration: 30000,
            output: 'Output',
            error: '',
        attempt: 1,
          },
        ],
      },
    ];

    renderWithRouter(<RecentRuns runs={runsWithMixedStages} />);
    
    // Expand the run
    const runItem = screen.getByTestId('validation-run-item');
    fireEvent.click(runItem);
    
    await waitFor(() => {
      expect(screen.getByText('Code Linting')).toBeInTheDocument();
      expect(screen.getByText('test-stage')).toBeInTheDocument();
    });
  });
});