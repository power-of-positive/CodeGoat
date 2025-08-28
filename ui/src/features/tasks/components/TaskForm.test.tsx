import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskForm } from './TaskForm';
import { Task } from '../../../shared/types/index';

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Edit: ({ className }: { className?: string }) => (
    <div data-testid="edit-icon" className={className}>Edit</div>
  ),
  Plus: ({ className }: { className?: string }) => (
    <div data-testid="plus-icon" className={className}>Plus</div>
  ),
}));

// Mock UI components
jest.mock('../../../shared/ui/button', () => ({
  Button: ({ children, onClick, type, variant, size, className, ...props }: any) => (
    <button
      data-testid="button"
      onClick={onClick}
      type={type}
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
  CardTitle: ({ children, className, ...props }: any) => (
    <h3 data-testid="card-title" className={className} {...props}>
      {children}
    </h3>
  ),
}));

describe('TaskForm', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  const mockTask: Task = {
    id: 'task-123',
    content: 'Existing task content',
    priority: 'high',
    status: 'in_progress',
    taskType: 'story',
    executorId: 'custom_executor',
    startTime: '2024-01-01T10:00:00Z',
    endTime: null,
    duration: null,
    bddScenarios: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render create form when no task is provided', () => {
      render(
        <TaskForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      expect(screen.getByTestId('card')).toBeInTheDocument();
      expect(screen.getByTestId('card-header')).toBeInTheDocument();
      expect(screen.getByTestId('card-content')).toBeInTheDocument();
      expect(screen.getByText('Create New Task')).toBeInTheDocument();
      expect(screen.getByTestId('plus-icon')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Create Task' })).toBeInTheDocument();
    });

    it('should render edit form when task is provided', () => {
      render(
        <TaskForm task={mockTask} onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      expect(screen.getByText('Edit Task')).toBeInTheDocument();
      expect(screen.getByTestId('edit-icon')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Update Task' })).toBeInTheDocument();
    });

    it('should render all form fields', () => {
      render(
        <TaskForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      expect(screen.getByLabelText('Task Description *')).toBeInTheDocument();
      expect(screen.getByLabelText('Priority')).toBeInTheDocument();
      expect(screen.getByLabelText('Status')).toBeInTheDocument();
      expect(screen.getByLabelText('Type')).toBeInTheDocument();
      expect(screen.getByLabelText('Executor')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });
  });

  describe('Form Field Defaults', () => {
    it('should have correct default values for create form', () => {
      render(
        <TaskForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      expect((screen.getByLabelText('Task Description *') as HTMLTextAreaElement).value).toBe('');
      expect((screen.getByLabelText('Priority') as HTMLSelectElement).value).toBe('medium');
      expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('pending');
      expect((screen.getByLabelText('Type') as HTMLSelectElement).value).toBe('task');
      expect((screen.getByLabelText('Executor') as HTMLInputElement).value).toBe('claude_code');
    });

    it('should populate form fields when editing existing task', () => {
      render(
        <TaskForm task={mockTask} onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      expect((screen.getByLabelText('Task Description *') as HTMLTextAreaElement).value).toBe('Existing task content');
      expect((screen.getByLabelText('Priority') as HTMLSelectElement).value).toBe('high');
      expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('in_progress');
      expect((screen.getByLabelText('Type') as HTMLSelectElement).value).toBe('story');
      expect((screen.getByLabelText('Executor') as HTMLInputElement).value).toBe('custom_executor');
    });
  });

  describe('Field Options', () => {
    beforeEach(() => {
      render(
        <TaskForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );
    });

    it('should have correct priority options', () => {
      const prioritySelect = screen.getByLabelText('Priority');
      const options = Array.from(prioritySelect.querySelectorAll('option'));
      const optionValues = options.map(option => option.getAttribute('value'));
      const optionTexts = options.map(option => option.textContent);

      expect(optionValues).toEqual(['low', 'medium', 'high']);
      expect(optionTexts).toEqual(['Low Priority', 'Medium Priority', 'High Priority']);
    });

    it('should have correct status options', () => {
      const statusSelect = screen.getByLabelText('Status');
      const options = Array.from(statusSelect.querySelectorAll('option'));
      const optionValues = options.map(option => option.getAttribute('value'));
      const optionTexts = options.map(option => option.textContent);

      expect(optionValues).toEqual(['pending', 'in_progress', 'completed']);
      expect(optionTexts).toEqual(['Pending', 'In Progress', 'Completed']);
    });

    it('should have correct task type options', () => {
      const typeSelect = screen.getByLabelText('Type');
      const options = Array.from(typeSelect.querySelectorAll('option'));
      const optionValues = options.map(option => option.getAttribute('value'));
      const optionTexts = options.map(option => option.textContent);

      expect(optionValues).toEqual(['task', 'story']);
      expect(optionTexts).toEqual(['Technical Task', 'User Story']);
    });
  });

  describe('Form Interactions', () => {
    it('should update task description when text area changes', async () => {
      const user = userEvent.setup();

      render(
        <TaskForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      const descriptionField = screen.getByLabelText('Task Description *');
      await user.type(descriptionField, 'New task description');

      expect((descriptionField as HTMLTextAreaElement).value).toBe('New task description');
    });

    it('should update priority when select changes', async () => {
      render(
        <TaskForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      const prioritySelect = screen.getByLabelText('Priority');
      fireEvent.change(prioritySelect, { target: { value: 'high' } });

      expect((prioritySelect as HTMLSelectElement).value).toBe('high');
    });

    it('should update status when select changes', async () => {
      render(
        <TaskForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      const statusSelect = screen.getByLabelText('Status');
      fireEvent.change(statusSelect, { target: { value: 'completed' } });

      expect((statusSelect as HTMLSelectElement).value).toBe('completed');
    });

    it('should update task type when select changes', async () => {
      render(
        <TaskForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      const typeSelect = screen.getByLabelText('Type');
      fireEvent.change(typeSelect, { target: { value: 'story' } });

      expect((typeSelect as HTMLSelectElement).value).toBe('story');
    });

    it('should update executor when input changes', async () => {
      const user = userEvent.setup();

      render(
        <TaskForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      const executorInput = screen.getByLabelText('Executor');
      await user.clear(executorInput);
      await user.type(executorInput, 'new_executor');

      expect((executorInput as HTMLInputElement).value).toBe('new_executor');
    });
  });

  describe('Form Submission', () => {
    it('should call onSave with correct data when creating new task', async () => {
      const user = userEvent.setup();

      render(
        <TaskForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      // Fill out form
      await user.type(screen.getByLabelText('Task Description *'), 'Test task content');
      fireEvent.change(screen.getByLabelText('Priority'), { target: { value: 'high' } });
      fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'in_progress' } });
      fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'story' } });
      await user.clear(screen.getByLabelText('Executor'));
      await user.type(screen.getByLabelText('Executor'), 'test_executor');

      // Submit form
      const submitButton = screen.getByRole('button', { name: 'Create Task' });
      await user.click(submitButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        content: 'Test task content',
        priority: 'high',
        status: 'in_progress',
        taskType: 'story',
        executorId: 'test_executor',
      });
    });

    it('should call onSave with correct data when updating existing task', async () => {
      const user = userEvent.setup();

      render(
        <TaskForm task={mockTask} onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      // Modify description
      const descriptionField = screen.getByLabelText('Task Description *');
      await user.clear(descriptionField);
      await user.type(descriptionField, 'Updated task content');

      // Submit form
      const submitButton = screen.getByRole('button', { name: 'Update Task' });
      await user.click(submitButton);

      expect(mockOnSave).toHaveBeenCalledWith({
        content: 'Updated task content',
        priority: 'high',
        status: 'in_progress',
        taskType: 'story',
        executorId: 'custom_executor',
        id: 'task-123',
        startTime: '2024-01-01T10:00:00Z',
        endTime: null,
        duration: null,
        bddScenarios: [],
      });
    });

    it('should not submit when task description is empty', async () => {
      const user = userEvent.setup();

      render(
        <TaskForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      // Try to submit with empty description
      const submitButton = screen.getByRole('button', { name: 'Create Task' });
      await user.click(submitButton);

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should not submit when task description is only whitespace', async () => {
      const user = userEvent.setup();

      render(
        <TaskForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      // Fill with whitespace only
      await user.type(screen.getByLabelText('Task Description *'), '   ');

      // Try to submit
      const submitButton = screen.getByRole('button', { name: 'Create Task' });
      await user.click(submitButton);

      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should trim whitespace from task description when submitting', async () => {
      const user = userEvent.setup();

      render(
        <TaskForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      // Fill with content that has leading/trailing whitespace
      await user.type(screen.getByLabelText('Task Description *'), '  Test task content  ');

      // Submit form
      const submitButton = screen.getByRole('button', { name: 'Create Task' });
      await user.click(submitButton);

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Test task content',
        })
      );
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TaskForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should not call onSave when cancel is clicked', async () => {
      const user = userEvent.setup();

      render(
        <TaskForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      // Fill out form
      await user.type(screen.getByLabelText('Task Description *'), 'Some content');

      // Click cancel instead of submit
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      await user.click(cancelButton);

      expect(mockOnSave).not.toHaveBeenCalled();
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Form Accessibility', () => {
    it('should have proper form labels and associations', () => {
      render(
        <TaskForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      // Check that labels are properly associated with inputs
      const descriptionField = screen.getByLabelText('Task Description *');
      expect(descriptionField).toHaveAttribute('id', 'task-content');

      const priorityField = screen.getByLabelText('Priority');
      const statusField = screen.getByLabelText('Status');
      const typeField = screen.getByLabelText('Type');
      const executorField = screen.getByLabelText('Executor');

      expect(descriptionField).toBeInTheDocument();
      expect(priorityField).toBeInTheDocument();
      expect(statusField).toBeInTheDocument();
      expect(typeField).toBeInTheDocument();
      expect(executorField).toBeInTheDocument();
    });

    it('should have required attribute on description field', () => {
      render(
        <TaskForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      const descriptionField = screen.getByLabelText('Task Description *');
      expect(descriptionField).toHaveAttribute('required');
    });

    it('should have proper placeholder text', () => {
      render(
        <TaskForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      const descriptionField = screen.getByPlaceholderText('Describe what needs to be accomplished...');
      const executorField = screen.getByPlaceholderText('claude_code');

      expect(descriptionField).toBeInTheDocument();
      expect(executorField).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle task with partial data', () => {
      const partialTask: Partial<Task> = {
        id: 'partial-task',
        content: 'Partial content',
        priority: 'low',
        // Missing other fields
      };

      render(
        <TaskForm task={partialTask as Task} onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      expect((screen.getByLabelText('Task Description *') as HTMLTextAreaElement).value).toBe('Partial content');
      expect((screen.getByLabelText('Priority') as HTMLSelectElement).value).toBe('low');
      // Should use defaults for missing fields
      expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('pending');
      expect((screen.getByLabelText('Type') as HTMLSelectElement).value).toBe('task');
      expect((screen.getByLabelText('Executor') as HTMLInputElement).value).toBe('claude_code');
    });

    it('should handle rapid form changes', async () => {
      const user = userEvent.setup();

      render(
        <TaskForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      const descriptionField = screen.getByLabelText('Task Description *');
      const prioritySelect = screen.getByLabelText('Priority');

      // Rapid changes
      await user.type(descriptionField, 'Test');
      fireEvent.change(prioritySelect, { target: { value: 'high' } });
      fireEvent.change(prioritySelect, { target: { value: 'low' } });
      await user.type(descriptionField, ' content');

      expect((descriptionField as HTMLTextAreaElement).value).toBe('Test content');
      expect((prioritySelect as HTMLSelectElement).value).toBe('low');
    });

    it('should handle task with empty string values', () => {
      const emptyTask: Task = {
        id: 'empty-task',
        content: '',
        priority: 'medium',
        status: 'pending',
        taskType: 'task',
        executorId: '',
        startTime: '2024-01-01T10:00:00Z',
        endTime: null,
        duration: null,
        bddScenarios: [],
      };

      render(
        <TaskForm task={emptyTask} onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      expect((screen.getByLabelText('Task Description *') as HTMLTextAreaElement).value).toBe('');
      // When editing a task with empty executorId, the form shows the default value (claude_code)
      expect((screen.getByLabelText('Executor') as HTMLInputElement).value).toBe('claude_code');
    });
  });

  describe('Form State Management', () => {
    it('should maintain independent field states', async () => {
      const user = userEvent.setup();

      render(
        <TaskForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      // Change multiple fields
      await user.type(screen.getByLabelText('Task Description *'), 'Description');
      fireEvent.change(screen.getByLabelText('Priority'), { target: { value: 'high' } });
      fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'completed' } });
      fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'story' } });
      await user.clear(screen.getByLabelText('Executor'));
      await user.type(screen.getByLabelText('Executor'), 'test_exe');

      // Verify all fields maintained their states
      expect((screen.getByLabelText('Task Description *') as HTMLTextAreaElement).value).toBe('Description');
      expect((screen.getByLabelText('Priority') as HTMLSelectElement).value).toBe('high');
      expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('completed');
      expect((screen.getByLabelText('Type') as HTMLSelectElement).value).toBe('story');
      expect((screen.getByLabelText('Executor') as HTMLInputElement).value).toBe('test_exe');
    });

    it('should properly handle form submission with form event', async () => {
      const user = userEvent.setup();

      render(
        <TaskForm onSave={mockOnSave} onCancel={mockOnCancel} />
      );

      await user.type(screen.getByLabelText('Task Description *'), 'Test content');

      // Submit using form submit event - find form element directly
      const form = screen.getByTestId('card-content').querySelector('form');
      expect(form).toBeTruthy();
      fireEvent.submit(form!);

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          content: 'Test content',
        })
      );
    });
  });
});