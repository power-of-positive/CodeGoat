import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { tasksApi, projectsApi } from '../lib/api';
import { Loader } from '../components/ui/loader';
import TaskDetailsHeader from '../components/tasks/TaskDetailsHeader';
import { TaskFollowUpSection } from '../components/tasks/TaskFollowUpSection';
import { EditorSelectionDialog } from '../components/tasks/EditorSelectionDialog';
import DiffTab from '../components/tasks/TaskDetails/DiffTab';
import LogsTab from '../components/tasks/TaskDetails/LogsTab';
import ProcessesTab from '../components/tasks/TaskDetails/ProcessesTab';
import DeleteFileConfirmationDialog from '../components/tasks/DeleteFileConfirmationDialog';
import TabNavigation from '../components/tasks/TaskDetails/TabNavigation';
import TaskDetailsProvider from '../components/context/TaskDetailsContextProvider';
import type { TaskWithAttemptStatus, Project } from 'shared/types';
import type { TabType } from '../components/types/tabs';

export function TaskDetailPage() {
  const { projectId, taskId } = useParams<{
    projectId: string;
    taskId: string;
  }>();
  const navigate = useNavigate();
  
  const [task, setTask] = useState<TaskWithAttemptStatus | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditorDialog, setShowEditorDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('logs');

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId || !taskId) return;

      try {
        setLoading(true);
        const [taskResult, projectResult] = await Promise.all([
          tasksApi.getById(taskId),
          projectsApi.getById(projectId)
        ]);
        
        setTask(taskResult);
        setProject(projectResult);
        setActiveTab('logs'); // Reset to logs tab when task changes
      } catch (err) {
        console.error('Failed to fetch task details:', err);
        setError('Failed to load task details');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, taskId]);

  const handleGoBack = () => {
    navigate(`/projects/${projectId}/tasks`);
  };

  const handleEditTask = (task: TaskWithAttemptStatus) => {
    // Navigate back to tasks view and trigger edit dialog
    navigate(`/projects/${projectId}/tasks`, { 
      state: { editTask: task } 
    });
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      await tasksApi.delete(taskId);
      navigate(`/projects/${projectId}/tasks`);
    } catch (error) {
      console.error('Failed to delete task:', error);
      setError('Failed to delete task');
    }
  };

  if (loading) {
    return <Loader message="Loading task details..." size={32} className="py-8" />;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={handleGoBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tasks
            </Button>
            <Button onClick={() => window.location.reload()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Task not found</p>
          <Button variant="outline" onClick={handleGoBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tasks
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header with Back Button */}
      <div className="mb-6">
        <Button variant="outline" onClick={handleGoBack} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to {project?.name || 'Project'} Tasks
        </Button>
      </div>

      {/* Task Details Content */}
      <TaskDetailsProvider
        key={task.id}
        task={task}
        projectId={projectId!}
        setShowEditorDialog={setShowEditorDialog}
        projectHasDevScript={!!project?.dev_script}
      >
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
          <div className="flex flex-col h-[calc(100vh-200px)]">
            <TaskDetailsHeader
              onClose={handleGoBack}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
            />

            <TabNavigation
              activeTab={activeTab}
              setActiveTab={setActiveTab}
            />

            {/* Tab Content */}
            <div className="flex-1 flex flex-col min-h-0">
              {activeTab === 'diffs' ? (
                <DiffTab />
              ) : activeTab === 'processes' ? (
                <ProcessesTab />
              ) : (
                <LogsTab />
              )}
            </div>

            <TaskFollowUpSection />
          </div>
        </div>

        <EditorSelectionDialog
          isOpen={showEditorDialog}
          onClose={() => setShowEditorDialog(false)}
        />

        <DeleteFileConfirmationDialog />
      </TaskDetailsProvider>
    </div>
  );
}