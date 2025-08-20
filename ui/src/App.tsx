import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from './components/Analytics';
import { Settings } from './components/Settings';
import { ValidationRunDetail } from './components/ValidationRunDetail';
import { TaskBoard } from './components/TaskBoard';
import { TaskDetail } from './components/TaskDetail';
import { TaskAnalytics } from './components/TaskAnalytics';
import { PermissionEditor } from './components/PermissionEditor';
import BDDTestsDashboard from './pages/BDDTestsDashboard';
import { WorkersDashboard } from './pages/WorkersDashboard';
import { WorkerDetail } from './components/WorkerDetail';
import { Layout } from './components/Layout';

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
            <Route path="/tasks" element={<TaskBoard />} />
            <Route path="/tasks/:taskId" element={<TaskDetail />} />
            <Route path="/task-analytics" element={<TaskAnalytics />} />
            <Route path="/bdd-tests" element={<BDDTestsDashboard />} />
            <Route path="/workers" element={<WorkersDashboard />} />
            <Route path="/workers/:workerId" element={<WorkerDetail />} />
            <Route path="/permissions" element={<PermissionEditor />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/validation-run/:runId" element={<ValidationRunDetail />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;