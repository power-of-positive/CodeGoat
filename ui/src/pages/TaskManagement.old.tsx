/* eslint-disable max-lines, max-lines-per-function, complexity, max-statements */
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Plus,
  Edit,
  Trash2,
  SortAsc,
  SortDesc,
  Table,
  Grid3x3,
  Clock,
  AlertCircle,
  CheckCircle,
  Play,
  MoreVertical,
  Bot,
  User,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { Button } from '../shared/ui/button';
import { Card, CardContent } from '../shared/ui/card';
import { Badge } from '../shared/ui/badge';
import { taskApi, claudeWorkersApi } from '../shared/lib/api';
import { Task } from '../shared/types/index';
import { PageLoading } from '../shared/ui/loading';
import { TaskForm } from '../features/tasks/components/TaskForm';
import { TaskFilters as TaskFiltersComponent, TaskFiltersState as TaskFiltersType } from '../features/tasks/components/TaskFilters';

interface SortConfig {
  field: keyof Task | 'createdAt';
  direction: 'asc' | 'desc';
}

type ViewMode = 'table' | 'grid';

// Configuration constants
const priorityColors = {
  low: 'bg-gray-100 text-gray-800 border-gray-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  high: 'bg-red-100 text-red-800 border-red-300',
} as const;

const statusConfig = {
  pending: {
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    icon: AlertCircle,
    label: 'Pending',
  },
  in_progress: {
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: Play,
    label: 'In Progress',
  },
  completed: {
    color: 'bg-green-100 text-green-800 border-green-300',
    icon: CheckCircle,
    label: 'Completed',
  },
} as const;

// Task table view component
interface TaskTableProps {
  tasks: Task[];
  sortConfig: SortConfig;
  onSort: (field: keyof Task | 'createdAt') => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStartWorker: (task: Task) => void;
  selectedTasks: string[];
  onTaskSelect: (taskId: string, selected: boolean) => void;
  onSelectAll: (selected: boolean) => void;
}

function TaskTable({
  tasks,
  sortConfig,
  onSort,
  onEdit,
  onDelete,
  onStartWorker,
  selectedTasks,
  onTaskSelect,
  onSelectAll,
}: TaskTableProps) {
  const getSortIcon = (field: keyof Task | 'createdAt') => {
    if (sortConfig.field !== field) {
      return <SortAsc className="h-4 w-4 opacity-0 group-hover:opacity-50" />;
    }
    return sortConfig.direction === 'asc'
      ? <SortAsc className="h-4 w-4 text-blue-600" />
      : <SortDesc className="h-4 w-4 text-blue-600" />;
  };

  const allSelected = tasks.length > 0 && selectedTasks.length === tasks.length;
  const someSelected = selectedTasks.length > 0;

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-12 p-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate = someSelected && !allSelected;
                      }
                    }}
                    onChange={(e) => onSelectAll(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </th>
                <th
                  className="text-left p-3 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 group"
                  onClick={() => onSort('id')}
                >
                  <div className="flex items-center gap-1">
                    ID
                    {getSortIcon('id')}
                  </div>
                </th>
                <th
                  className="text-left p-3 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 group"
                  onClick={() => onSort('content')}
                >
                  <div className="flex items-center gap-1">
                    Description
                    {getSortIcon('content')}
                  </div>
                </th>
                <th
                  className="text-left p-3 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 group"
                  onClick={() => onSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    {getSortIcon('status')}
                  </div>
                </th>
                <th
                  className="text-left p-3 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 group"
                  onClick={() => onSort('priority')}
                >
                  <div className="flex items-center gap-1">
                    Priority
                    {getSortIcon('priority')}
                  </div>
                </th>
                <th className="text-left p-3 text-sm font-medium text-gray-700">
                  Type
                </th>
                <th className="text-left p-3 text-sm font-medium text-gray-700">
                  Duration
                </th>
                <th className="text-left p-3 text-sm font-medium text-gray-700">
                  Executor
                </th>
                <th className="text-right p-3 text-sm font-medium text-gray-700 w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const StatusIcon = statusConfig[task.status]?.icon || AlertCircle;
                const isSelected = selectedTasks.includes(task.id);

                return (
                  <tr
                    key={task.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onTaskSelect(task.id, e.target.checked)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="p-3">
                      <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                        {task.id}
                      </code>
                    </td>
                    <td className="p-3 max-w-sm">
                      <Link
                        to={`/tasks/${task.id}`}
                        className="text-sm text-gray-900 hover:text-blue-600 line-clamp-2"
                      >
                        {task.content}
                      </Link>
                    </td>
                    <td className="p-3">
                      <Badge className={`text-xs ${statusConfig[task.status]?.color}`}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig[task.status]?.label}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge className={`text-xs ${priorityColors[task.priority]}`}>
                        {task.priority}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          task.taskType === 'story'
                            ? 'border-blue-300 text-blue-700 bg-blue-50'
                            : 'border-gray-300 text-gray-600 bg-gray-50'
                        }`}
                      >
                        {task.taskType === 'story' ? 'Story' : 'Task'}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="text-sm text-gray-600">
                        {task.duration || (
                          <span className="text-gray-400">-</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      {task.executorId && (
                        <Badge variant="outline" className="text-xs">
                          {task.executorId}
                        </Badge>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => onEdit(task)}
                          aria-label={`edit task ${task.id}`}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => onDelete(task.id)}
                          aria-label={`delete task ${task.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        {(task.status === 'pending' || task.status === 'in_progress') && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                            onClick={() => onStartWorker(task)}
                            aria-label={`start worker for task ${task.id}`}
                          >
                            <Bot className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// Task grid view component
interface TaskGridProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onStartWorker: (task: Task) => void;
  selectedTasks: string[];
  onTaskSelect: (taskId: string, selected: boolean) => void;
}

function TaskGrid({
  tasks,
  onEdit,
  onDelete,
  onStartWorker,
  selectedTasks,
  onTaskSelect,
}: TaskGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tasks.map((task) => {
        const StatusIcon = statusConfig[task.status]?.icon || AlertCircle;
        const isSelected = selectedTasks.includes(task.id);

        return (
          <div
            key={task.id}
            className={`group hover:shadow-md transition-all cursor-pointer ${
              isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''
            }`}
            onClick={() => onTaskSelect(task.id, !isSelected)}
          >
            <Card>
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex gap-1 flex-wrap">
                  <Badge className={`text-xs ${priorityColors[task.priority]}`}>
                    {task.priority}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      task.taskType === 'story'
                        ? 'border-blue-300 text-blue-700 bg-blue-50'
                        : 'border-gray-300 text-gray-600 bg-gray-50'
                    }`}
                  >
                    {task.taskType === 'story' ? 'Story' : 'Task'}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => {
                      e.stopPropagation();
                      onTaskSelect(task.id, e.target.checked);
                    }}
                    className="rounded border-gray-300"
                  />
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="mb-3">
                <code className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                  {task.id}
                </code>
              </div>

              <Link
                to={`/tasks/${task.id}`}
                className="block mb-3 hover:bg-gray-50 -mx-1 px-1 py-1 rounded"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-sm text-gray-900 line-clamp-3">{task.content}</p>
              </Link>

              <div className="flex items-center gap-2 mb-3">
                <Badge className={`text-xs ${statusConfig[task.status]?.color}`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig[task.status]?.label}
                </Badge>
                {task.executorId && (
                  <Badge variant="outline" className="text-xs">
                    <User className="h-3 w-3 mr-1" />
                    {task.executorId}
                  </Badge>
                )}
              </div>

              {(task.duration || task.startTime) && (
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                  <Clock className="h-3 w-3" />
                  {task.duration ? (
                    <span>Duration: {task.duration}</span>
                  ) : task.startTime ? (
                    <span>Started: {new Date(task.startTime).toLocaleDateString()}</span>
                  ) : null}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex gap-1 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(task);
                  }}
                >
                  <Edit className="h-3 w-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(task.id);
                  }}
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Delete
                </Button>
                {(task.status === 'pending' || task.status === 'in_progress') && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onStartWorker(task);
                    }}
                  >
                    <Bot className="h-3 w-3 mr-1" />
                    Worker
                  </Button>
                )}
              </div>
            </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}

// Main TaskManagement component
export function TaskManagement() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [filters, setFilters] = useState<TaskFiltersType>({
    status: 'all',
    priority: 'all',
    taskType: 'all',
    dateRange: 'all',
    search: '',
    executor: '',
  });
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'id',
    direction: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);

  const queryClient = useQueryClient();

  // Fetch tasks
  const {
    data: tasks = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tasks'],
    queryFn: taskApi.getTasks,
  });

  // Handle edit query parameter
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId && tasks) {
      const taskToEdit = tasks.find(task => task.id === editId);
      if (taskToEdit) {
        setEditingTask(taskToEdit);
        // Clear the query parameter after setting the editing task
        setSearchParams(prev => {
          const newParams = new URLSearchParams(prev);
          newParams.delete('edit');
          return newParams;
        });
      }
    }
  }, [searchParams, tasks, setSearchParams]);

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: taskApi.createTask,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowCreateForm(false);
      alert(`✅ Task created successfully!\n\nTask: "${data.content}"`);
    },
    onError: (error) => {
      console.error('Failed to create task:', error);
      alert('❌ Failed to create task. Please check the console for details.');
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
      setSelectedTasks(prev => prev.filter(id => !tasks.some(task => task.id === id)));
      alert('✅ Task deleted successfully!');
    },
    onError: (error) => {
      console.error('Failed to delete task:', error);
      alert('❌ Failed to delete task. Please check the console for details.');
    },
  });

  // Start Claude worker mutation
  const startWorkerMutation = useMutation({
    mutationFn: claudeWorkersApi.startWorker,
    onSuccess: (data) => {
      // Success notification with worker details
      const message = `Started Claude Code worker!\nWorker ID: ${data.workerId}\nPID: ${data.pid}\n\nView progress in the Workers dashboard.`;
      alert(message);
    },
    onError: (error) => {
      console.error('Failed to start Claude worker:', error);
      alert('Failed to start Claude Code worker. Please check the console for details.');
    },
  });

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = [...tasks];

    // Apply filters
    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter((task) => task.status === filters.status);
    }

    if (filters.priority && filters.priority !== 'all') {
      filtered = filtered.filter((task) => task.priority === filters.priority);
    }

    if (filters.taskType && filters.taskType !== 'all') {
      filtered = filtered.filter((task) => task.taskType === filters.taskType);
    }

    if (filters.executor) {
      filtered = filtered.filter((task) =>
        task.executorId?.toLowerCase().includes(filters.executor!.toLowerCase())
      );
    }

    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.content.toLowerCase().includes(searchTerm) ||
          task.id.toLowerCase().includes(searchTerm)
      );
    }

    // Apply date range filter
    if (filters.dateRange && filters.dateRange !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let filterDate: Date;
      switch (filters.dateRange) {
        case 'today':
          filterDate = today;
          break;
        case 'week': {
          const daysInWeek = 7;
          const hoursInDay = 24;
          const minutesInHour = 60;
          const secondsInMinute = 60;
          const millisecondsInSecond = 1000;
          const weekMs = daysInWeek * hoursInDay * minutesInHour * secondsInMinute * millisecondsInSecond;
          filterDate = new Date(today.getTime() - weekMs);
          break;
        }
        case 'month': {
          const daysInMonth = 30;
          const hoursInDay = 24;
          const minutesInHour = 60;
          const secondsInMinute = 60;
          const millisecondsInSecond = 1000;
          const monthMs = daysInMonth * hoursInDay * minutesInHour * secondsInMinute * millisecondsInSecond;
          filterDate = new Date(today.getTime() - monthMs);
          break;
        }
        default:
          filterDate = new Date(0);
      }

      filtered = filtered.filter((task) => {
        const taskDate = task.startTime ? new Date(task.startTime) : new Date();
        return taskDate >= filterDate;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: unknown = a[sortConfig.field];
      let bValue: unknown = b[sortConfig.field];

      // Handle special sorting fields
      if (sortConfig.field === 'createdAt') {
        aValue = a.startTime || new Date().toISOString();
        bValue = b.startTime || new Date().toISOString();
      }

      // Convert to comparable values
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = (bValue as string)?.toLowerCase() || '';
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [tasks, filters, sortConfig]);

  // Event handlers
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

  const handleBulkDelete = () => {
    if (selectedTasks.length === 0) {
      return;
    }
    if (confirm(`Are you sure you want to delete ${selectedTasks.length} selected tasks?`)) {
      Promise.all(selectedTasks.map(id => deleteTaskMutation.mutateAsync(id)))
        .then(() => setSelectedTasks([]))
        .catch((error) => {
          console.error('Bulk delete failed:', error);
        });
    }
  };

  const handleStartWorker = (task: Task) => {
    if (
      confirm(
        `Start Claude Code worker for task: "${task.content}"?\n\nThis will spawn a new process and execute the task automatically.`
      )
    ) {
      startWorkerMutation.mutate({
        taskId: task.id,
        taskContent: task.content,
      });
    }
  };

  const handleSort = (field: keyof Task | 'createdAt') => {
    setSortConfig((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleTaskSelect = (taskId: string, selected: boolean) => {
    setSelectedTasks((prev) =>
      selected ? [...prev, taskId] : prev.filter((id) => id !== taskId)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedTasks(selected ? filteredAndSortedTasks.map((task) => task.id) : []);
  };

  if (isLoading) {
    return <PageLoading message="Loading tasks..." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load</h2>
          <p className="text-gray-600 mb-4">Could not load tasks</p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive task management with advanced filtering and CRUD operations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Task
          </Button>
        </div>
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

      {/* Filters */}
      <TaskFiltersComponent
        filters={filters}
        onFiltersChange={setFilters}
        isOpen={showFilters}
        onToggle={() => setShowFilters(!showFilters)}
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Showing {filteredAndSortedTasks.length} of {tasks.length} tasks
          </div>
          {selectedTasks.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {selectedTasks.length} selected
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete Selected
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <Table className="w-4 h-4 mr-1" />
            Table
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="w-4 h-4 mr-1" />
            Grid
          </Button>
        </div>
      </div>

      {/* Tasks Display */}
      {filteredAndSortedTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Tasks Found
              </h3>
              <p className="text-gray-600 mb-4">
                {tasks.length === 0
                  ? "You haven't created any tasks yet."
                  : 'No tasks match your current filters.'}
              </p>
              {tasks.length === 0 ? (
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Task
                </Button>
              ) : (
                <Button variant="outline" onClick={() => setFilters({
                  status: 'all',
                  priority: 'all',
                  taskType: 'all',
                  dateRange: 'all',
                  search: '',
                  executor: '',
                })}>
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <TaskTable
          tasks={filteredAndSortedTasks}
          sortConfig={sortConfig}
          onSort={handleSort}
          onEdit={setEditingTask}
          onDelete={handleDeleteTask}
          onStartWorker={handleStartWorker}
          selectedTasks={selectedTasks}
          onTaskSelect={handleTaskSelect}
          onSelectAll={handleSelectAll}
        />
      ) : (
        <TaskGrid
          tasks={filteredAndSortedTasks}
          onEdit={setEditingTask}
          onDelete={handleDeleteTask}
          onStartWorker={handleStartWorker}
          selectedTasks={selectedTasks}
          onTaskSelect={handleTaskSelect}
        />
      )}
    </div>
  );
}