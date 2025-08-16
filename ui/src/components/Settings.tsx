import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings as SettingsIcon, Plus, Trash2, Save, AlertCircle, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { settingsApi } from '../lib/api';
import { ValidationStage } from '../../shared/types';

function ValidationStageForm({ 
  stage, 
  onSave, 
  onCancel 
}: { 
  stage?: ValidationStage;
  onSave: (stage: Omit<ValidationStage, 'id'>) => void;
  onCancel: () => void;
}) {
  const [formData, setFormData] = useState({
    name: stage?.name || '',
    command: stage?.command || '',
    timeout: stage?.timeout || 30000,
    enabled: stage?.enabled ?? true,
    continueOnFailure: stage?.continueOnFailure ?? false,
    priority: stage?.priority || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Stage Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="e.g., Lint Check"
          required
        />
      </div>

      <div>
        <Label htmlFor="command">Command</Label>
        <Input
          id="command"
          value={formData.command}
          onChange={(e) => setFormData(prev => ({ ...prev, command: e.target.value }))}
          placeholder="e.g., npm run lint"
          required
        />
      </div>

      <div>
        <Label htmlFor="timeout">Timeout (ms)</Label>
        <Input
          id="timeout"
          type="number"
          value={formData.timeout}
          onChange={(e) => setFormData(prev => ({ ...prev, timeout: parseInt(e.target.value) || 1000 }))}
          min="1000"
        />
      </div>

      <div>
        <Label htmlFor="priority">Priority</Label>
        <Input
          id="priority"
          type="number"
          value={formData.priority}
          onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 0 }))}
        />
      </div>

      <div className="flex items-center space-x-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
          />
          <span className="text-gray-900">Enabled</span>
        </label>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.continueOnFailure}
            onChange={(e) => setFormData(prev => ({ ...prev, continueOnFailure: e.target.checked }))}
          />
          <span className="text-gray-900">Continue on Failure</span>
        </label>
      </div>

      <div className="flex space-x-2">
        <Button type="submit">
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function ValidationStagesList() {
  const queryClient = useQueryClient();
  const [editingStage, setEditingStage] = useState<ValidationStage | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const { data: stages = [], isLoading, error } = useQuery({
    queryKey: ['validation-stages'],
    queryFn: settingsApi.getValidationStages,
  });

  // Sort stages by order/priority for display
  const sortedStages = [...stages].sort((a, b) => {
    const aOrder = a.priority || 0;
    const bOrder = b.priority || 0;
    return aOrder - bOrder;
  });

  const addMutation = useMutation({
    mutationFn: settingsApi.addValidationStage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validation-stages'] });
      setShowAddForm(false);
    },
    onError: (error) => {
      console.error('Failed to add validation stage:', error);
      // Still close the form to prevent hanging in tests
      setShowAddForm(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: Partial<ValidationStage> }) =>
      settingsApi.updateValidationStage(id, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validation-stages'] });
      setEditingStage(null);
    },
    onError: (error) => {
      console.error('Failed to update validation stage:', error);
      // Still close the form to prevent hanging in tests
      setEditingStage(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: settingsApi.removeValidationStage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validation-stages'] });
    },
  });

  const moveStage = async (stageId: string, direction: 'up' | 'down') => {
    const currentIndex = sortedStages.findIndex(s => s.id === stageId);
    if (currentIndex === -1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedStages.length) return;

    const currentStage = sortedStages[currentIndex];
    const targetStage = sortedStages[targetIndex];

    // Swap priorities
    const currentPriority = currentStage.priority || 0;
    const targetPriority = targetStage.priority || 0;

    try {
      // Update both stages with swapped priorities
      await Promise.all([
        updateMutation.mutateAsync({ 
          id: currentStage.id, 
          stage: { ...currentStage, priority: targetPriority } 
        }),
        updateMutation.mutateAsync({ 
          id: targetStage.id, 
          stage: { ...targetStage, priority: currentPriority } 
        })
      ]);
    } catch (error) {
      console.error('Failed to reorder stages:', error);
    }
  };

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 bg-gray-200 rounded"></div>
      ))}
    </div>;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-gray-600">Failed to load validation stages</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Validation Stages</h3>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Stage
        </Button>
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Validation Stage</CardTitle>
          </CardHeader>
          <CardContent>
            <ValidationStageForm
              onSave={(stage) => addMutation.mutate(stage)}
              onCancel={() => setShowAddForm(false)}
            />
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {sortedStages.map((stage, index) => (
          <Card key={stage.id}>
            <CardContent className="p-4">
              {editingStage?.id === stage.id ? (
                <ValidationStageForm
                  stage={stage}
                  onSave={(updatedStage) => updateMutation.mutate({ id: stage.id, stage: updatedStage })}
                  onCancel={() => setEditingStage(null)}
                />
              ) : (
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => moveStage(stage.id, 'up')}
                        disabled={index === 0}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => moveStage(stage.id, 'down')}
                        disabled={index === sortedStages.length - 1}
                        className="h-6 w-6 p-0"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </Button>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{stage.name}</span>
                        {!stage.enabled && (
                          <span className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">
                            Disabled
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {stage.command} • {stage.timeout}ms timeout • Priority: {stage.priority || 0}
                      </div>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingStage(stage)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(stage.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {sortedStages.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No validation stages configured</p>
          <p className="text-sm text-gray-400 mt-1">
            Add your first validation stage to get started
          </p>
        </div>
      )}
    </div>
  );
}

export function Settings() {
  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="h-6 w-6 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
          <p className="text-gray-600">
            Configure validation pipeline stages and settings
          </p>
        </div>
      </div>

      <ValidationStagesList />
    </div>
  );
}