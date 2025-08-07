import { useQuery } from '@tanstack/react-query';
import { Server, Activity, Database, Clock } from 'lucide-react';

const API_BASE = 'http://localhost:3000/api/management';

async function getServerStatus() {
  const response = await fetch(`${API_BASE}/status`);
  if (!response.ok) {
    throw new Error('Failed to fetch server status');
  }
  return response.json();
}

export function ServerStatus() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['status'],
    queryFn: getServerStatus,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-slate-900 mb-4 flex items-center gap-2">
          <Server className="h-5 w-5" />
          Server Status
        </h2>
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-slate-900 mb-4 flex items-center gap-2">
          <Server className="h-5 w-5" />
          Server Status
        </h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
            <span className="text-sm text-red-600">Error</span>
          </div>
          <div className="text-sm text-slate-600">
            Failed to connect to server
          </div>
        </div>
      </div>
    );
  }

  const status = data || {};
  const isHealthy = status.status === 'healthy';

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-slate-900 mb-4 flex items-center gap-2">
        <Server className="h-5 w-5" />
        Server Status
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="flex items-center space-x-3">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              isHealthy ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            <span className={`text-sm font-medium ${
              isHealthy ? 'text-green-700' : 'text-red-700'
            }`}>
              {isHealthy ? 'Healthy' : 'Error'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-slate-400" />
          <div className="text-sm text-slate-600">
            Uptime: <span className="font-medium">{status.uptimeFormatted || 'Unknown'}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Database className="h-4 w-4 text-slate-400" />
          <div className="text-sm text-slate-600">
            Models: <span className="font-medium">{status.modelsCount || 0}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Activity className="h-4 w-4 text-slate-400" />
          <div className="text-sm text-slate-600">
            Active: <span className="font-medium">{status.activeModelsCount || 0}</span>
          </div>
        </div>
      </div>
      
      {status.memoryUsage && (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="text-xs text-slate-500 space-x-4">
            <span>Memory: {Math.round(status.memoryUsage.heapUsed / 1024 / 1024)}MB</span>
            <span>Node: {status.nodeVersion}</span>
            <span>Last update: {new Date(status.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}