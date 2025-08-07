import { useQuery } from '@tanstack/react-query';
import { Trash2, Edit, TestTube, ExternalLink } from 'lucide-react';
import { api } from '../services/api';
import { Button } from './ui/Button';
import type { UIModelConfig } from '../types/api';

interface ModelListProps {
  onEdit?: (model: UIModelConfig) => void;
  onDelete?: (modelId: string) => void;
  onTest?: (modelId: string) => void;
}

export function ModelList({ onEdit, onDelete, onTest }: ModelListProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['models'],
    queryFn: () => api.getModels(),
  });

  if (isLoading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center text-slate-500">
          <p>Loading models...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center text-red-500">
          <p>Failed to load models</p>
          <p className="text-sm mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  const models = data?.models || [];

  if (models.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="text-center text-slate-500">
          <p>No models configured yet.</p>
          <p className="text-sm mt-1">Click "Add Model" to get started.</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: UIModelConfig['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-slate-600 bg-slate-100';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="divide-y divide-slate-200">
        {models.map((model) => (
          <div key={model.id} className="p-6 hover:bg-slate-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-medium text-slate-900 truncate">
                    {model.name}
                  </h3>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(model.status)}`}
                  >
                    {model.status || 'untested'}
                  </span>
                  {!model.enabled && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-slate-500 bg-slate-100">
                      disabled
                    </span>
                  )}
                </div>
                
                <div className="space-y-1 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Provider:</span>
                    <span className="capitalize">{model.provider}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Model:</span>
                    <span>{model.model}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">URL:</span>
                    <a 
                      href={model.baseUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      {model.baseUrl}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  {model.lastTested && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Last tested:</span>
                      <span>{new Date(model.lastTested).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onTest?.(model.id)}
                  disabled={!model.enabled}
                >
                  <TestTube className="h-4 w-4" />
                  Test
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit?.(model)}
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDelete?.(model.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}