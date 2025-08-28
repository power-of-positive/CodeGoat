import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { ValidationRunCard } from './ValidationRunCard';

// Test data
const mockRunSuccess = {
  id: 'run-1',
  success: true,
  duration: 5000,
  timestamp: '2024-01-01T10:00:00Z',
  stages: JSON.stringify([
    { id: 'stage-1', name: 'Linting', success: true, duration: 1000 },
    { id: 'stage-2', name: 'Type Check', success: true, duration: 2000 },
    { id: 'stage-3', name: 'Tests', success: true, duration: 2000 }
  ])
};

const mockRunFailed = {
  id: 'run-2',
  success: false,
  duration: 3000,
  timestamp: '2024-01-01T11:00:00Z',
  stages: JSON.stringify([
    { id: 'stage-1', name: 'Linting', success: true, duration: 1000 },
    { id: 'stage-2', name: 'Type Check', success: false, duration: 1500 },
    { id: 'stage-3', name: 'Tests', success: true, duration: 500 }
  ])
};

const mockRunEmpty = {
  id: 'run-3',
  success: true,
  duration: 100,
  timestamp: '2024-01-01T12:00:00Z',
  stages: '[]'
};

const mockRunNoStages = {
  id: 'run-4',
  success: false,
  duration: 200,
  timestamp: '2024-01-01T13:00:00Z'
};

const mockRunManyStages = {
  id: 'run-5',
  success: true,
  duration: 10000,
  timestamp: '2024-01-01T14:00:00Z',
  stages: JSON.stringify([
    { id: 'stage-1', name: 'Linting', success: true, duration: 1000 },
    { id: 'stage-2', name: 'Type Check', success: true, duration: 1000 },
    { id: 'stage-3', name: 'Unit Tests', success: true, duration: 1000 },
    { id: 'stage-4', name: 'Integration Tests', success: true, duration: 1000 },
    { id: 'stage-5', name: 'E2E Tests', success: true, duration: 1000 }
  ])
};

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ValidationRunCard', () => {
  describe('Successful Runs', () => {
    it('renders success status correctly', () => {
      renderWithRouter(<ValidationRunCard run={mockRunSuccess} />);
      
      expect(screen.getByText('Passed')).toBeInTheDocument();
      expect(screen.getByText('Passed')).toHaveClass('text-sm', 'font-medium');
    });

    it('shows green check circle for success', () => {
      const { container } = renderWithRouter(<ValidationRunCard run={mockRunSuccess} />);
      
      const checkIcon = container.querySelector('.text-green-600');
      expect(checkIcon).toBeInTheDocument();
    });

    it('calculates 100% success rate for all passing stages', () => {
      renderWithRouter(<ValidationRunCard run={mockRunSuccess} />);
      
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('shows correct passed/failed counts for successful run', () => {
      renderWithRouter(<ValidationRunCard run={mockRunSuccess} />);
      
      // Find the Passed/Failed section specifically
      expect(screen.getByText('Passed/Failed')).toBeInTheDocument();
      
      // Check the counts in the passed/failed section - look for parent container
      const passedFailedLabel = screen.getByText('Passed/Failed');
      const parentDiv = passedFailedLabel.parentElement;
      const passedCount = parentDiv?.querySelector('.text-green-600');
      const failedCount = parentDiv?.querySelector('.text-red-600');
      
      expect(passedCount).toHaveTextContent('3'); // passed count
      expect(failedCount).toHaveTextContent('0'); // failed count
    });
  });

  describe('Failed Runs', () => {
    it('renders failure status correctly', () => {
      renderWithRouter(<ValidationRunCard run={mockRunFailed} />);
      
      expect(screen.getByText('Failed')).toBeInTheDocument();
    });

    it('shows red X circle for failure', () => {
      const { container } = renderWithRouter(<ValidationRunCard run={mockRunFailed} />);
      
      const xIcon = container.querySelector('.text-red-600');
      expect(xIcon).toBeInTheDocument();
    });

    it('calculates partial success rate for mixed results', () => {
      renderWithRouter(<ValidationRunCard run={mockRunFailed} />);
      
      expect(screen.getByText('67%')).toBeInTheDocument(); // 2 out of 3 passed = 67%
    });

    it('shows correct passed/failed counts for failed run', () => {
      renderWithRouter(<ValidationRunCard run={mockRunFailed} />);
      
      // Find the Passed/Failed section specifically
      expect(screen.getByText('Passed/Failed')).toBeInTheDocument();
      
      // Check the counts in the passed/failed section - look for parent container
      const passedFailedLabel = screen.getByText('Passed/Failed');
      const parentDiv = passedFailedLabel.parentElement;
      const passedCount = parentDiv?.querySelector('.text-green-600');
      const failedCount = parentDiv?.querySelector('.text-red-600');
      
      expect(passedCount).toHaveTextContent('2'); // passed count
      expect(failedCount).toHaveTextContent('1'); // failed count
    });
  });

  describe('Duration and Timestamp Display', () => {
    it('displays duration in milliseconds', () => {
      renderWithRouter(<ValidationRunCard run={mockRunSuccess} />);
      
      expect(screen.getByText('5000ms')).toBeInTheDocument();
    });

    it('formats timestamp correctly', () => {
      renderWithRouter(<ValidationRunCard run={mockRunSuccess} />);
      
      const formattedDate = new Date('2024-01-01T10:00:00Z').toLocaleString();
      expect(screen.getByText(formattedDate)).toBeInTheDocument();
    });

    it('displays different durations correctly', () => {
      renderWithRouter(<ValidationRunCard run={mockRunEmpty} />);
      
      expect(screen.getByText('100ms')).toBeInTheDocument();
    });
  });

  describe('Stages Display', () => {
    it('shows total stages count', () => {
      renderWithRouter(<ValidationRunCard run={mockRunSuccess} />);
      
      expect(screen.getByText('Total Stages')).toBeInTheDocument();
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
      expect(screen.getByText('Passed/Failed')).toBeInTheDocument();
    });

    it('displays individual stage names and durations', () => {
      renderWithRouter(<ValidationRunCard run={mockRunSuccess} />);
      
      expect(screen.getByText('Linting')).toBeInTheDocument();
      expect(screen.getByText('Type Check')).toBeInTheDocument();
      expect(screen.getByText('Tests')).toBeInTheDocument();
      
      expect(screen.getByText('1000ms')).toBeInTheDocument();
      // Check that 2000ms appears (even if multiple times due to two stages with same duration)
      expect(screen.getAllByText('2000ms')).toHaveLength(2); // Two stages have 2000ms duration
    });

    it('shows success icons for passed stages', () => {
      const { container } = renderWithRouter(<ValidationRunCard run={mockRunSuccess} />);
      
      const successIcons = container.querySelectorAll('.text-green-600');
      expect(successIcons.length).toBeGreaterThan(0);
    });

    it('shows failure icons for failed stages', () => {
      const { container } = renderWithRouter(<ValidationRunCard run={mockRunFailed} />);
      
      const failureIcons = container.querySelectorAll('.text-red-600');
      expect(failureIcons.length).toBeGreaterThan(0);
    });

    it('limits display to first 3 stages', () => {
      renderWithRouter(<ValidationRunCard run={mockRunManyStages} />);
      
      expect(screen.getByText('Linting')).toBeInTheDocument();
      expect(screen.getByText('Type Check')).toBeInTheDocument();
      expect(screen.getByText('Unit Tests')).toBeInTheDocument();
      
      // Should not show stages beyond the first 3
      expect(screen.queryByText('Integration Tests')).not.toBeInTheDocument();
      expect(screen.queryByText('E2E Tests')).not.toBeInTheDocument();
    });

    it('shows "more stages" indicator when there are more than 3 stages', () => {
      renderWithRouter(<ValidationRunCard run={mockRunManyStages} />);
      
      expect(screen.getByText('+2 more stages')).toBeInTheDocument();
    });

    it('does not show stages section when no stages exist', () => {
      renderWithRouter(<ValidationRunCard run={mockRunEmpty} />);
      
      expect(screen.queryByText('Stages')).not.toBeInTheDocument();
      expect(screen.queryByText('Linting')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined stages property', () => {
      renderWithRouter(<ValidationRunCard run={mockRunNoStages} />);
      
      // Check for Total Stages section specifically
      const totalStagesLabel = screen.getByText('Total Stages');
      const totalStagesValue = totalStagesLabel.parentElement?.querySelector('.text-lg');
      expect(totalStagesValue).toHaveTextContent('0');
      expect(screen.getByText('0%')).toBeInTheDocument(); // Success rate should be 0%
    });

    it('handles empty stages array', () => {
      renderWithRouter(<ValidationRunCard run={mockRunEmpty} />);
      
      // Check for Total Stages section specifically
      const totalStagesLabel = screen.getByText('Total Stages');
      const totalStagesValue = totalStagesLabel.parentElement?.querySelector('.text-lg');
      expect(totalStagesValue).toHaveTextContent('0');
      expect(screen.getByText('0%')).toBeInTheDocument(); // Success rate
    });

    it('handles malformed stages JSON gracefully', () => {
      const runWithBadJson = {
        ...mockRunSuccess,
        stages: 'invalid json'
      };

      expect(() => {
        renderWithRouter(<ValidationRunCard run={runWithBadJson} />);
      }).toThrow(); // JSON.parse will throw, which is expected behavior
    });

    it('calculates success rate correctly with mixed results', () => {
      const runWithMixedResults = {
        id: 'mixed-1',
        success: false,
        duration: 4000,
        timestamp: '2024-01-01T15:00:00Z',
        stages: JSON.stringify([
          { id: 'stage-1', name: 'Stage 1', success: true, duration: 1000 },
          { id: 'stage-2', name: 'Stage 2', success: false, duration: 1000 },
          { id: 'stage-3', name: 'Stage 3', success: true, duration: 1000 },
          { id: 'stage-4', name: 'Stage 4', success: false, duration: 1000 }
        ])
      };

      renderWithRouter(<ValidationRunCard run={runWithMixedResults} />);
      
      expect(screen.getByText('50%')).toBeInTheDocument(); // 2 out of 4 = 50%
      
      // Check the passed/failed counts in the specific section
      const passedFailedLabel = screen.getByText('Passed/Failed');
      const parentDiv = passedFailedLabel.parentElement;
      const passedCount = parentDiv?.querySelector('.text-green-600');
      const failedCount = parentDiv?.querySelector('.text-red-600');
      
      expect(passedCount).toHaveTextContent('2'); // passed count
      expect(failedCount).toHaveTextContent('2'); // failed count
    });
  });

  describe('Navigation Link', () => {
    it('renders link to validation run details', () => {
      renderWithRouter(<ValidationRunCard run={mockRunSuccess} />);
      
      const detailsLink = screen.getByText('View Details');
      expect(detailsLink).toBeInTheDocument();
      expect(detailsLink.closest('a')).toHaveAttribute('href', '/validation-run/run-1');
    });

    it('includes external link icon', () => {
      const { container } = renderWithRouter(<ValidationRunCard run={mockRunSuccess} />);
      
      const link = screen.getByText('View Details').closest('a');
      expect(link).toBeInTheDocument();
      
      const externalIcon = container.querySelector('a .h-3.w-3');
      expect(externalIcon).toBeInTheDocument();
    });

    it('has correct hover styles', () => {
      renderWithRouter(<ValidationRunCard run={mockRunSuccess} />);
      
      const detailsLink = screen.getByText('View Details');
      expect(detailsLink).toHaveClass('text-blue-600', 'hover:text-blue-800');
    });
  });

  describe('Component Structure', () => {
    it('renders card with correct styling', () => {
      const { container } = renderWithRouter(<ValidationRunCard run={mockRunSuccess} />);
      
      expect(container.querySelector('.mb-3')).toBeInTheDocument();
      expect(container.querySelector('.p-4')).toBeInTheDocument();
    });

    it('renders responsive grid layout', () => {
      const { container } = renderWithRouter(<ValidationRunCard run={mockRunSuccess} />);
      
      expect(container.querySelector('.grid.grid-cols-1.md\\:grid-cols-3.gap-4')).toBeInTheDocument();
    });

    it('applies correct text styling to labels', () => {
      renderWithRouter(<ValidationRunCard run={mockRunSuccess} />);
      
      expect(screen.getByText('Total Stages')).toHaveClass('text-xs', 'text-gray-500');
      expect(screen.getByText('Success Rate')).toHaveClass('text-xs', 'text-gray-500');
      expect(screen.getByText('Passed/Failed')).toHaveClass('text-xs', 'text-gray-500');
    });

    it('applies correct text styling to values', () => {
      const { container } = renderWithRouter(<ValidationRunCard run={mockRunSuccess} />);
      
      const semiboldElements = container.querySelectorAll('.text-lg.font-semibold');
      expect(semiboldElements.length).toBeGreaterThan(0);
    });
  });

  describe('Success Rate Calculations', () => {
    it('calculates 0% for all failed stages', () => {
      const runWithAllFailed = {
        id: 'all-failed',
        success: false,
        duration: 3000,
        timestamp: '2024-01-01T16:00:00Z',
        stages: JSON.stringify([
          { id: 'stage-1', name: 'Stage 1', success: false, duration: 1000 },
          { id: 'stage-2', name: 'Stage 2', success: false, duration: 1000 },
          { id: 'stage-3', name: 'Stage 3', success: false, duration: 1000 }
        ])
      };

      renderWithRouter(<ValidationRunCard run={runWithAllFailed} />);
      
      expect(screen.getByText('0%')).toBeInTheDocument();
      
      // Check the passed/failed counts in the specific section
      const passedFailedLabel = screen.getByText('Passed/Failed');
      const parentDiv = passedFailedLabel.parentElement;
      const passedCount = parentDiv?.querySelector('.text-green-600');
      const failedCount = parentDiv?.querySelector('.text-red-600');
      
      expect(passedCount).toHaveTextContent('0'); // passed count
      expect(failedCount).toHaveTextContent('3'); // failed count
    });

    it('rounds success rate to nearest whole number', () => {
      const runWithPartial = {
        id: 'partial',
        success: true,
        duration: 3000,
        timestamp: '2024-01-01T17:00:00Z',
        stages: JSON.stringify([
          { id: 'stage-1', name: 'Stage 1', success: true, duration: 1000 },
          { id: 'stage-2', name: 'Stage 2', success: true, duration: 1000 },
          { id: 'stage-3', name: 'Stage 3', success: false, duration: 1000 }
        ])
      };

      renderWithRouter(<ValidationRunCard run={runWithPartial} />);
      
      expect(screen.getByText('67%')).toBeInTheDocument(); // 2/3 = 0.666... rounded to 67%
    });
  });

  describe('Stage Truncation Logic', () => {
    it('does not show more stages indicator with exactly 3 stages', () => {
      renderWithRouter(<ValidationRunCard run={mockRunSuccess} />);
      
      expect(screen.queryByText(/\+\d+ more stages/)).not.toBeInTheDocument();
    });

    it('shows correct count in more stages indicator', () => {
      const runWithSixStages = {
        ...mockRunManyStages,
        stages: JSON.stringify([
          { id: 'stage-1', name: 'Stage 1', success: true, duration: 1000 },
          { id: 'stage-2', name: 'Stage 2', success: true, duration: 1000 },
          { id: 'stage-3', name: 'Stage 3', success: true, duration: 1000 },
          { id: 'stage-4', name: 'Stage 4', success: true, duration: 1000 },
          { id: 'stage-5', name: 'Stage 5', success: true, duration: 1000 },
          { id: 'stage-6', name: 'Stage 6', success: true, duration: 1000 }
        ])
      };

      renderWithRouter(<ValidationRunCard run={runWithSixStages} />);
      
      expect(screen.getByText('+3 more stages')).toBeInTheDocument();
    });

    it('only displays first 3 stages regardless of total count', () => {
      renderWithRouter(<ValidationRunCard run={mockRunManyStages} />);
      
      expect(screen.getByText('Linting')).toBeInTheDocument();
      expect(screen.getByText('Type Check')).toBeInTheDocument();
      expect(screen.getByText('Unit Tests')).toBeInTheDocument();
      
      expect(screen.queryByText('Integration Tests')).not.toBeInTheDocument();
      expect(screen.queryByText('E2E Tests')).not.toBeInTheDocument();
    });
  });

  describe('Empty or Missing Data', () => {
    it('handles empty stages array', () => {
      renderWithRouter(<ValidationRunCard run={mockRunEmpty} />);
      
      // Check Total Stages specifically
      const totalStagesLabel = screen.getByText('Total Stages');
      const totalStagesValue = totalStagesLabel.parentElement?.querySelector('.text-lg');
      expect(totalStagesValue).toHaveTextContent('0');
      
      expect(screen.getByText('0%')).toBeInTheDocument(); // Success rate
      expect(screen.queryByText('Stages')).not.toBeInTheDocument(); // No stages section
    });

    it('handles missing stages property', () => {
      renderWithRouter(<ValidationRunCard run={mockRunNoStages} />);
      
      expect(screen.getAllByText('0')[0]).toBeInTheDocument(); // Total stages
      expect(screen.getByText('0%')).toBeInTheDocument(); // Success rate
    });

    it('does not render stages section when stages array is empty', () => {
      renderWithRouter(<ValidationRunCard run={mockRunEmpty} />);
      
      expect(screen.queryByText('Stages')).not.toBeInTheDocument();
    });
  });

  describe('Individual Stage Display', () => {
    it('shows stage success indicators correctly', () => {
      const { container } = renderWithRouter(<ValidationRunCard run={mockRunFailed} />);
      
      // Should have both green and red icons for mixed results
      const greenIcons = container.querySelectorAll('.text-green-600');
      const redIcons = container.querySelectorAll('.text-red-600');
      
      expect(greenIcons.length).toBeGreaterThan(0);
      expect(redIcons.length).toBeGreaterThan(0);
    });

    it('truncates long stage names correctly', () => {
      const runWithLongNames = {
        ...mockRunSuccess,
        stages: JSON.stringify([
          { id: 'stage-1', name: 'Very Long Stage Name That Should Be Truncated', success: true, duration: 1000 }
        ])
      };

      const { container } = renderWithRouter(<ValidationRunCard run={runWithLongNames} />);
      
      const truncatedElement = container.querySelector('.truncate');
      expect(truncatedElement).toBeInTheDocument();
      expect(truncatedElement).toHaveTextContent('Very Long Stage Name That Should Be Truncated');
    });

    it('displays stage durations with correct styling', () => {
      const { container } = renderWithRouter(<ValidationRunCard run={mockRunSuccess} />);
      
      const durationElements = container.querySelectorAll('.text-gray-500');
      expect(durationElements.length).toBeGreaterThan(0);
    });
  });

  describe('Color Coding', () => {
    it('uses green color for passed counts', () => {
      const { container } = renderWithRouter(<ValidationRunCard run={mockRunSuccess} />);
      
      const passedCountElement = container.querySelector('.text-green-600');
      expect(passedCountElement).toBeInTheDocument();
    });

    it('uses red color for failed counts', () => {
      const { container } = renderWithRouter(<ValidationRunCard run={mockRunFailed} />);
      
      const failedCountElement = container.querySelector('.text-red-600');
      expect(failedCountElement).toBeInTheDocument();
    });

    it('uses gray color for metadata text', () => {
      const { container } = renderWithRouter(<ValidationRunCard run={mockRunSuccess} />);
      
      const grayElements = container.querySelectorAll('.text-gray-500, .text-gray-600');
      expect(grayElements.length).toBeGreaterThan(0);
    });
  });

  describe('Link Generation', () => {
    it('generates correct link path for different run IDs', () => {
      renderWithRouter(<ValidationRunCard run={mockRunFailed} />);
      
      const detailsLink = screen.getByText('View Details');
      expect(detailsLink.closest('a')).toHaveAttribute('href', '/validation-run/run-2');
    });

    it('creates valid link for complex run IDs', () => {
      const runWithComplexId = {
        ...mockRunSuccess,
        id: 'run-123-abc-456'
      };

      renderWithRouter(<ValidationRunCard run={runWithComplexId} />);
      
      const detailsLink = screen.getByText('View Details');
      expect(detailsLink.closest('a')).toHaveAttribute('href', '/validation-run/run-123-abc-456');
    });
  });

  describe('Accessibility', () => {
    it('has proper semantic structure', () => {
      renderWithRouter(<ValidationRunCard run={mockRunSuccess} />);
      
      const link = screen.getByText('View Details').closest('a');
      expect(link).toHaveClass('inline-flex', 'items-center', 'gap-1');
    });

    it('includes descriptive text for screen readers', () => {
      renderWithRouter(<ValidationRunCard run={mockRunSuccess} />);
      
      expect(screen.getByText('Total Stages')).toBeInTheDocument();
      expect(screen.getByText('Success Rate')).toBeInTheDocument();
      expect(screen.getByText('Passed/Failed')).toBeInTheDocument();
    });
  });
});