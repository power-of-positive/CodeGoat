import React, { useState } from 'react';
import { Edit, Plus } from 'lucide-react';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Task } from '../../../shared/types/index';

interface TaskFormProps {
  task?: Task;
  onSave: (task: Omit<Task, 'id'> | Task) => void;
  onCancel: () => void;
}

// Custom hook for form state
function useTaskFormState(task?: Task) {
  const [content, setContent] = useState(task?.content || '');
  const [priority, setPriority] = useState<Task['priority']>(task?.priority || 'medium');
  const [status, setStatus] = useState<Task['status']>(task?.status || 'pending');
  const [taskType, setTaskType] = useState<Task['taskType']>(task?.taskType || 'task');
  const [executorId, setExecutorId] = useState(task?.executorId || 'claude_code');

  return {
    content, setContent,
    priority, 
    setPriority: (value: string) => setPriority(value as Task['priority']),
    status, 
    setStatus: (value: string) => setStatus(value as Task['status']),
    taskType, 
    setTaskType: (value: string) => setTaskType(value as Task['taskType']),
    executorId, setExecutorId,
  };
}

// Build task data for submission
function buildTaskData(
  formState: ReturnType<typeof useTaskFormState>,
  task?: Task
) {
  const { content, priority, status, taskType, executorId } = formState;
  
  return {
    content: content.trim(),
    priority,
    status,
    taskType,
    executorId,
    ...(task && {
      id: task.id,
      startTime: task.startTime,
      endTime: task.endTime,
      duration: task.duration,
      bddScenarios: task.bddScenarios,
    }),
  };
}

// Form header component
function TaskFormHeader({ task }: { task?: Task }) {
  return (
    <CardHeader>
      <CardTitle className="text-lg flex items-center gap-2">
        {task ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        {task ? 'Edit Task' : 'Create New Task'}
      </CardTitle>
    </CardHeader>
  );
}

// Task description field component
function TaskDescriptionField({ content, onChange }: {
  content: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor="task-content" className="block text-sm font-medium text-gray-700 mb-2">
        Task Description *
      </label>
      <textarea
        id="task-content"
        value={content}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-md text-sm resize-vertical"
        rows={4}
        placeholder="Describe what needs to be accomplished..."
        required
      />
    </div>
  );
}

// Select field component
function SelectField({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded-md text-sm"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Input field component
function InputField({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded-md text-sm"
        placeholder={placeholder}
      />
    </div>
  );
}

// Form fields grid component
function TaskFormFields({ formState }: {
  formState: ReturnType<typeof useTaskFormState>;
}) {
  const { priority, setPriority, status, setStatus, taskType, setTaskType, executorId, setExecutorId } = formState;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <SelectField
        label="Priority"
        value={priority}
        onChange={setPriority}
        options={[
          { value: 'low', label: 'Low Priority' },
          { value: 'medium', label: 'Medium Priority' },
          { value: 'high', label: 'High Priority' },
        ]}
      />
      <SelectField
        label="Status"
        value={status}
        onChange={setStatus}
        options={[
          { value: 'pending', label: 'Pending' },
          { value: 'in_progress', label: 'In Progress' },
          { value: 'completed', label: 'Completed' },
        ]}
      />
      <SelectField
        label="Type"
        value={taskType}
        onChange={setTaskType}
        options={[
          { value: 'task', label: 'Technical Task' },
          { value: 'story', label: 'User Story' },
        ]}
      />
      <InputField
        label="Executor"
        value={executorId}
        onChange={setExecutorId}
        placeholder="claude_code"
      />
    </div>
  );
}

// Form actions component
function TaskFormActions({ task, onCancel }: {
  task?: Task;
  onCancel: () => void;
}) {
  return (
    <div className="flex gap-3">
      <Button type="submit" size="sm">
        {task ? 'Update Task' : 'Create Task'}
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

export function TaskForm({ task, onSave, onCancel }: TaskFormProps) {
  const formState = useTaskFormState(task);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.content.trim()) {
      return;
    }

    const taskData = buildTaskData(formState, task);
    onSave(taskData);
  };

  return (
    <Card className="mb-6">
      <TaskFormHeader task={task} />
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <TaskDescriptionField 
            content={formState.content} 
            onChange={formState.setContent} 
          />
          <TaskFormFields formState={formState} />
          <TaskFormActions task={task} onCancel={onCancel} />
        </form>
      </CardContent>
    </Card>
  );
}