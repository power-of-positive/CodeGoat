import { useQuery } from '@tanstack/react-query';
import { Server, Activity, Database, Clock } from 'lucide-react';
import { api } from '../services/api';
import { QUERY_CONFIG } from '../constants/api';

export function ServerStatus() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['status'],
    queryFn: api.getServerStatus,
    refetchInterval: QUERY_CONFIG.defaultRefetchInterval,
  });

  if (isLoading) {
    return (
      <div className="bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-slate-100 mb-4 flex items-center gap-2">
          <Server className="h-5 w-5" />
          Server Status
        </h2>
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-slate-100 mb-4 flex items-center gap-2">
          <Server className="h-5 w-5" />
          Server Status
        </h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-400 rounded-full mr-2"></div>
            <span className="text-sm text-red-400">Error</span>
          </div>
          <div className="text-sm text-slate-400">
            Failed to connect to server
          </div>
        </div>
      </div>
    );
  }

  const status = data || {};
  const isHealthy = status.status === 'healthy';

  return (
    <div className="bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-lg font-medium text-slate-100 mb-4 flex items-center gap-2">
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
              isHealthy ? 'text-green-400' : 'text-red-400'
            }`}>
              {isHealthy ? 'Healthy' : 'Error'}
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-slate-500" />
          <div className="text-sm text-slate-400">
            Uptime: <span className="font-medium">{status.uptimeFormatted || 'Unknown'}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Database className="h-4 w-4 text-slate-500" />
          <div className="text-sm text-slate-400">
            Models: <span className="font-medium">{status.modelsCount || 0}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Activity className="h-4 w-4 text-slate-500" />
          <div className="text-sm text-slate-400">
            Active: <span className="font-medium">{status.activeModelsCount || 0}</span>
          </div>
        </div>
      </div>
      
      {status.memoryUsage && (
        <div className="mt-4 pt-4 border-t border-slate-600">
          <div className="text-xs text-slate-400 space-x-4">
            <span>Memory: {Math.round(status.memoryUsage.heapUsed / 1024 / 1024)}MB</span>
            <span>Node: {status.nodeVersion}</span>
            <span>Last update: {new Date(status.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}