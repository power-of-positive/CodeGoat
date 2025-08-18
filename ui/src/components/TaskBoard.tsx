import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  Play,
  MoreVertical,
  ExternalLink
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { taskApi } from '../lib/api';
import { Task } from '../../shared/types';

// Priority colors
const priorityColors = {
  low: 'bg-gray-100 text-gray-800 border-gray-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  high: 'bg-red-100 text-red-800 border-red-300'
} as const;

// Status column configuration
const statusColumns = [
  {
    status: 'pending' as const,
    title: 'Pending',
    icon: AlertCircle,
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  },
  {
    status: 'in_progress' as const,
    title: 'In Progress',
    icon: Play,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  {
    status: 'completed' as const,
    title: 'Completed',
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  }
];

// Task creation/edit form
interface TaskFormProps {
  task?: Task;
  onSave: (task: Omit<Task, 'id'> | Task) => void;
  onCancel: () => void;
}

function TaskForm({ task, onSave, onCancel }: TaskFormProps) {
  const [content, setContent] = useState(task?.content || '');
  const [priority, setPriority] = useState<Task['priority']>(task?.priority || 'medium');
  const [status, setStatus] = useState<Task['status']>(task?.status || 'pending');
  const [taskType, setTaskType] = useState<Task['taskType']>(task?.taskType || 'task');
  const [executorId, setExecutorId] = useState(task?.executorId || 'claude_code');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    const taskData = {
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
        bddScenarios: task.bddScenarios
      })
    };

    onSave(taskData);
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm">
          {task ? 'Edit Task' : 'Create New Task'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
              rows={3}
              placeholder="Describe the task..."
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Task['priority'])}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Task['status'])}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Type
              </label>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value as Task['taskType'])}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="task">Technical Task</option>
                <option value="story">User Story</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Executor
              </label>
              <input
                type="text"
                value={executorId}
                onChange={(e) => setExecutorId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                placeholder="claude_code"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button type="submit" size="sm">
              {task ? 'Update' : 'Create'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Individual task card
interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Task['status']) => void;
}

function TaskCard({ task, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  const [showActions, setShowActions] = useState(false);

  const formatDuration = (duration?: string) => {
    if (!duration) return null;
    return duration;
  };

  const handleStatusChange = (newStatus: Task['status']) => {
    if (newStatus !== task.status) {
      onStatusChange(task.id, newStatus);
    }
  };

  return (
    <Card className="mb-3 group hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="flex gap-1 flex-wrap">
            <Badge className={`text-xs ${priorityColors[task.priority]}`}>
              {task.priority}
            </Badge>
            <Badge 
              variant="outline" 
              className={`text-xs ${task.taskType === 'story' ? 'border-blue-300 text-blue-700 bg-blue-50' : 'border-gray-300 text-gray-600 bg-gray-50'}`}
            >
              {task.taskType === 'story' ? 'Story' : 'Task'}
            </Badge>
          </div>
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => setShowActions(!showActions)}
            >
              <MoreVertical className="h-3 w-3" />
            </Button>
            {showActions && (
              <div className="absolute right-0 top-7 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-32">
                <div className="p-1">
                  <Link
                    to={`/tasks/${task.id}`}
                    onClick={() => setShowActions(false)}
                    className="flex items-center gap-2 w-full px-2 py-1 text-sm hover:bg-gray-100 rounded"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Details
                  </Link>
                  <button
                    onClick={() => {
                      onEdit(task);
                      setShowActions(false);
                    }}
                    className="flex items-center gap-2 w-full px-2 py-1 text-sm hover:bg-gray-100 rounded"
                  >
                    <Edit className="h-3 w-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      onDelete(task.id);
                      setShowActions(false);
                    }}
                    className="flex items-center gap-2 w-full px-2 py-1 text-sm hover:bg-gray-100 rounded text-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <Link 
          to={`/tasks/${task.id}`}
          className="block mb-3 hover:bg-gray-50 -mx-1 px-1 py-1 rounded"
        >
          <p className="text-sm text-gray-900 line-clamp-3">
            {task.content}
          </p>
        </Link>
        
        {task.executorId && (
          <div className="mb-2">
            <Badge variant="outline" className="text-xs bg-purple-50 border-purple-300 text-purple-700">
              👤 {task.executorId}
            </Badge>
          </div>
        )}
        
        {(task.duration || task.startTime) && (
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Clock className="h-3 w-3" />
            {task.duration ? (
              <span>Duration: {formatDuration(task.duration)}</span>
            ) : task.startTime ? (
              <span>Started: {new Date(task.startTime).toLocaleDateString()}</span>
            ) : null}
          </div>
        )}
        
        {/* Status change buttons */}
        <div className="flex gap-1">
          {task.status !== 'pending' && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs"
              onClick={() => handleStatusChange('pending')}
            >
              To Pending
            </Button>
          )}
          {task.status !== 'in_progress' && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs"
              onClick={() => handleStatusChange('in_progress')}
            >
              Start
            </Button>
          )}
          {task.status !== 'completed' && (
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-xs"
              onClick={() => handleStatusChange('completed')}
            >
              Complete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Status column component
interface StatusColumnProps {
  column: typeof statusColumns[0];
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, status: Task['status']) => void;
}

function StatusColumn({ column, tasks, onEdit, onDelete, onStatusChange }: StatusColumnProps) {
  const Icon = column.icon;
  
  return (
    <div className={`flex-1 min-w-80 ${column.bgColor} border ${column.borderColor} rounded-lg`}>
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-gray-600" />
          <h3 className="font-medium text-gray-900">{column.title}</h3>
          <Badge variant="secondary" className="ml-auto">
            {tasks.length}
          </Badge>
        </div>
      </div>
      
      <div className="p-4 max-h-96 overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8">
            No {column.title.toLowerCase()} tasks
          </p>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
            />
          ))
        )}
      </div>
    </div>
  );
}

// Main TaskBoard component
export function TaskBoard() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const queryClient = useQueryClient();

  // Fetch tasks
  const { data: tasks = [], isLoading, error } = useQuery({
    queryKey: ['tasks'],
    queryFn: taskApi.getTasks,
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: taskApi.createTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowCreateForm(false);
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Task> }) =>
      taskApi.updateTask(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditingTask(null);
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: taskApi.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const handleCreateTask = (taskData: Omit<Task, 'id'>) => {
    createTaskMutation.mutate(taskData);
  };

  const handleUpdateTask = (taskData: Task) => {
    const { id, ...updates } = taskData;
    updateTaskMutation.mutate({ id, updates });
  };

  const handleDeleteTask = (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(id);
    }
  };

  const handleStatusChange = (id: string, status: Task['status']) => {
    const updates: Partial<Task> = { status };
    
    // Handle timing updates
    if (status === 'in_progress') {
      updates.startTime = new Date().toISOString();
    } else if (status === 'completed') {
      updates.endTime = new Date().toISOString();
    }
    
    updateTaskMutation.mutate({ id, updates });
  };

  // Group tasks by status
  const tasksByStatus = tasks.reduce((acc, task) => {
    acc[task.status] = acc[task.status] || [];
    acc[task.status].push(task);
    return acc;
  }, {} as Record<Task['status'], Task[]>);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading tasks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load</h2>
          <p className="text-gray-600">Could not load tasks</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Task Management</h1>
          <p className="text-gray-600">Manage your tasks with a kanban-style board</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Create/Edit Form */}
      {(showCreateForm || editingTask) && (
        <TaskForm
          task={editingTask || undefined}
          onSave={editingTask ? handleUpdateTask : handleCreateTask}
          onCancel={() => {
            setShowCreateForm(false);
            setEditingTask(null);
          }}
        />
      )}

      {/* Task Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{tasks.length}</div>
            <div className="text-sm text-gray-600">Total Tasks</div>
          </CardContent>
        </Card>
        {statusColumns.map((column) => {
          const count = tasksByStatus[column.status]?.length || 0;
          return (
            <Card key={column.status}>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-600">{column.title}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Kanban Board */}
      <div className="flex gap-6 overflow-x-auto">
        {statusColumns.map((column) => (
          <StatusColumn
            key={column.status}
            column={column}
            tasks={tasksByStatus[column.status] || []}
            onEdit={setEditingTask}
            onDelete={handleDeleteTask}
            onStatusChange={handleStatusChange}
          />
        ))}
      </div>
      </div>
    </div>
  );
}