import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings as SettingsIcon, Plus, Trash2, Save, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { settingsApi } from '../lib/api';
import { ValidationStage, Config } from 'shared/types';

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
          onChange={(e) => setFormData(prev => ({ ...prev, timeout: parseInt(e.target.value) }))}
          min="1000"
        />
      </div>

      <div>
        <Label htmlFor="priority">Priority</Label>
        <Input
          id="priority"
          type="number"
          value={formData.priority}
          onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) }))}
        />
      </div>

      <div className="flex items-center space-x-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))}
          />
          <span>Enabled</span>
        </label>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.continueOnFailure}
            onChange={(e) => setFormData(prev => ({ ...prev, continueOnFailure: e.target.checked }))}
          />
          <span>Continue on Failure</span>
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

  const addMutation = useMutation({
    mutationFn: settingsApi.addValidationStage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validation-stages'] });
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
  });

  const deleteMutation = useMutation({
    mutationFn: settingsApi.removeValidationStage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validation-stages'] });
    },
  });

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
        <h3 className="text-lg font-semibold">Validation Stages</h3>
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
        {stages.map((stage) => (
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
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{stage.name}</span>
                      {!stage.enabled && (
                        <span className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">
                          Disabled
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      {stage.command} • {stage.timeout}ms timeout
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

      {stages.length === 0 && (
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