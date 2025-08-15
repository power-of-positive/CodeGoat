import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { SidebarLayout } from './components/SidebarLayout';
import { DashboardPage } from './pages/DashboardPage';
import { RequestLogsPage } from './pages/RequestLogsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ValidationRunDetailsPage } from './pages/ValidationRunDetailsPage';
import { SettingsPage } from './pages/SettingsPage';
import { Projects } from './components/pages/projects';
import { ProjectTasks } from './components/pages/project-tasks';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { UserSystemProvider } from './components/config-provider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <UserSystemProvider>
        <BrowserRouter>
          <SidebarLayout>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/logs" element={<RequestLogsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/analytics/sessions/:sessionId" element={<ValidationRunDetailsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/:projectId" element={<Projects />} />
              <Route path="/projects/:projectId/tasks" element={<ProjectTasks />} />
              <Route path="/projects/:projectId/tasks/:taskId" element={<TaskDetailPage />} />
            </Routes>
          </SidebarLayout>
        </BrowserRouter>
      </UserSystemProvider>
    </QueryClientProvider>
  );
}

export default App;