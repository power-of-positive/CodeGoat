import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ModelList } from './ModelList';
import { ServerStatus } from './ServerStatus';
import { AddModelDialog } from './AddModelDialog';
import { Button } from './ui/Button';
import { Plus, RefreshCw } from 'lucide-react';
import { api } from '../services/api';
import type { UIModelConfig } from '../types/api';

export function Dashboard() {
  const [showAddModel, setShowAddModel] = useState(false);
  const [editingModel, setEditingModel] = useState<UIModelConfig | null>(null);
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

  const testModelMutation = useMutation({
    mutationFn: api.testModel,
    onSuccess: (result) => {
      console.log('Model test result:', result);
      queryClient.invalidateQueries({ queryKey: ['models'] });
    },
    onError: (error) => {
      console.error('Failed to test model:', error);
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['models'] });
    queryClient.invalidateQueries({ queryKey: ['status'] });
  };

  return (
    <div className="space-y-8">
      {/* Server Status */}
      <ServerStatus />

      {/* Models Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-slate-900">
            Model Configurations
          </h2>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              size="sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
            <Button onClick={() => setShowAddModel(true)}>
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
            testModelMutation.mutate(modelId);
          }}
        />
      </div>

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
          onAdd={(modelData) => {
            // TODO: Implement edit functionality
            console.log('Edit model:', editingModel.id, modelData);
            setEditingModel(null);
          }}
        />
      )}
    </div>
  );
}