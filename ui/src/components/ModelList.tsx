import { useQuery } from '@tanstack/react-query';
import { Trash2, Edit, TestTube, ExternalLink, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { Button } from './ui/Button';
import type { UIModelConfig } from '../types/api';
import { OpenRouterStats } from './OpenRouterStats';

interface ModelListProps {
  onEdit?: (model: UIModelConfig) => void;
  onDelete?: (modelId: string) => void;
  onTest?: (modelId: string) => void;
  testingModelIds?: string[];
}

function getModelUrl(model: UIModelConfig): string {
  // For OpenRouter models, link to the actual model page
  if (model.provider === 'openrouter' && model.model.startsWith('openrouter/')) {
    const modelPath = model.model.replace('openrouter/', '');
    return `https://openrouter.ai/models/${modelPath}`;
  }
  
  // For other providers, fallback to the base URL
  return model.baseUrl;
}

export function ModelList({ onEdit, onDelete, onTest, testingModelIds = [] }: ModelListProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['models'],
    queryFn: () => api.getModels(),
  });

  if (isLoading) {
    return (
      <div className="bg-gray-800 shadow rounded-lg p-6">
        <div className="text-center text-slate-400">
          <p>Loading models...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 shadow rounded-lg p-6">
        <div className="text-center text-red-400">
          <p>Failed to load models</p>
          <p className="text-sm mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
        </div>
      </div>
    );
  }

  const models = data?.models || [];

  if (models.length === 0) {
    return (
      <div className="bg-gray-800 shadow rounded-lg p-6">
        <div className="text-center text-slate-400">
          <p>No models configured yet.</p>
          <p className="text-sm mt-1">Click "Add Model" to get started.</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: UIModelConfig['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-400 bg-green-900';
      case 'error':
        return 'text-red-400 bg-red-900';
      default:
        return 'text-slate-400 bg-slate-700';
    }
  };

  return (
    <div data-testid="model-list-container" className="bg-gray-800 shadow rounded-lg overflow-hidden">
      <div className="divide-y divide-slate-700">
        {models.map((model) => (
          <div key={model.id} data-testid={`model-card-${model.id}`} className="p-6 hover:bg-gray-700 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-medium text-slate-100 truncate">
                    {model.name}
                  </h3>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(model.status)}`}
                  >
                    {model.status || 'untested'}
                  </span>
                  {!model.enabled && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-slate-400 bg-slate-700">
                      disabled
                    </span>
                  )}
                </div>
                
                <div className="space-y-1 text-sm text-slate-400">
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
                      href={getModelUrl(model)} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      {getModelUrl(model)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  {model.lastTested && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Last tested:</span>
                      <span>{new Date(model.lastTested).toLocaleString()}</span>
                      {model.responseTime && (
                        <span className="text-xs text-slate-500">
                          ({model.responseTime}ms)
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                {/* OpenRouter Statistics - only show for OpenRouter models */}
                {model.provider === 'openrouter' && (
                  <OpenRouterStats modelSlug={model.model} />
                )}
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <Button
                  data-testid={`test-model-${model.id}`}
                  variant="outline"
                  size="sm"
                  onClick={() => onTest?.(model.id)}
                  disabled={!model.enabled || testingModelIds.includes(model.id)}
                >
                  {testingModelIds.includes(model.id) ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube className="h-4 w-4" />
                      Test
                    </>
                  )}
                </Button>
                <Button
                  data-testid={`edit-model-${model.id}`}
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit?.(model)}
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Button>
                <Button
                  data-testid={`delete-model-${model.id}`}
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