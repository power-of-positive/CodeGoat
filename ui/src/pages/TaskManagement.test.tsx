/* eslint-disable max-lines */
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
// Jest is the test runner for this project, not vitest
import { TaskManagement } from './TaskManagement';
import { taskApi, claudeWorkersApi } from '../shared/lib/api';
import { Task } from '../shared/types';

// Mock the API modules
jest.mock('../shared/lib/api', () => ({
  taskApi: {
    getTasks: jest.fn(),
    createTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
  },
  claudeWorkersApi: {
    startWorker: jest.fn(),
  },
}));

// Type the mocked modules
const mockTaskApi = taskApi as jest.Mocked<typeof taskApi>;
const mockClaudeWorkersApi = claudeWorkersApi as jest.Mocked<typeof claudeWorkersApi>;

// Mock react-router-dom Link component to avoid routing issues in tests
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Link: ({ to, children, ...props }: any) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

// Sample task data for testing
const mockTasks: Task[] = [
  {
    id: 'CODEGOAT-001',
    content: 'Implement user authentication system',
    status: 'pending',
    priority: 'high',
    taskType: 'task',
    executorId: 'claude_code',
    startTime: '2024-01-15T10:00:00Z',
    endTime: undefined,
    duration: undefined,
  },
  {
    id: 'CODEGOAT-002',
    content: 'Create user dashboard with analytics',
    status: 'in_progress',
    priority: 'medium',
    taskType: 'story',
    executorId: 'claude_code',
    startTime: '2024-01-16T09:00:00Z',
    endTime: undefined,
    duration: undefined,
  },
  {
    id: 'CODEGOAT-003',
    content: 'Fix critical security vulnerability in login',
    status: 'completed',
    priority: 'high',
    taskType: 'task',
    executorId: 'claude_code',
    startTime: '2024-01-14T14:00:00Z',
    endTime: '2024-01-14T16:30:00Z',
    duration: '2h 30m',
  },
];

// Test wrapper component
function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{children}</BrowserRouter>
    </QueryClientProvider>
  );
}

describe('TaskManagement', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Default mock implementation for getTasks
    mockTaskApi.getTasks.mockResolvedValue(mockTasks);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders the task management page with header', async () => {
      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      // Wait for the component to load the data
      await waitFor(() => {
        expect(screen.getByText('Task Management')).toBeInTheDocument();
      });

      // Check header elements
      expect(
        screen.getByText('Comprehensive task management with advanced filtering and CRUD operations')
      ).toBeInTheDocument();
      expect(screen.getByText('Add Task')).toBeInTheDocument();
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    it('shows loading state initially', () => {
      // Make the API call hang to test loading state
      mockTaskApi.getTasks.mockImplementation(() => new Promise(() => {}));

      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      expect(screen.getByText('Loading tasks...')).toBeInTheDocument();
    });

    it('displays tasks in table view by default', async () => {
      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('CODEGOAT-001')).toBeInTheDocument();
      });

      // Check table headers
      expect(screen.getByText('ID')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Priority')).toBeInTheDocument();
      expect(screen.getByText('Type')).toBeInTheDocument();

      // Check task data
      expect(screen.getByText('Implement user authentication system')).toBeInTheDocument();
      expect(screen.getByText('Create user dashboard with analytics')).toBeInTheDocument();
      expect(screen.getByText('Fix critical security vulnerability in login')).toBeInTheDocument();
    });

    it('shows error state when API fails', async () => {
      mockTaskApi.getTasks.mockRejectedValue(new Error('API Error'));

      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Failed to Load')).toBeInTheDocument();
      });

      expect(screen.getByText('Could not load tasks')).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });

    it('displays correct task count', async () => {
      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Showing 3 of 3 tasks')).toBeInTheDocument();
      });
    });
  });

  describe('View Mode Toggle', () => {
    it('switches between table and grid view', async () => {
      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('CODEGOAT-001')).toBeInTheDocument();
      });

      // Initially in table view
      expect(screen.getByRole('table')).toBeInTheDocument();

      // Switch to grid view
      const gridButton = screen.getByText('Grid');
      await user.click(gridButton);

      // Table should be gone, grid should be present
      expect(screen.queryByRole('table')).not.toBeInTheDocument();
      // In grid view, tasks appear as cards
      expect(screen.getAllByText('CODEGOAT-001')).toHaveLength(1); // Still visible in grid
    });
  });

  describe('Task Creation', () => {
    it('opens create form when Add Task is clicked', async () => {
      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      // Wait for the component to load and show the header
      await waitFor(() => {
        expect(screen.getByText('Task Management')).toBeInTheDocument();
      });

      // Now find and click the Add Task button
      const addButton = screen.getByText('Add Task');
      await user.click(addButton);

      expect(screen.getByText('Create New Task')).toBeInTheDocument();
      expect(screen.getByLabelText('Task Description *')).toBeInTheDocument();
      expect(screen.getByText('Create Task')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('creates a task successfully', async () => {
      const newTask: Task = {
        id: 'CODEGOAT-004',
        content: 'New test task',
        status: 'pending',
        priority: 'medium',
        taskType: 'task',
        executorId: 'claude_code',
      };

      mockTaskApi.createTask.mockResolvedValue(newTask);

      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      // Wait for the component to load
      await waitFor(() => {
        expect(screen.getByText('Task Management')).toBeInTheDocument();
      });

      // Open create form
      const addButton = screen.getByText('Add Task');
      await user.click(addButton);

      // Fill form
      const contentInput = screen.getByLabelText('Task Description *');
      await user.type(contentInput, 'New test task');

      const prioritySelect = screen.getByDisplayValue('Medium Priority');
      await user.selectOptions(prioritySelect, 'high');

      // Submit form
      const createButton = screen.getByText('Create Task');
      await user.click(createButton);

      // Verify API was called with correct data
      await waitFor(() => {
        expect(taskApi.createTask).toHaveBeenCalledWith({
          content: 'New test task',
          priority: 'high',
          status: 'pending',
          taskType: 'task',
          executorId: 'claude_code',
        });
      });
    });

    it('validates required fields', async () => {
      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      // Wait for the component to load
      await waitFor(() => {
        expect(screen.getByText('Task Management')).toBeInTheDocument();
      });

      // Open create form
      const addButton = screen.getByText('Add Task');
      await user.click(addButton);

      // Try to submit without content
      const createButton = screen.getByText('Create Task');
      await user.click(createButton);

      // Form should not submit (browser validation)
      expect(taskApi.createTask).not.toHaveBeenCalled();
    });

    it('cancels task creation', async () => {
      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      // Wait for the component to load
      await waitFor(() => {
        expect(screen.getByText('Task Management')).toBeInTheDocument();
      });

      // Open create form
      const addButton = screen.getByText('Add Task');
      await user.click(addButton);

      // Cancel
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);

      // Form should be closed
      expect(screen.queryByText('Create New Task')).not.toBeInTheDocument();
    });
  });

  describe('Task Editing', () => {
    it('opens edit form when edit button is clicked', async () => {
      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      // Wait for the component to load first
      await waitFor(() => {
        expect(screen.getByText('Task Management')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(screen.getByText('CODEGOAT-001')).toBeInTheDocument();
      });

      // Find the first edit button (in table view)
      const editButtons = screen.getAllByLabelText(/edit/i);
      await user.click(editButtons[0]);

      // Edit form should appear
      expect(screen.getByText('Edit Task')).toBeInTheDocument();
      // The first task in the table might be different due to sorting, so just check that an edit form is shown with content
      expect(screen.getByLabelText('Task Description *')).toBeInTheDocument();
    });

    it('updates a task successfully', async () => {
      const updatedTask: Task = {
        ...mockTasks[0],
        content: 'Updated task content',
        priority: 'low',
      };

      mockTaskApi.updateTask.mockResolvedValue(updatedTask);

      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      // Wait for the component to load first
      await waitFor(() => {
        expect(screen.getByText('Task Management')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(screen.getByText('CODEGOAT-001')).toBeInTheDocument();
      });

      // Find the row containing CODEGOAT-001 and click its edit button
      const taskRow = screen.getByText('CODEGOAT-001').closest('tr');
      expect(taskRow).toBeInTheDocument();
      const editButton = within(taskRow!).getByLabelText(/edit/i);
      await user.click(editButton);

      // Update content - find the input that should contain the task content
      await waitFor(() => {
        expect(screen.getByText('Edit Task')).toBeInTheDocument();
      });

      const contentInput = screen.getByLabelText('Task Description *');
      await user.clear(contentInput);
      await user.type(contentInput, 'Updated task content');

      // Update priority - find the priority select by role and current value
      const selects = screen.getAllByRole('combobox');
      const prioritySelect = selects.find(select => {
        const selectElement = select as HTMLSelectElement;
        return selectElement.value === 'high' || selectElement.selectedOptions[0]?.text === 'High Priority';
      }) as HTMLSelectElement;
      expect(prioritySelect).toBeInTheDocument();
      await user.selectOptions(prioritySelect, 'low');

      // Submit
      const updateButton = screen.getByText('Update Task');
      await user.click(updateButton);

      // Verify API call
      await waitFor(() => {
        expect(taskApi.updateTask).toHaveBeenCalledWith('CODEGOAT-001', {
          content: 'Updated task content',
          priority: 'low',
          status: 'pending',
          taskType: 'task',
          executorId: 'claude_code',
          startTime: '2024-01-15T10:00:00Z',
          endTime: undefined,
          duration: undefined,
        });
      });
    });
  });

  describe('Task Deletion', () => {
    it('deletes a single task after confirmation', async () => {
      // Mock window.confirm
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      mockTaskApi.deleteTask.mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      // Wait for the component to load first
      await waitFor(() => {
        expect(screen.getByText('Task Management')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(screen.getByText('CODEGOAT-001')).toBeInTheDocument();
      });

      // Find the row containing CODEGOAT-001 and click its delete button
      const taskRow = screen.getByText('CODEGOAT-001').closest('tr');
      expect(taskRow).toBeInTheDocument();
      const deleteButton = within(taskRow!).getByLabelText(/delete/i);
      await user.click(deleteButton);

      // Verify confirmation was shown and API was called
      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this task?');
      await waitFor(() => {
        expect(taskApi.deleteTask).toHaveBeenCalledWith('CODEGOAT-001');
      });

      confirmSpy.mockRestore();
    });

    it('cancels deletion when user declines confirmation', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      // Wait for the component to load first
      await waitFor(() => {
        expect(screen.getByText('Task Management')).toBeInTheDocument();
      });
      
      await waitFor(() => {
        expect(screen.getByText('CODEGOAT-001')).toBeInTheDocument();
      });

      // Find the row containing CODEGOAT-001 and click its delete button
      const taskRow = screen.getByText('CODEGOAT-001').closest('tr');
      expect(taskRow).toBeInTheDocument();
      const deleteButton = within(taskRow!).getByLabelText(/delete/i);
      await user.click(deleteButton);

      // API should not be called
      expect(taskApi.deleteTask).not.toHaveBeenCalled();

      confirmSpy.mockRestore();
    });
  });

  describe('Filtering', () => {
    it('opens and closes filter panel', async () => {
      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      // Wait for the component to load first
      await waitFor(() => {
        expect(screen.getByText('Task Management')).toBeInTheDocument();
      });

      // Initially filters should be closed
      expect(screen.queryByText('Search Tasks')).not.toBeInTheDocument();

      // Open filters
      const filtersButton = screen.getByText('Filters & Search');
      await user.click(filtersButton);

      // Filters should be open
      expect(screen.getByText('Search Tasks')).toBeInTheDocument();
      expect(screen.getByLabelText('Search Tasks')).toBeInTheDocument();

      // Close filters
      await user.click(filtersButton);

      // Filters should be closed again
      expect(screen.queryByText('Search Tasks')).not.toBeInTheDocument();
    });

    it('filters tasks by search term', async () => {
      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Showing 3 of 3 tasks')).toBeInTheDocument();
      });

      // Open filters
      const filtersButton = screen.getByText('Filters & Search');
      await user.click(filtersButton);

      // Search for 'authentication'
      const searchInput = screen.getByLabelText('Search Tasks');
      await user.type(searchInput, 'authentication');

      // Should show only 1 task
      await waitFor(() => {
        expect(screen.getByText('Showing 1 of 3 tasks')).toBeInTheDocument();
      });

      // Only the authentication task should be visible
      expect(screen.getByText('Implement user authentication system')).toBeInTheDocument();
      expect(screen.queryByText('Create user dashboard with analytics')).not.toBeInTheDocument();
    });

    it('filters tasks by status', async () => {
      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Showing 3 of 3 tasks')).toBeInTheDocument();
      });

      // Open filters
      const filtersButton = screen.getByText('Filters & Search');
      await user.click(filtersButton);

      // Filter by completed status
      const statusSelect = screen.getByDisplayValue('All Statuses');
      await user.selectOptions(statusSelect, 'completed');

      // Should show only completed task
      await waitFor(() => {
        expect(screen.getByText('Showing 1 of 3 tasks')).toBeInTheDocument();
      });

      expect(screen.getByText('Fix critical security vulnerability in login')).toBeInTheDocument();
      expect(screen.queryByText('Implement user authentication system')).not.toBeInTheDocument();
    });

    it('filters tasks by priority', async () => {
      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Showing 3 of 3 tasks')).toBeInTheDocument();
      });

      // Open filters
      const filtersButton = screen.getByText('Filters & Search');
      await user.click(filtersButton);

      // Filter by high priority
      const prioritySelect = screen.getByDisplayValue('All Priorities');
      await user.selectOptions(prioritySelect, 'high');

      // Should show only high priority tasks
      await waitFor(() => {
        expect(screen.getByText('Showing 2 of 3 tasks')).toBeInTheDocument();
      });

      expect(screen.getByText('Implement user authentication system')).toBeInTheDocument();
      expect(screen.getByText('Fix critical security vulnerability in login')).toBeInTheDocument();
      expect(screen.queryByText('Create user dashboard with analytics')).not.toBeInTheDocument();
    });

    it('clears all filters', async () => {
      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Showing 3 of 3 tasks')).toBeInTheDocument();
      });

      // Open filters and apply some filters
      const filtersButton = screen.getByText('Filters & Search');
      await user.click(filtersButton);

      const searchInput = screen.getByLabelText('Search Tasks');
      await user.type(searchInput, 'authentication');

      const statusSelect = screen.getByDisplayValue('All Statuses');
      await user.selectOptions(statusSelect, 'pending');

      // Should show filtered results
      await waitFor(() => {
        expect(screen.getByText('Showing 1 of 3 tasks')).toBeInTheDocument();
      });

      // Clear all filters
      const clearButton = screen.getByText('Clear All');
      await user.click(clearButton);

      // Should show all tasks again
      await waitFor(() => {
        expect(screen.getByText('Showing 3 of 3 tasks')).toBeInTheDocument();
      });

      // Verify inputs are cleared
      expect(searchInput).toHaveValue('');
      expect(statusSelect).toHaveValue('all');
    });
  });

  describe('Sorting', () => {
    it('sorts tasks by ID in ascending order', async () => {
      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('CODEGOAT-001')).toBeInTheDocument();
      });

      // Click ID header to sort
      const idHeader = screen.getByText('ID');
      await user.click(idHeader);

      // Tasks should be sorted by ID ascending
      const taskRows = screen.getAllByRole('row');
      // Skip header row, check data rows
      const firstDataRow = taskRows[1];
      expect(within(firstDataRow).getByText('CODEGOAT-001')).toBeInTheDocument();
    });

    it('reverses sort order when clicking same column twice', async () => {
      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('CODEGOAT-001')).toBeInTheDocument();
      });

      const idHeader = screen.getByText('ID');

      // First click - ascending
      await user.click(idHeader);
      
      // Second click - descending
      await user.click(idHeader);

      // Should show descending order (CODEGOAT-003 first as it's the latest)
      const taskRows = screen.getAllByRole('row');
      const firstDataRow = taskRows[1];
      expect(within(firstDataRow).getByText('CODEGOAT-003')).toBeInTheDocument();
    });
  });

  describe('Task Selection', () => {
    it('selects individual tasks', async () => {
      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('CODEGOAT-001')).toBeInTheDocument();
      });

      // Find checkboxes (skip the "select all" checkbox)
      const checkboxes = screen.getAllByRole('checkbox');
      const taskCheckbox = checkboxes[1]; // First task checkbox

      await user.click(taskCheckbox);

      // Should show selection count
      expect(screen.getByText('1 selected')).toBeInTheDocument();
      expect(screen.getByText('Delete Selected')).toBeInTheDocument();
    });

    it('selects all tasks', async () => {
      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('CODEGOAT-001')).toBeInTheDocument();
      });

      // Click select all checkbox
      const checkboxes = screen.getAllByRole('checkbox');
      const selectAllCheckbox = checkboxes[0];

      await user.click(selectAllCheckbox);

      // Should show all tasks selected
      expect(screen.getByText('3 selected')).toBeInTheDocument();
    });

    it('performs bulk delete', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      mockTaskApi.deleteTask.mockResolvedValue(undefined);

      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('CODEGOAT-001')).toBeInTheDocument();
      });

      // Select all tasks
      const checkboxes = screen.getAllByRole('checkbox');
      const selectAllCheckbox = checkboxes[0];
      await user.click(selectAllCheckbox);

      // Click bulk delete
      const deleteButton = screen.getByText('Delete Selected');
      await user.click(deleteButton);

      // Verify confirmation and API calls
      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete 3 selected tasks?');
      
      await waitFor(() => {
        expect(taskApi.deleteTask).toHaveBeenCalledTimes(3);
        expect(taskApi.deleteTask).toHaveBeenCalledWith('CODEGOAT-001');
        expect(taskApi.deleteTask).toHaveBeenCalledWith('CODEGOAT-002');
        expect(taskApi.deleteTask).toHaveBeenCalledWith('CODEGOAT-003');
      });

      confirmSpy.mockRestore();
    });
  });

  describe('Claude Worker Integration', () => {
    it('starts Claude worker for a task', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      
      mockClaudeWorkersApi.startWorker.mockResolvedValue({
        workerId: 'worker-123',
        taskId: 'CODEGOAT-001',
        status: 'starting',
        pid: 12345,
        logFile: '/tmp/worker-123.log',
        startTime: '2024-01-15T10:00:00Z',
      });

      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('CODEGOAT-001')).toBeInTheDocument();
      });

      // Find the row containing CODEGOAT-001 and click its worker button
      const taskRow = screen.getByText('CODEGOAT-001').closest('tr');
      expect(taskRow).toBeInTheDocument();
      const workerButton = within(taskRow!).getByLabelText(/bot|worker/i);
      await user.click(workerButton);

      // Verify confirmation was shown
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining('Start Claude Code worker for task: "Implement user authentication system"')
      );

      // Verify API call
      await waitFor(() => {
        expect(claudeWorkersApi.startWorker).toHaveBeenCalledWith({
          taskId: 'CODEGOAT-001',
          taskContent: 'Implement user authentication system',
        });
      });

      // Verify success alert
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('Started Claude Code worker!')
      );

      confirmSpy.mockRestore();
      alertSpy.mockRestore();
    });

    it('handles worker start failure', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(true);
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      mockClaudeWorkersApi.startWorker.mockRejectedValue(new Error('Worker failed to start'));

      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('CODEGOAT-001')).toBeInTheDocument();
      });

      // Find the row containing CODEGOAT-001 and click its worker button
      const taskRow = screen.getByText('CODEGOAT-001').closest('tr');
      expect(taskRow).toBeInTheDocument();
      const workerButton = within(taskRow!).getByLabelText(/bot|worker/i);
      await user.click(workerButton);

      // Verify error handling
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to start Claude worker:', expect.any(Error));
      });

      expect(alertSpy).toHaveBeenCalledWith(
        'Failed to start Claude Code worker. Please check the console for details.'
      );

      confirmSpy.mockRestore();
      alertSpy.mockRestore();
      consoleSpy.mockRestore();
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no tasks exist', async () => {
      mockTaskApi.getTasks.mockResolvedValue([]);

      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('No Tasks Found')).toBeInTheDocument();
      });

      expect(screen.getByText("You haven't created any tasks yet.")).toBeInTheDocument();
      expect(screen.getByText('Create Your First Task')).toBeInTheDocument();
    });

    it('shows filtered empty state when no tasks match filters', async () => {
      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Showing 3 of 3 tasks')).toBeInTheDocument();
      });

      // Apply filter that matches no tasks
      const filtersButton = screen.getByText('Filters & Search');
      await user.click(filtersButton);

      const searchInput = screen.getByLabelText('Search Tasks');
      await user.type(searchInput, 'nonexistent task');

      await waitFor(() => {
        expect(screen.getByText('No Tasks Found')).toBeInTheDocument();
      });

      expect(screen.getByText('No tasks match your current filters.')).toBeInTheDocument();
      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for buttons', async () => {
      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('CODEGOAT-001')).toBeInTheDocument();
      });

      // Check that edit and delete buttons have proper labels
      expect(screen.getAllByLabelText(/edit/i)).toHaveLength(3);
      expect(screen.getAllByLabelText(/delete/i)).toHaveLength(3);
    });

    it('supports keyboard navigation', async () => {
      render(
        <TestWrapper>
          <TaskManagement />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('CODEGOAT-001')).toBeInTheDocument();
      });

      // Test that buttons are focusable
      const addButton = screen.getByText('Add Task');
      addButton.focus();
      expect(addButton).toHaveFocus();

      // Test that interactive elements are focusable
      const refreshButton = screen.getByText('Refresh');
      refreshButton.focus();
      expect(refreshButton).toHaveFocus();
    });
  });
});