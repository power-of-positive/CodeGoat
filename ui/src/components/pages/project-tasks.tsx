import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/Input';
import { FolderOpen, Plus, Settings } from 'lucide-react';
import { Loader } from '../ui/loader';
import { projectsApi, tasksApi } from '../../lib/api';
import { TaskFormDialog } from '../tasks/TaskFormDialog';
import { ProjectForm } from '../projects/project-form';
import { useKeyboardShortcuts } from '../../lib/keyboard-shortcuts';

import TaskKanbanBoard from '../tasks/TaskKanbanBoard';
import type {
  TaskStatus,
  TaskWithAttemptStatus,
  Project,
} from 'shared/types';
import type { CreateTask } from 'shared/types';
import type { DragEndEvent } from '../ui/shadcn-io/kanban';

type Task = TaskWithAttemptStatus;

export function ProjectTasks() {
  const { projectId } = useParams<{
    projectId: string;
  }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Define task creation handler
  const handleCreateNewTask = useCallback(() => {
    setEditingTask(null);
    setIsTaskDialogOpen(true);
  }, []);


  const handleOpenInIDE = useCallback(async () => {
    if (!projectId) return;

    try {
      await projectsApi.openEditor(projectId);
    } catch (error) {
      console.error('Failed to open project in IDE:', error);
      setError('Failed to open project in IDE');
    }
  }, [projectId]);

  const fetchProject = useCallback(async () => {
    try {
      const result = await projectsApi.getById(projectId!);
      setProject(result);
    } catch (err) {
      setError('Failed to load project');
    }
  }, [projectId]);

  const fetchTasks = useCallback(
    async (skipLoading = false) => {
      try {
        if (!skipLoading) {
          setLoading(true);
        }
        const result = await tasksApi.getAll(projectId!);
        const newTasks = result.data || result;
        setTasks(newTasks);
      } catch (err) {
        setError('Failed to load tasks');
      } finally {
        if (!skipLoading) {
          setLoading(false);
        }
      }
    },
    [projectId]
  );

  const handleCreateTask = useCallback(
    async (title: string, description: string) => {
      try {
        const createdTask = await tasksApi.create({
          project_id: projectId!,
          title,
          description: description || undefined,
        });
        await fetchTasks();
        // Navigate to the task detail page
        navigate(`/projects/${projectId}/tasks/${createdTask.id}`);
      } catch (err) {
        setError('Failed to create task');
      }
    },
    [projectId, fetchTasks, navigate]
  );

  const handleCreateAndStartTask = useCallback(
    async (title: string, description: string) => {
      try {
        const payload: CreateTask = {
          project_id: projectId!,
          title,
          description: description || undefined,
        };
        const result = await tasksApi.createAndStart(payload);
        await fetchTasks();
        // Navigate to the task detail page
        navigate(`/projects/${projectId}/tasks/${result.id}`);
      } catch (err) {
        setError('Failed to create and start task');
      }
    },
    [projectId, fetchTasks, navigate]
  );

  const handleUpdateTask = useCallback(
    async (title: string, description: string, status: TaskStatus) => {
      if (!editingTask) return;

      try {
        await tasksApi.update(editingTask.id, {
          title,
          description: description || undefined,
          status,
        }, projectId);
        await fetchTasks();
        setEditingTask(null);
      } catch (err) {
        setError('Failed to update task');
      }
    },
    [projectId, editingTask, fetchTasks]
  );

  const handleDeleteTask = useCallback(
    async (taskId: string) => {
      if (!confirm('Are you sure you want to delete this task?')) return;

      try {
        await tasksApi.delete(taskId);
        await fetchTasks();
      } catch (error) {
        setError('Failed to delete task');
      }
    },
    [projectId, fetchTasks]
  );

  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    setIsTaskDialogOpen(true);
  }, []);

  const handleViewTaskDetails = useCallback(
    (task: Task) => {
      // Navigate to the task detail page
      navigate(`/projects/${projectId}/tasks/${task.id}`);
    },
    [projectId, navigate]
  );

  const handleProjectSettingsSuccess = useCallback(() => {
    setIsProjectSettingsOpen(false);
    fetchProject(); // Refresh project data after settings change
  }, [fetchProject]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;

      if (!over || !active.data.current) return;

      const taskId = active.id as string;
      const newStatus = over.id as Task['status'];
      const task = tasks.find((t) => t.id === taskId);

      if (!task || task.status === newStatus) return;

      // Optimistically update the UI immediately
      const previousStatus = task.status;
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );

      try {
        const updateData: any = {
          title: task.title,
          description: task.description,
          status: newStatus,
        };
        
        // Only include parent_task_attempt if it has a valid value
        if (task.parent_task_attempt) {
          updateData.parent_task_attempt = task.parent_task_attempt;
        }
        
        await tasksApi.update(taskId, updateData, projectId);
      } catch (err) {
        // Revert the optimistic update if the API call failed
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, status: previousStatus } : t
          )
        );
        console.error('Failed to update task status:', err);
        setError('Failed to update task status. Please try again.');
      }
    },
    [projectId, tasks]
  );

  // Setup keyboard shortcuts
  useKeyboardShortcuts({
    navigate,
    currentPath: `/projects/${projectId}/tasks`,
    hasOpenDialog: isTaskDialogOpen || isProjectSettingsOpen,
    closeDialog: () => setIsTaskDialogOpen(false),
    onC: handleCreateNewTask,
  });

  // Initialize data when projectId changes
  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchTasks();

      // Set up polling to refresh tasks every 5 seconds
      const interval = setInterval(() => {
        fetchTasks(true); // Skip loading spinner for polling
      }, 2000);

      // Cleanup interval on unmount
      return () => clearInterval(interval);
    }
  }, [projectId, fetchProject, fetchTasks]);

  // Handle edit task from location state (when navigating back from task detail page)
  useEffect(() => {
    if (location.state?.editTask) {
      setEditingTask(location.state.editTask);
      setIsTaskDialogOpen(true);
      // Clear the state to prevent reopening on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  if (loading) {
    return <Loader message="Loading tasks..." size={32} className="py-8" />;
  }

  if (error) {
    return <div className="text-center py-8 text-destructive">{error}</div>;
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-row">
        <div className="w-full flex items-center gap-3">
          <h1 className="text-2xl font-bold">{project?.name || 'Project'}</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenInIDE}
            className="h-8 w-8 p-0"
            title="Open in IDE"
          >
            <FolderOpen className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsProjectSettingsOpen(true)}
            className="h-8 w-8 p-0"
            title="Project Settings"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64"
          />
          <Button onClick={handleCreateNewTask}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Tasks View */}
      {tasks.length === 0 ? (
        <div className="max-w-7xl mx-auto">
          <Card>
            <CardContent className="text-center py-8">
              <p className="text-muted-foreground">
                No tasks found for this project.
              </p>
              <Button className="mt-4" onClick={handleCreateNewTask}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Task
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[900px] max-w-[2000px] relative py-1">
            <TaskKanbanBoard
              tasks={tasks}
              searchQuery={searchQuery}
              onDragEnd={handleDragEnd}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onViewTaskDetails={handleViewTaskDetails}
              isPanelOpen={false}
            />
          </div>
        </div>
      )}

      {/* Dialogs */}
      <TaskFormDialog
        isOpen={isTaskDialogOpen}
        onOpenChange={setIsTaskDialogOpen}
        task={editingTask}
        projectId={projectId}
        onCreateTask={handleCreateTask}
        onCreateAndStartTask={handleCreateAndStartTask}
        onUpdateTask={handleUpdateTask}
      />

      <ProjectForm
        open={isProjectSettingsOpen}
        onClose={() => setIsProjectSettingsOpen(false)}
        onSuccess={handleProjectSettingsSuccess}
        project={project}
      />
    </div>
  );
}
