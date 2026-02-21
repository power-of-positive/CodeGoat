import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from './features/analytics/components/Analytics';
import { StageHistoryDashboard } from './features/analytics/components/StageHistoryDashboard';
import { Settings } from './shared/components/Settings';
import { ValidationRunDetail } from './features/validation/components/ValidationRunDetail';
import { TaskBoard } from './features/tasks/components/TaskBoard';
import { TaskDetail } from './features/tasks/components/TaskDetail';
import { TaskAnalytics } from './features/tasks/components/TaskAnalytics';
import { TaskManagement } from './pages/TaskManagement';
import { PermissionEditor } from './features/permissions/components/PermissionEditor';
import BDDTestsDashboard from './pages/BDDTestsDashboard';
import { WorkersDashboard } from './pages/WorkersDashboard';
import { WorkerDetail } from './features/workers/components/WorkerDetail';
import StageManagement from './pages/StageManagement';
import { Layout } from './shared/components/Layout';
import { ErrorBoundary } from './shared/components/ErrorBoundary';
import { SidebarProvider } from './shared/contexts/SidebarContext';

// Query client configuration constants
const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const QUERY_STALE_TIME_MINUTES = 5;
const QUERY_TIMEOUT_SECONDS = 10; // 10 seconds timeout for failed requests
const QUERY_RETRY_COUNT = 1; // Only retry once (2 attempts total)
const QUERY_RETRY_DELAY_MS = 500; // Short delay between retries

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: MILLISECONDS_PER_SECOND * SECONDS_PER_MINUTE * QUERY_STALE_TIME_MINUTES, // 5 minutes
      refetchOnWindowFocus: false,
      retry: QUERY_RETRY_COUNT, // Fail faster with fewer retries
      retryDelay: QUERY_RETRY_DELAY_MS, // Shorter retry delay
      networkMode: 'online', // Don't retry when offline
      // Timeout for queries that hang
      gcTime: MILLISECONDS_PER_SECOND * SECONDS_PER_MINUTE * 5, // 5 minutes garbage collection
    },
    mutations: {
      retry: false, // Don't retry mutations to avoid duplicate operations
      networkMode: 'online',
    },
  },
});

function App(): React.JSX.Element {
  return (
    <ErrorBoundary
      fallbackTitle="Application Error"
      fallbackDescription="The application encountered an unexpected error. Please refresh the page to continue."
    >
      <QueryClientProvider client={queryClient}>
        <SidebarProvider>
          <BrowserRouter>
            <Layout>
            <Routes>
              <Route path="/" element={<Navigate to="/analytics" replace />} />
              <Route
                path="/analytics"
                element={
                  <ErrorBoundary
                    fallbackTitle="Analytics Error"
                    fallbackDescription="Unable to load the analytics page. This might be due to a data loading issue."
                  >
                    <Analytics />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/stage-history"
                element={
                  <ErrorBoundary
                    fallbackTitle="Stage History Error"
                    fallbackDescription="Unable to load the stage history dashboard."
                  >
                    <StageHistoryDashboard />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/kanban"
                element={
                  <ErrorBoundary
                    fallbackTitle="Task Board Error"
                    fallbackDescription="Unable to load the task board."
                  >
                    <TaskBoard />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/tasks"
                element={
                  <ErrorBoundary
                    fallbackTitle="Task Management Error"
                    fallbackDescription="Unable to load the task management page."
                  >
                    <TaskManagement />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/tasks/:taskId"
                element={
                  <ErrorBoundary
                    fallbackTitle="Task Detail Error"
                    fallbackDescription="Unable to load the task details."
                  >
                    <TaskDetail />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/task-analytics"
                element={
                  <ErrorBoundary
                    fallbackTitle="Task Analytics Error"
                    fallbackDescription="Unable to load the task analytics page."
                  >
                    <TaskAnalytics />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/bdd-tests"
                element={
                  <ErrorBoundary
                    fallbackTitle="BDD Tests Error"
                    fallbackDescription="Unable to load the BDD tests dashboard."
                  >
                    <BDDTestsDashboard />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/workers"
                element={
                  <ErrorBoundary
                    fallbackTitle="Workers Dashboard Error"
                    fallbackDescription="Unable to load the workers dashboard."
                  >
                    <WorkersDashboard />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/workers/:workerId"
                element={
                  <ErrorBoundary
                    fallbackTitle="Worker Detail Error"
                    fallbackDescription="Unable to load the worker details."
                  >
                    <WorkerDetail />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/permissions"
                element={
                  <ErrorBoundary
                    fallbackTitle="Permissions Error"
                    fallbackDescription="Unable to load the permissions editor."
                  >
                    <PermissionEditor />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/settings"
                element={
                  <ErrorBoundary
                    fallbackTitle="Settings Error"
                    fallbackDescription="Unable to load the settings page."
                  >
                    <Settings />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/stage-management"
                element={
                  <ErrorBoundary
                    fallbackTitle="Stage Management Error"
                    fallbackDescription="Unable to load the stage management page."
                  >
                    <StageManagement />
                  </ErrorBoundary>
                }
              />
              <Route
                path="/validation-run/:runId"
                element={
                  <ErrorBoundary
                    fallbackTitle="Validation Run Error"
                    fallbackDescription="Unable to load the validation run details."
                  >
                    <ValidationRunDetail />
                  </ErrorBoundary>
                }
              />
            </Routes>
          </Layout>
        </BrowserRouter>
        </SidebarProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
