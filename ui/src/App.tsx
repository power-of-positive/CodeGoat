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
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/analytics" replace />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/stage-history" element={<StageHistoryDashboard />} />
            <Route path="/tasks" element={<TaskBoard />} />
            <Route path="/task-management" element={<TaskManagement />} />
            <Route path="/tasks/:taskId" element={<TaskDetail />} />
            <Route path="/task-analytics" element={<TaskAnalytics />} />
            <Route path="/bdd-tests" element={<BDDTestsDashboard />} />
            <Route path="/workers" element={<WorkersDashboard />} />
            <Route path="/workers/:workerId" element={<WorkerDetail />} />
            <Route path="/permissions" element={<PermissionEditor />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/stage-management" element={<StageManagement />} />
            <Route path="/validation-run/:runId" element={<ValidationRunDetail />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
