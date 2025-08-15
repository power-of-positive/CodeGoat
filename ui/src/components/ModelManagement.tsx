import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ModelList } from './ModelList';
import { ServerStatus } from './ServerStatus';
import { RequestLogs } from './RequestLogs';
import { AddModelDialog } from './AddModelDialog';
import { Button } from './ui/button';
import { Plus, RefreshCw, Server, Activity, FileText } from 'lucide-react';
import { api } from '../services/api';
import type { UIModelConfig } from '../types/api';

type ActiveSection = 'models' | 'logs' | 'status';

export function ModelManagement() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('models');
  const [showAddModel, setShowAddModel] = useState(false);
  const [editingModel, setEditingModel] = useState<UIModelConfig | null>(null);
  const [testingModelIds, setTestingModelIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const addModelMutation = useMutation({
    mutationFn: api.addModel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      setShowAddModel(false);
    },
    onError: (error) => {
      console.error('Failed to add model:', error);
    },
  });

  const deleteModelMutation = useMutation({
    mutationFn: api.deleteModel,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
    onError: (error) => {
      console.error('Failed to delete model:', error);
    },
  });

  const updateModelMutation = useMutation({
    mutationFn: ({ id, model }: { id: string; model: Partial<Parameters<typeof api.updateModel>[1]> }) => 
      api.updateModel(id, model),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['models'] });
      setEditingModel(null);
    },
    onError: (error) => {
      console.error('Failed to update model:', error);
    },
  });

  const testModelMutation = useMutation({
    mutationFn: api.testModel,
    onSuccess: (result) => {
      console.log('Model test result:', result);
      setTestingModelIds(prev => prev.filter(id => id !== result.modelId));
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
    onError: (error, modelId) => {
      console.error('Failed to test model:', error);
      setTestingModelIds(prev => prev.filter(id => id !== modelId));
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['models'] });
    queryClient.invalidateQueries({ queryKey: ['status'] });
  };

  const sections = [
    { id: 'models' as const, name: 'Model Configurations', icon: Server },
    { id: 'logs' as const, name: 'Request Logs', icon: FileText },
    { id: 'status' as const, name: 'Server Status', icon: Activity },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'logs':
        return <RequestLogs />;
      case 'status':
        return <ServerStatus />;
      default:
        return (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-slate-100">
                Model Configurations
              </h2>
              <div className="flex items-center gap-2">
                <Button 
                  data-testid="refresh-models-button"
                  variant="outline" 
                  onClick={handleRefresh}
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
                <Button data-testid="add-model-button" onClick={() => setShowAddModel(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Model
                </Button>
              </div>
            </div>
            
            <ModelList 
              onEdit={setEditingModel}
              onDelete={(modelId) => {
                if (confirm('Are you sure you want to delete this model?')) {
                  deleteModelMutation.mutate(modelId);
                }
              }}
              onTest={(modelId) => {
                setTestingModelIds(prev => [...prev, modelId]);
                testModelMutation.mutate(modelId);
              }}
              testingModelIds={testingModelIds}
            />
          </div>
        );
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Server className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Model Management</h1>
            <p className="text-gray-600">
              Manage AI models, view request logs, and monitor server status
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-700 mb-8">
        <nav className="flex space-x-8">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeSection === section.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {section.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {renderContent()}

      {/* Add Model Dialog */}
      <AddModelDialog 
        open={showAddModel} 
        onClose={() => setShowAddModel(false)}
        onAdd={(modelData) => {
          addModelMutation.mutate(modelData);
        }}
      />

      {/* Edit Model Dialog */}
      {editingModel && (
        <AddModelDialog 
          open={!!editingModel}
          onClose={() => setEditingModel(null)}
          editingModel={editingModel}
          onAdd={(modelData) => {
            updateModelMutation.mutate({ 
              id: editingModel.id, 
              model: modelData 
            });
          }}
        />
      )}
    </div>
  );
}