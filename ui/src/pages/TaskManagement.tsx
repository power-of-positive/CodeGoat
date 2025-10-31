import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { RefreshCw, ChevronUp, ChevronDown, ArrowLeft, Filter } from 'lucide-react';
import { Card, CardContent } from '../shared/ui/card';
import { Button } from '../shared/ui/button';
import { taskApi, claudeWorkersApi } from '../shared/lib/api';
import { Task } from '../shared/types/index';
import { PageLoading } from '../shared/ui/loading';
import { TaskForm } from '../features/tasks/components/TaskForm';
import {
  TaskFilters as TaskFiltersComponent,
  TaskFiltersState as TaskFiltersType,
} from '../features/tasks/components/TaskFilters';
import { TaskTable } from '../components/TaskTable';
import { TaskGrid } from '../components/TaskGrid';
import { TaskManagementHeader } from '../components/TaskManagementHeader';

interface SortConfig {
  field: keyof Task | 'createdAt';
  direction: 'asc' | 'desc';
}

type ViewMode = 'table' | 'grid';

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
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setShowCreateForm(false);
      alert(`✅ Task created successfully!\n\nTask: "${data.content}"`);
    },
    onError: error => {
      console.error('Failed to create task:', error);
      alert('❌ Failed to create task. Please check the console for details.');
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) => taskApi.updateTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditingTask(null);
      alert('✅ Task updated successfully!');
    },
    onError: error => {
      console.error('Failed to update task:', error);
      alert('❌ Failed to update task. Please check the console for details.');
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: taskApi.deleteTask,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTasks(prev => prev.filter(id => !prev.includes(id)));
      alert('✅ Task deleted successfully!');
    },
    onError: error => {
      console.error('Failed to delete task:', error);
      alert('❌ Failed to delete task. Please check the console for details.');
    },
  });

  // Bulk delete tasks mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (taskIds: string[]) => {
      await Promise.all(taskIds.map(id => taskApi.deleteTask(id)));
      return taskIds;
    },
    onSuccess: deletedIds => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTasks(prev => prev.filter(id => !deletedIds.includes(id)));
      alert('✅ Tasks deleted successfully!');
    },
    onError: error => {
      console.error('Failed to delete tasks:', error);
      alert('❌ Failed to delete tasks. Please check the console for details.');
    },
  });

  // Filtered and sorted tasks
  const filteredAndSortedTasks = useMemo(() => {
    let filtered = [...tasks];

    // Apply filters
    if (filters.status !== 'all') {
      filtered = filtered.filter(task => task.status === filters.status);
    }
    if (filters.priority !== 'all') {
      filtered = filtered.filter(task => task.priority === filters.priority);
    }
    if (filters.taskType !== 'all') {
      filtered = filtered.filter(task => task.taskType === filters.taskType);
    }
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        task =>
          task.content.toLowerCase().includes(searchLower) ||
          task.id.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: unknown = a[sortConfig.field];
      let bVal: unknown = b[sortConfig.field];

      // Handle special fields
      if (sortConfig.field === 'createdAt') {
        aVal = new Date(a.createdAt || 0).getTime();
        bVal = new Date(b.createdAt || 0).getTime();
      }

      // Convert to comparable values
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  }, [tasks, filters, sortConfig]);

  // Event handlers
  const handleSort = (field: keyof Task | 'createdAt') => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleTaskSelect = (taskId: string, selected: boolean) => {
    setSelectedTasks(prev => {
      if (selected) {
        return [...prev, taskId];
      } else {
        return prev.filter(id => id !== taskId);
      }
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedTasks(filteredAndSortedTasks.map(task => task.id));
    } else {
      setSelectedTasks([]);
    }
  };

  const handleDeleteTask = (id: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      deleteTaskMutation.mutate(id);
    }
  };

  const handleBulkDelete = () => {
    if (selectedTasks.length === 0) {
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${selectedTasks.length} selected tasks?`)) {
      bulkDeleteMutation.mutate(selectedTasks);
    }
  };

  const handleStartWorker = async (task: Task) => {
    if (window.confirm(`Start Claude Code worker for task: "${task.content}"?`)) {
      try {
        // Type-safe API call with schema validation!
        await claudeWorkersApi.startWorker({
          taskId: task.id,
          taskContent: task.content,
          // workingDirectory is optional
        });
        queryClient.invalidateQueries({ queryKey: ['workers'] });
        alert(`✅ Started Claude Code worker!\nTask: ${task.id}\nContent: "${task.content}"`);
      } catch (error) {
        console.error('Failed to start Claude worker:', error);
        alert('❌ Failed to start Claude Code worker. Please check the console for details.');
      }
    }
  };

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="max-w-md">
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold text-red-600 mb-2">Error Loading Tasks</h2>
            <p className="text-gray-600 mb-4">Failed to load tasks. Please try again.</p>
            <Button onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <TaskManagementHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onShowCreateForm={() => setShowCreateForm(true)}
        selectedTasksCount={selectedTasks.length}
        onBulkDelete={handleBulkDelete}
        tasksCount={tasks.length}
        filteredTasksCount={filteredAndSortedTasks.length}
      />

      {/* Filters */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {showFilters && (
          <Card className="mt-4">
            <CardContent className="p-4">
              <TaskFiltersComponent
                filters={filters}
                onFiltersChange={setFilters}
                isOpen={showFilters}
                onToggle={() => setShowFilters(!showFilters)}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Tasks Display */}
      {filteredAndSortedTasks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            {tasks.length === 0 ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tasks Found</h3>
                <p className="text-gray-600 mb-4">You haven't created any tasks yet.</p>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Create Your First Task
                </button>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Tasks Found</h3>
                <p className="text-gray-600 mb-4">No tasks match your current filters.</p>
                <button
                  onClick={() => {
                    setFilters({
                      status: 'all',
                      priority: 'all',
                      taskType: 'all',
                      dateRange: 'all',
                      search: '',
                      executor: '',
                    });
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  Clear Filters
                </button>
              </>
            )}
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

      {/* Task Creation Form */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Create New Task</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowCreateForm(false)}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
            <TaskForm
              onSave={data => createTaskMutation.mutate(data)}
              onCancel={() => setShowCreateForm(false)}
            />
          </div>
        </div>
      )}

      {/* Task Edit Form */}
      {editingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Edit Task</h2>
              <Button variant="ghost" size="sm" onClick={() => setEditingTask(null)}>
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
            <TaskForm
              task={editingTask}
              onSave={data => updateTaskMutation.mutate({ id: editingTask.id, data })}
              onCancel={() => setEditingTask(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
