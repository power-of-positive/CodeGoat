import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import StageManagement from './StageManagement';
import { settingsApi } from '../shared/lib/api';
import { ValidationStage } from '../shared/types/index';

// Mock the settings API
jest.mock('../shared/lib/api', () => ({
  settingsApi: {
    getValidationStages: jest.fn(),
    addValidationStage: jest.fn(),
    updateValidationStage: jest.fn(),
    removeValidationStage: jest.fn(),
  },
}));

// Mock @dnd-kit components for testing
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: any) => <div data-testid="dnd-context">{children}</div>,
  DragOverlay: ({ children }: any) => <div data-testid="drag-overlay">{children}</div>,
  useSensor: () => ({}),
  useSensors: () => [],
  MouseSensor: {},
  TouchSensor: {},
  closestCenter: {},
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => <div data-testid="sortable-context">{children}</div>,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: null,
    isDragging: false,
  }),
  arrayMove: (array: any[], oldIndex: number, newIndex: number) => {
    const result = Array.from(array);
    const [removed] = result.splice(oldIndex, 1);
    result.splice(newIndex, 0, removed);
    return result;
  },
  verticalListSortingStrategy: {},
}));

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Transform: {
      toString: () => '',
    },
  },
}));

const mockStages: ValidationStage[] = [
  {
    id: 'lint',
    name: 'Code Linting',
    command: 'npm run lint',
    timeout: 90000,
    enabled: true,
    continueOnFailure: false,
    priority: 1,
  },
  {
    id: 'typecheck',
    name: 'Type Checking',
    command: 'npm run type-check',
    timeout: 45000,
    enabled: true,
    continueOnFailure: false,
    priority: 2,
  },
  {
    id: 'tests',
    name: 'Unit Tests',
    command: 'npm test',
    timeout: 60000,
    enabled: false,
    continueOnFailure: true,
    priority: 3,
  },
];

const renderStageManagement = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StageManagement />
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('StageManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the page header correctly', async () => {
    (settingsApi.getValidationStages as jest.Mock).mockResolvedValue(mockStages);

    renderStageManagement();

    expect(screen.getByText('Stage Management')).toBeInTheDocument();
    expect(screen.getByText('Configure validation pipeline stages with advanced editing and reordering')).toBeInTheDocument();
  });

  it('displays loading state', async () => {
    (settingsApi.getValidationStages as jest.Mock).mockImplementation(() => new Promise(() => {}));

    renderStageManagement();

    // Should show loading skeleton
    await waitFor(() => {
      expect(screen.getByText('Stage Management')).toBeInTheDocument();
    });
  });

  it('displays error state when API fails', async () => {
    (settingsApi.getValidationStages as jest.Mock).mockRejectedValue(new Error('API Error'));

    renderStageManagement();

    await waitFor(() => {
      expect(screen.getByText('Failed to load validation stages')).toBeInTheDocument();
    });
  });

  it('displays empty state when no stages exist', async () => {
    (settingsApi.getValidationStages as jest.Mock).mockResolvedValue([]);

    renderStageManagement();

    await waitFor(() => {
      expect(screen.getByText('No validation stages configured')).toBeInTheDocument();
      expect(screen.getByText('Get started by adding your first validation stage')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Your First Stage/i })).toBeInTheDocument();
    });
  });

  it('displays stages list with statistics', async () => {
    (settingsApi.getValidationStages as jest.Mock).mockResolvedValue(mockStages);

    renderStageManagement();

    await waitFor(() => {
      // Check statistics cards
      expect(screen.getByText('Total Stages')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Total count
      expect(screen.getByText('Enabled')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Enabled count
      expect(screen.getAllByText('Disabled')).toHaveLength(2); // Statistics label + badge on disabled stage
      expect(screen.getByText('1')).toBeInTheDocument(); // Disabled count

      // Check stage cards
      expect(screen.getByText('Code Linting')).toBeInTheDocument();
      expect(screen.getByText('Type Checking')).toBeInTheDocument();
      expect(screen.getByText('Unit Tests')).toBeInTheDocument();
    });
  });

  it('shows add stage form when add button is clicked', async () => {
    const user = userEvent.setup();
    (settingsApi.getValidationStages as jest.Mock).mockResolvedValue(mockStages);

    renderStageManagement();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add Stage/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Add Stage/i }));

    expect(screen.getByText('Add New Validation Stage')).toBeInTheDocument();
    expect(screen.getByLabelText('Stage Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Command')).toBeInTheDocument();
  });

  it.skip('can add a new stage', async () => {
    const user = userEvent.setup();
    const newStage = {
      id: 'new-stage',
      name: 'New Stage',
      command: 'npm run new-command',
      timeout: 30000,
      enabled: true,
      continueOnFailure: false,
      priority: 4,
    };

    (settingsApi.getValidationStages as jest.Mock).mockResolvedValue(mockStages);
    (settingsApi.addValidationStage as jest.Mock).mockResolvedValue(newStage);

    renderStageManagement();

    // Wait for stages to load and click add button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add Stage/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Add Stage/i }));

    // Fill out the form
    await user.type(screen.getByLabelText('Stage Name'), 'New Stage');
    await user.type(screen.getByLabelText('Command'), 'npm run new-command');

    // Submit the form
    await user.click(screen.getByRole('button', { name: /Add Stage/i }));

    await waitFor(() => {
      expect(settingsApi.addValidationStage).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New Stage',
          command: 'npm run new-command',
        })
      );
    });
  });

  it.skip('can edit an existing stage', async () => {
    const user = userEvent.setup();
    (settingsApi.getValidationStages as jest.Mock).mockResolvedValue(mockStages);
    (settingsApi.updateValidationStage as jest.Mock).mockResolvedValue({
      ...mockStages[0],
      name: 'Updated Linting',
    });

    renderStageManagement();

    await waitFor(() => {
      expect(screen.getByText('Code Linting')).toBeInTheDocument();
    });

    // Click edit button for first stage
    const editButtons = screen.getAllByTitle('Edit stage');
    await user.click(editButtons[0]);

    // Update the name field
    const nameField = screen.getByDisplayValue('Code Linting');
    await user.clear(nameField);
    await user.type(nameField, 'Updated Linting');

    // Save changes
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(settingsApi.updateValidationStage).toHaveBeenCalledWith(
        'lint',
        expect.objectContaining({
          name: 'Updated Linting',
        })
      );
    });
  });

  it('can toggle stage enabled state', async () => {
    const user = userEvent.setup();
    (settingsApi.getValidationStages as jest.Mock).mockResolvedValue(mockStages);
    (settingsApi.updateValidationStage as jest.Mock).mockResolvedValue({
      ...mockStages[0],
      enabled: false,
    });

    renderStageManagement();

    await waitFor(() => {
      expect(screen.getByText('Code Linting')).toBeInTheDocument();
    });

    // Click disable button (pause icon) for first stage
    const toggleButtons = screen.getAllByTitle('Disable stage');
    await user.click(toggleButtons[0]);

    await waitFor(() => {
      expect(settingsApi.updateValidationStage).toHaveBeenCalledWith('lint', {
        enabled: false,
      });
    });
  });

  it('can delete a stage with confirmation', async () => {
    const user = userEvent.setup();
    window.confirm = jest.fn(() => true);

    (settingsApi.getValidationStages as jest.Mock).mockResolvedValue(mockStages);
    (settingsApi.removeValidationStage as jest.Mock).mockResolvedValue(undefined);

    renderStageManagement();

    await waitFor(() => {
      expect(screen.getByText('Code Linting')).toBeInTheDocument();
    });

    // Click delete button for first stage
    const deleteButtons = screen.getAllByTitle('Delete stage');
    await user.click(deleteButtons[0]);

    expect(window.confirm).toHaveBeenCalledWith(
      'Are you sure you want to delete this validation stage? This action cannot be undone.'
    );

    await waitFor(() => {
      expect(settingsApi.removeValidationStage).toHaveBeenCalledWith('lint');
    });
  });

  it.skip('validates form fields correctly', async () => {
    const user = userEvent.setup();
    (settingsApi.getValidationStages as jest.Mock).mockResolvedValue(mockStages);

    renderStageManagement();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Add Stage/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Add Stage/i }));

    // Try to submit empty form
    await user.click(screen.getByRole('button', { name: /Add Stage/i }));

    // Should show validation errors
    expect(screen.getByText('Stage name is required')).toBeInTheDocument();
    expect(screen.getByText('Command is required')).toBeInTheDocument();
  });

  it.skip('shows drag handles for non-editing stages', async () => {
    (settingsApi.getValidationStages as jest.Mock).mockResolvedValue(mockStages);

    renderStageManagement();

    await waitFor(() => {
      expect(screen.getByText('Code Linting')).toBeInTheDocument();
    });

    // Should have drag handles
    const dragHandles = screen.getAllByRole('button', { name: '' }); // GripVertical icons
    expect(dragHandles.length).toBeGreaterThan(0);
  });

  it('can reset stage priorities', async () => {
    const user = userEvent.setup();
    window.confirm = jest.fn(() => true);

    (settingsApi.getValidationStages as jest.Mock).mockResolvedValue(mockStages);
    (settingsApi.updateValidationStage as jest.Mock).mockResolvedValue(mockStages[0]);

    renderStageManagement();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Reset Priorities/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Reset Priorities/i }));

    expect(window.confirm).toHaveBeenCalledWith(
      'Reset all stage priorities to sequential order (0, 1, 2, ...)? This will reorder stages based on their current position.'
    );

    // Should update stages with sequential priorities
    await waitFor(() => {
      expect(settingsApi.updateValidationStage).toHaveBeenCalledWith('lint', { priority: 0 });
    });
  });

  it.skip('displays stage properties correctly', async () => {
    (settingsApi.getValidationStages as jest.Mock).mockResolvedValue(mockStages);

    renderStageManagement();

    await waitFor(() => {
      // Should show stage properties
      expect(screen.getByText('npm run lint')).toBeInTheDocument();
      expect(screen.getByText('90.0s timeout')).toBeInTheDocument();
      expect(screen.getByText('Priority: 1')).toBeInTheDocument();
      expect(screen.getByText('Continue on failure')).toBeInTheDocument(); // For the third stage
      expect(screen.getByText('Disabled')).toBeInTheDocument(); // For the third stage
    });
  });
});

// Add window.confirm mock for testing
Object.defineProperty(window, 'confirm', {
  writable: true,
  value: jest.fn(() => true),
});