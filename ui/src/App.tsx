import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from './components/Analytics';
import { Settings } from './components/Settings';
import { ValidationRunDetail } from './components/ValidationRunDetail';
import { TaskBoard } from './components/TaskBoard';
import { TaskDetail } from './components/TaskDetail';
import { PermissionEditor } from './components/PermissionEditor';
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