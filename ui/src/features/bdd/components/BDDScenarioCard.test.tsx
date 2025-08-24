import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ScenarioCard } from './BDDScenarioCard';

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  CheckCircle: ({ className }: { className?: string }) => (
    <div data-testid="check-circle-icon" className={className}>CheckCircle</div>
  ),
  XCircle: ({ className }: { className?: string }) => (
    <div data-testid="x-circle-icon" className={className}>XCircle</div>
  ),
  Clock: ({ className }: { className?: string }) => (
    <div data-testid="clock-icon" className={className}>Clock</div>
  ),
  AlertCircle: ({ className }: { className?: string }) => (
    <div data-testid="alert-circle-icon" className={className}>AlertCircle</div>
  ),
  Eye: ({ className }: { className?: string }) => (
    <div data-testid="eye-icon" className={className}>Eye</div>
  ),
  Play: ({ className }: { className?: string }) => (
    <div data-testid="play-icon" className={className}>Play</div>
  ),
  ExternalLink: ({ className }: { className?: string }) => (
    <div data-testid="external-link-icon" className={className}>ExternalLink</div>
  ),
}));

const mockScenario = {
  id: 'scenario-123',
  todoTaskId: 'task-456',
  title: 'User Login Scenario',
  feature: 'Authentication',
  description: 'Test user login functionality',
  gherkinContent: `Given I am on the login page
When I enter valid credentials
Then I should be logged in successfully`,
  status: 'pending' as const,
  createdAt: '2023-01-01T10:00:00Z',
  updatedAt: '2023-01-01T10:00:00Z',
};

const mockScenarioWithExecution = {
  ...mockScenario,
  status: 'passed' as const,
  executedAt: '2023-01-01T10:30:00Z',
  executionDuration: 2500,
  playwrightTestFile: 'login.spec.ts',
  playwrightTestName: 'User Login Test',
  todoTask: {
    id: 'task-456',
    content: 'Implement user authentication',
  },
};

const mockScenarioWithError = {
  ...mockScenario,
  status: 'failed' as const,
  errorMessage: 'Test failed: Element not found',
  executedAt: '2023-01-01T10:30:00Z',
  executionDuration: 1200,
};

describe('ScenarioCard', () => {
  const mockOnExecute = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render scenario card with basic information', () => {
      render(<ScenarioCard scenario={mockScenario} onExecute={mockOnExecute} />);

      expect(screen.getByTestId('scenario-card')).toBeInTheDocument();
      expect(screen.getByTestId('scenario-title')).toHaveTextContent('User Login Scenario');
      expect(screen.getByText('Authentication')).toBeInTheDocument();
      expect(screen.getByTestId('scenario-status')).toHaveTextContent('pending');
    });

    it('should display correct status badge', () => {
      render(<ScenarioCard scenario={mockScenario} onExecute={mockOnExecute} />);

      const statusBadge = screen.getByTestId('scenario-status');
      expect(statusBadge).toHaveTextContent('pending');
      expect(statusBadge).toHaveAttribute('data-status', 'pending');
      expect(statusBadge).toHaveClass('bg-yellow-100', 'text-yellow-800', 'border-yellow-300');
    });

    it('should show appropriate status icon', () => {
      render(<ScenarioCard scenario={mockScenario} onExecute={mockOnExecute} />);

      expect(screen.getByTestId('clock-icon')).toBeInTheDocument();
    });
  });

  describe('Status Variations', () => {
    it('should render passed scenario correctly', () => {
      const passedScenario = { ...mockScenario, status: 'passed' as const };
      render(<ScenarioCard scenario={passedScenario} onExecute={mockOnExecute} />);

      const statusBadge = screen.getByTestId('scenario-status');
      expect(statusBadge).toHaveTextContent('passed');
      expect(statusBadge).toHaveClass('bg-green-100', 'text-green-800', 'border-green-300');
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    });

    it('should render failed scenario correctly', () => {
      const failedScenario = { ...mockScenario, status: 'failed' as const };
      render(<ScenarioCard scenario={failedScenario} onExecute={mockOnExecute} />);

      const statusBadge = screen.getByTestId('scenario-status');
      expect(statusBadge).toHaveTextContent('failed');
      expect(statusBadge).toHaveClass('bg-red-100', 'text-red-800', 'border-red-300');
      expect(screen.getByTestId('x-circle-icon')).toBeInTheDocument();
    });

    it('should render skipped scenario correctly', () => {
      const skippedScenario = { ...mockScenario, status: 'skipped' as const };
      render(<ScenarioCard scenario={skippedScenario} onExecute={mockOnExecute} />);

      const statusBadge = screen.getByTestId('scenario-status');
      expect(statusBadge).toHaveTextContent('skipped');
      expect(statusBadge).toHaveClass('bg-gray-100', 'text-gray-800', 'border-gray-300');
      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
    });
  });

  describe('Execution Duration Formatting', () => {
    it('should format duration in milliseconds for values less than 1000ms', () => {
      const scenarioWithShortDuration = {
        ...mockScenario,
        status: 'passed' as const,
        executionDuration: 750,
      };
      render(<ScenarioCard scenario={scenarioWithShortDuration} onExecute={mockOnExecute} />);

      expect(screen.getByTestId('execution-duration')).toHaveTextContent('750ms');
    });

    it('should format duration in seconds for values 1000ms or greater', () => {
      const scenarioWithLongDuration = {
        ...mockScenario,
        status: 'passed' as const,
        executionDuration: 2500,
      };
      render(<ScenarioCard scenario={scenarioWithLongDuration} onExecute={mockOnExecute} />);

      expect(screen.getByTestId('execution-duration')).toHaveTextContent('2.5s');
    });

    it('should not show duration badge when duration is not provided', () => {
      render(<ScenarioCard scenario={mockScenario} onExecute={mockOnExecute} />);

      expect(screen.queryByTestId('execution-duration')).not.toBeInTheDocument();
    });

    it('should not show duration badge when duration is 0', () => {
      const scenarioWithZeroDuration = {
        ...mockScenario,
        executionDuration: 0,
      };
      render(<ScenarioCard scenario={scenarioWithZeroDuration} onExecute={mockOnExecute} />);

      expect(screen.queryByTestId('execution-duration')).not.toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should show view details button for all scenarios', () => {
      render(<ScenarioCard scenario={mockScenario} onExecute={mockOnExecute} />);

      const viewButton = screen.getByRole('button', { name: /view details/i });
      expect(viewButton).toBeInTheDocument();
      expect(screen.getByTestId('eye-icon')).toBeInTheDocument();
    });

    it('should show execute button only for pending scenarios', () => {
      render(<ScenarioCard scenario={mockScenario} onExecute={mockOnExecute} />);

      const executeButton = screen.getByRole('button', { name: /execute scenario/i });
      expect(executeButton).toBeInTheDocument();
      expect(screen.getByTestId('play-icon')).toBeInTheDocument();
    });

    it('should not show execute button for non-pending scenarios', () => {
      const passedScenario = { ...mockScenario, status: 'passed' as const };
      render(<ScenarioCard scenario={passedScenario} onExecute={mockOnExecute} />);

      expect(screen.queryByRole('button', { name: /execute scenario/i })).not.toBeInTheDocument();
      expect(screen.queryByTestId('play-icon')).not.toBeInTheDocument();
    });

    it('should call onExecute when execute button is clicked', async () => {
      render(<ScenarioCard scenario={mockScenario} onExecute={mockOnExecute} />);

      const executeButton = screen.getByRole('button', { name: /execute scenario/i });
      await userEvent.click(executeButton);

      expect(mockOnExecute).toHaveBeenCalledWith('scenario-123');
      expect(mockOnExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe('Additional Information Display', () => {
    it('should show error indicator when error message exists', () => {
      render(<ScenarioCard scenario={mockScenarioWithError} onExecute={mockOnExecute} />);

      expect(screen.getByTestId('error-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('error-indicator')).toHaveTextContent('Error');
    });

    it('should show execution timestamp when available', () => {
      render(<ScenarioCard scenario={mockScenarioWithExecution} onExecute={mockOnExecute} />);

      expect(screen.getByText(/executed:/i)).toBeInTheDocument();
      // Check for timestamp with flexible format since toLocaleString() varies by environment
      expect(screen.getByText(/1\/1\/2023.*11:30:00.*AM|1\/1\/2023.*10:30:00.*AM/)).toBeInTheDocument();
    });

    it('should show playwright test file link when available', () => {
      render(<ScenarioCard scenario={mockScenarioWithExecution} onExecute={mockOnExecute} />);

      expect(screen.getByText(/linked to:/i)).toBeInTheDocument();
      expect(screen.getByText(/login\.spec\.ts/)).toBeInTheDocument();
      expect(screen.getByTestId('external-link-icon')).toBeInTheDocument();
    });

    it('should show associated task when available', () => {
      render(<ScenarioCard scenario={mockScenarioWithExecution} onExecute={mockOnExecute} />);

      expect(screen.getByText(/task:/i)).toBeInTheDocument();
      expect(screen.getByText(/Implement user authentication/)).toBeInTheDocument();
    });

    it('should not show optional information when not available', () => {
      render(<ScenarioCard scenario={mockScenario} onExecute={mockOnExecute} />);

      expect(screen.queryByTestId('error-indicator')).not.toBeInTheDocument();
      expect(screen.queryByText(/executed:/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/linked to:/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/task:/i)).not.toBeInTheDocument();
    });
  });

  describe('Details Modal', () => {
    it('should open details modal when view details button is clicked', async () => {
      render(<ScenarioCard scenario={mockScenario} onExecute={mockOnExecute} />);

      const viewButton = screen.getByRole('button', { name: /view details/i });
      await userEvent.click(viewButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Scenario Details')).toBeInTheDocument();
    });

    it('should display all scenario information in the modal', async () => {
      render(<ScenarioCard scenario={mockScenarioWithExecution} onExecute={mockOnExecute} />);

      const viewButton = screen.getByRole('button', { name: /view details/i });
      await userEvent.click(viewButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText('Title:')).toBeInTheDocument();
        expect(screen.getAllByText('User Login Scenario')).toHaveLength(2); // Card + Modal
        expect(screen.getByText('Feature:')).toBeInTheDocument();
        expect(screen.getAllByText('Authentication')).toHaveLength(2); // Card + Modal
        expect(screen.getByText('Status:')).toBeInTheDocument();
        expect(screen.getByTestId('gherkin-content')).toBeInTheDocument();
      });
    });

    it('should display gherkin content correctly in the modal', async () => {
      render(<ScenarioCard scenario={mockScenario} onExecute={mockOnExecute} />);

      const viewButton = screen.getByRole('button', { name: /view details/i });
      await userEvent.click(viewButton);

      await waitFor(() => {
        const gherkinContent = screen.getByTestId('gherkin-content');
        expect(gherkinContent).toHaveTextContent('Given I am on the login page');
        expect(gherkinContent).toHaveTextContent('When I enter valid credentials');
        expect(gherkinContent).toHaveTextContent('Then I should be logged in successfully');
      });
    });

    it('should display error message in the modal when present', async () => {
      render(<ScenarioCard scenario={mockScenarioWithError} onExecute={mockOnExecute} />);

      const viewButton = screen.getByRole('button', { name: /view details/i });
      await userEvent.click(viewButton);

      await waitFor(() => {
        expect(screen.getByText('Error Message:')).toBeInTheDocument();
        expect(screen.getByTestId('error-message')).toHaveTextContent('Test failed: Element not found');
      });
    });

    it('should not display error message section when no error', async () => {
      render(<ScenarioCard scenario={mockScenario} onExecute={mockOnExecute} />);

      const viewButton = screen.getByRole('button', { name: /view details/i });
      await userEvent.click(viewButton);

      await waitFor(() => {
        expect(screen.queryByText('Error Message:')).not.toBeInTheDocument();
        expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
      });
    });

    it('should close modal when close button is clicked', async () => {
      render(<ScenarioCard scenario={mockScenario} onExecute={mockOnExecute} />);

      const viewButton = screen.getByRole('button', { name: /view details/i });
      await userEvent.click(viewButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const closeButton = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('should close modal when clicking on backdrop', async () => {
      render(<ScenarioCard scenario={mockScenario} onExecute={mockOnExecute} />);

      const viewButton = screen.getByRole('button', { name: /view details/i });
      await userEvent.click(viewButton);

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();

      // Click on backdrop (parent of modal)
      const backdrop = modal.parentElement;
      if (backdrop) {
        fireEvent.click(backdrop);

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        });
      }
    });

    it('should not close modal when clicking inside the modal content', async () => {
      render(<ScenarioCard scenario={mockScenario} onExecute={mockOnExecute} />);

      const viewButton = screen.getByRole('button', { name: /view details/i });
      await userEvent.click(viewButton);

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();

      // Click inside modal content
      fireEvent.click(modal);

      // Modal should remain open
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle scenario with empty strings gracefully', () => {
      const scenarioWithEmptyStrings = {
        ...mockScenario,
        title: '',
        feature: '',
        description: '',
        gherkinContent: '',
      };

      render(<ScenarioCard scenario={scenarioWithEmptyStrings} onExecute={mockOnExecute} />);

      expect(screen.getByTestId('scenario-card')).toBeInTheDocument();
      expect(screen.getByTestId('scenario-title')).toHaveTextContent('');
    });

    it('should handle scenario with very long duration values', () => {
      const scenarioWithLongDuration = {
        ...mockScenario,
        status: 'passed' as const,
        executionDuration: 123456789, // Very long duration
      };

      render(<ScenarioCard scenario={scenarioWithLongDuration} onExecute={mockOnExecute} />);

      expect(screen.getByTestId('execution-duration')).toHaveTextContent('123456.8s');
    });

    it('should handle scenario with invalid timestamp gracefully', () => {
      const scenarioWithInvalidTimestamp = {
        ...mockScenario,
        executedAt: 'invalid-timestamp',
      };

      render(<ScenarioCard scenario={scenarioWithInvalidTimestamp} onExecute={mockOnExecute} />);

      // Should still render without crashing
      expect(screen.getByTestId('scenario-card')).toBeInTheDocument();
    });

    it('should handle scenario with null/undefined optional fields', () => {
      const scenarioWithNulls = {
        ...mockScenario,
        executedAt: undefined,
        executionDuration: undefined,
        errorMessage: undefined,
        playwrightTestFile: undefined,
        playwrightTestName: undefined,
        todoTask: undefined,
      };

      render(<ScenarioCard scenario={scenarioWithNulls} onExecute={mockOnExecute} />);

      expect(screen.getByTestId('scenario-card')).toBeInTheDocument();
      expect(screen.queryByTestId('execution-duration')).not.toBeInTheDocument();
      expect(screen.queryByTestId('error-indicator')).not.toBeInTheDocument();
    });

    it('should handle multiple rapid clicks on execute button', async () => {
      render(<ScenarioCard scenario={mockScenario} onExecute={mockOnExecute} />);

      const executeButton = screen.getByRole('button', { name: /execute scenario/i });

      // Click multiple times rapidly
      await userEvent.click(executeButton);
      await userEvent.click(executeButton);
      await userEvent.click(executeButton);

      // All clicks should be registered
      expect(mockOnExecute).toHaveBeenCalledTimes(3);
      expect(mockOnExecute).toHaveBeenCalledWith('scenario-123');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for the modal', async () => {
      render(<ScenarioCard scenario={mockScenario} onExecute={mockOnExecute} />);

      const viewButton = screen.getByRole('button', { name: /view details/i });
      await userEvent.click(viewButton);

      const modal = screen.getByRole('dialog');
      expect(modal).toBeInTheDocument();
      expect(modal).toHaveAttribute('role', 'dialog');
    });

    it('should have proper button titles for accessibility', () => {
      render(<ScenarioCard scenario={mockScenario} onExecute={mockOnExecute} />);

      const viewButton = screen.getByRole('button', { name: /view details/i });
      const executeButton = screen.getByRole('button', { name: /execute scenario/i });

      expect(viewButton).toHaveAttribute('title', 'View Details');
      expect(executeButton).toHaveAttribute('title', 'Execute Scenario');
    });

    it('should support keyboard navigation for buttons', async () => {
      render(<ScenarioCard scenario={mockScenario} onExecute={mockOnExecute} />);

      const viewButton = screen.getByRole('button', { name: /view details/i });
      const executeButton = screen.getByRole('button', { name: /execute scenario/i });

      // Tab to buttons and activate with Enter
      viewButton.focus();
      expect(viewButton).toHaveFocus();

      await userEvent.keyboard('{Tab}');
      expect(executeButton).toHaveFocus();

      await userEvent.keyboard('{Enter}');
      expect(mockOnExecute).toHaveBeenCalledWith('scenario-123');
    });

    it('should support keyboard navigation in the modal', async () => {
      render(<ScenarioCard scenario={mockScenario} onExecute={mockOnExecute} />);

      const viewButton = screen.getByRole('button', { name: /view details/i });
      await userEvent.click(viewButton);

      const closeButton = screen.getByRole('button', { name: /close/i });
      closeButton.focus();
      expect(closeButton).toHaveFocus();

      await userEvent.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('Component State Management', () => {
    it('should maintain separate modal state for multiple scenario cards', async () => {
      const scenario1 = { ...mockScenario, id: 'scenario-1', title: 'Scenario 1' };
      const scenario2 = { ...mockScenario, id: 'scenario-2', title: 'Scenario 2' };

      render(
        <div>
          <ScenarioCard scenario={scenario1} onExecute={mockOnExecute} />
          <ScenarioCard scenario={scenario2} onExecute={mockOnExecute} />
        </div>
      );

      const viewButtons = screen.getAllByRole('button', { name: /view details/i });
      
      // Open first modal
      await userEvent.click(viewButtons[0]);
      expect(screen.getAllByText('Scenario 1')).toHaveLength(2); // Card + Modal
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Close first modal
      const closeButton = screen.getByRole('button', { name: /close/i });
      await userEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      // Open second modal
      await userEvent.click(viewButtons[1]);
      expect(screen.getAllByText('Scenario 2')).toHaveLength(2); // Card + Modal
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});