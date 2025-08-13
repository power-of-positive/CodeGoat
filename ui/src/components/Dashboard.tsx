import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ModelList } from './ModelList';
import { ServerStatus } from './ServerStatus';
import { RequestLogs } from './RequestLogs';
import { AddModelDialog } from './AddModelDialog';
import { Settings } from './Settings';
import { Analytics } from './Analytics';
import { Button } from './ui/button';
import { Plus, RefreshCw, Home, FileText, Settings as SettingsIcon, BarChart3 } from 'lucide-react';
import { api } from '../services/api';
import type { UIModelConfig } from '../types/api';

type ActiveTab = 'dashboard' | 'logs' | 'settings' | 'analytics';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
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

  const tabs = [
    { id: 'dashboard' as const, name: 'Dashboard', icon: Home },
    { id: 'logs' as const, name: 'Request Logs', icon: FileText },
    { id: 'analytics' as const, name: 'Analytics', icon: BarChart3 },
    { id: 'settings' as const, name: 'Settings', icon: SettingsIcon },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'logs':
        return <RequestLogs />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <div className="space-y-8">
            {/* Server Status */}
            <ServerStatus />

            {/* Models Section */}
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
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </Button>
                  <Button data-testid="add-model-button" onClick={() => setShowAddModel(true)}>
                    <Plus className="w-4 h-4" />
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
          </div>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Navigation Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
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