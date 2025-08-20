import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings as SettingsIcon,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  GripVertical,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { settingsApi } from '../lib/api';
import { ValidationStage } from '../../shared/types';

function ValidationStageForm({
  stage,
  onSave,
  onCancel,
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
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, name: e.target.value }))
          }
          placeholder="e.g., Lint Check"
          required
        />
      </div>

      <div>
        <Label htmlFor="command">Command</Label>
        <Input
          id="command"
          value={formData.command}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, command: e.target.value }))
          }
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
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              timeout: parseInt(e.target.value) || 1000,
            }))
          }
          min="1000"
        />
      </div>

      <div>
        <Label htmlFor="priority">Priority</Label>
        <Input
          id="priority"
          type="number"
          value={formData.priority}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              priority: parseInt(e.target.value) || 0,
            }))
          }
        />
      </div>

      <div className="flex items-center space-x-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.enabled}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, enabled: e.target.checked }))
            }
          />
          <span className="text-gray-900">Enabled</span>
        </label>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={formData.continueOnFailure}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                continueOnFailure: e.target.checked,
              }))
            }
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

function LoadingStages() {
  return (
    <div className="animate-pulse space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 bg-gray-200 rounded"></div>
      ))}
    </div>
  );
}

function ErrorLoadingStages() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-gray-600">Failed to load validation stages</p>
      </div>
    </div>
  );
}

function EmptyStagesList() {
  return (
    <div className="text-center py-8">
      <p className="text-gray-500">No validation stages configured</p>
      <p className="text-sm text-gray-400 mt-1">
        Add your first validation stage to get started
      </p>
    </div>
  );
}

function StageReorderControls({
  stage,
  index,
  totalStages,
  onMove,
}: {
  stage: ValidationStage;
  index: number;
  totalStages: number;
  onMove: (stageId: string, direction: 'up' | 'down') => void;
}) {
  return (
    <div className="flex flex-col">
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onMove(stage.id, 'up')}
        disabled={index === 0}
        className="h-6 w-6 p-0"
      >
        <ChevronUp className="w-3 h-3" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onMove(stage.id, 'down')}
        disabled={index === totalStages - 1}
        className="h-6 w-6 p-0"
      >
        <ChevronDown className="w-3 h-3" />
      </Button>
    </div>
  );
}

function StageListItem({
  stage,
  index,
  totalStages,
  editingStage,
  onEdit,
  onDelete,
  onMove,
  onUpdate,
  onCancelEdit,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  isDragging,
  dragOverIndex,
}: {
  stage: ValidationStage;
  index: number;
  totalStages: number;
  editingStage: ValidationStage | null;
  onEdit: (stage: ValidationStage) => void;
  onDelete: (stageId: string) => void;
  onMove: (stageId: string, direction: 'up' | 'down') => void;
  onUpdate: (id: string, stage: Omit<ValidationStage, 'id'>) => void;
  onCancelEdit: () => void;
  onDragStart: (e: React.DragEvent, stageIndex: number) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, targetIndex: number) => void;
  onDrop: (e: React.DragEvent, targetIndex: number) => void;
  isDragging: boolean;
  dragOverIndex: number | null;
}) {
  const isBeingDragged = isDragging && index === dragOverIndex;
  const cardClasses = `transition-all duration-200 ${
    isBeingDragged ? 'opacity-50 scale-95' : ''
  } ${dragOverIndex === index ? 'border-blue-400 border-2' : ''}`;

  return (
    <div
      key={stage.id}
      className={`${cardClasses}`}
      draggable={editingStage?.id !== stage.id}
      onDragStart={(e) => onDragStart(e, index)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={(e) => onDrop(e, index)}
    >
      <Card>
        <CardContent className="p-4">
          {editingStage?.id === stage.id ? (
            <ValidationStageForm
              stage={stage}
              onSave={(updatedStage) => onUpdate(stage.id, updatedStage)}
              onCancel={onCancelEdit}
            />
          ) : (
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                  </div>
                  <StageReorderControls
                    stage={stage}
                    index={index}
                    totalStages={totalStages}
                    onMove={onMove}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {stage.name}
                    </span>
                    {!stage.enabled && (
                      <span className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">
                        Disabled
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    {stage.command} • {stage.timeout}ms timeout • Priority:{' '}
                    {stage.priority || 0}
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(stage)}
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDelete(stage.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function useValidationStagesMutations() {
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: settingsApi.addValidationStage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validation-stages'] });
    },
    onError: (error) => {
      console.error('Failed to add validation stage:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      stage,
    }: {
      id: string;
      stage: Partial<ValidationStage>;
    }) => settingsApi.updateValidationStage(id, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validation-stages'] });
    },
    onError: (error) => {
      console.error('Failed to update validation stage:', error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: settingsApi.removeValidationStage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validation-stages'] });
    },
  });

  return { addMutation, updateMutation, deleteMutation };
}

function useStageReordering(
  sortedStages: ValidationStage[],
  updateMutation: {
    mutateAsync: (params: {
      id: string;
      stage: ValidationStage;
    }) => Promise<ValidationStage>;
  }
) {
  const moveStage = async (stageId: string, direction: 'up' | 'down') => {
    const currentIndex = sortedStages.findIndex((s) => s.id === stageId);
    if (currentIndex === -1) return;

    const targetIndex =
      direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sortedStages.length) return;

    const currentStage = sortedStages[currentIndex];
    const targetStage = sortedStages[targetIndex];

    // Use temporary priorities to avoid conflicts
    const tempPriority = sortedStages.length + 1000;
    const currentPriority = currentStage.priority || 0;
    const targetPriority = targetStage.priority || 0;

    try {
      // Update sequentially with temporary priority to avoid conflicts
      // First, move current stage to a temporary priority
      await updateMutation.mutateAsync({
        id: currentStage.id,
        stage: { ...currentStage, priority: tempPriority },
      });

      // Then move target stage to current stage's priority
      await updateMutation.mutateAsync({
        id: targetStage.id,
        stage: { ...targetStage, priority: currentPriority },
      });

      // Finally, move current stage to target stage's priority
      await updateMutation.mutateAsync({
        id: currentStage.id,
        stage: { ...currentStage, priority: targetPriority },
      });
    } catch (error) {
      console.error('Failed to reorder stages:', error);
      throw error;
    }
  };

  const reorderByDrag = async (fromIndex: number, toIndex: number) => {
    if (
      fromIndex === toIndex ||
      fromIndex < 0 ||
      toIndex < 0 ||
      fromIndex >= sortedStages.length ||
      toIndex >= sortedStages.length
    ) {
      return;
    }

    try {
      // Create a new array with reordered items
      const reorderedStages = [...sortedStages];
      const [draggedStage] = reorderedStages.splice(fromIndex, 1);
      reorderedStages.splice(toIndex, 0, draggedStage);

      // Update priorities sequentially to avoid race conditions
      // Start with a high temporary priority to avoid conflicts
      const tempPriorityBase = sortedStages.length + 1000;

      // First, assign temporary priorities to all stages to avoid conflicts
      for (let i = 0; i < reorderedStages.length; i++) {
        const stage = reorderedStages[i];
        await updateMutation.mutateAsync({
          id: stage.id,
          stage: { ...stage, priority: tempPriorityBase + i },
        });
      }

      // Then assign final priorities
      for (let i = 0; i < reorderedStages.length; i++) {
        const stage = reorderedStages[i];
        await updateMutation.mutateAsync({
          id: stage.id,
          stage: { ...stage, priority: i },
        });
      }
    } catch (error) {
      console.error('Failed to reorder stages by drag:', error);
      // Re-throw to ensure UI shows error state
      throw error;
    }
  };

  return { moveStage, reorderByDrag };
}

function AddStageForm({
  showAddForm,
  onAdd,
  onCancel,
}: {
  showAddForm: boolean;
  onAdd: (stage: Omit<ValidationStage, 'id'>) => void;
  onCancel: () => void;
}) {
  if (!showAddForm) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add New Validation Stage</CardTitle>
      </CardHeader>
      <CardContent>
        <ValidationStageForm onSave={onAdd} onCancel={onCancel} />
      </CardContent>
    </Card>
  );
}

function StagesList({
  stages,
  editingStage,
  onEdit,
  onDelete,
  onMove,
  onUpdate,
  onCancelEdit,
  onReorderByDrag,
}: {
  stages: ValidationStage[];
  editingStage: ValidationStage | null;
  onEdit: (stage: ValidationStage) => void;
  onDelete: (stageId: string) => void;
  onMove: (stageId: string, direction: 'up' | 'down') => void;
  onUpdate: (id: string, stage: Omit<ValidationStage, 'id'>) => void;
  onCancelEdit: () => void;
  onReorderByDrag: (fromIndex: number, toIndex: number) => void;
}) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  if (stages.length === 0) {
    return <EmptyStagesList />;
  }

  const handleDragStart = (e: React.DragEvent, stageIndex: number) => {
    setDraggedIndex(stageIndex);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', stageIndex.toString());
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(targetIndex);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();

    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      onReorderByDrag(draggedIndex, targetIndex);
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div className="space-y-2">
      {stages.map((stage, index) => (
        <StageListItem
          key={stage.id}
          stage={stage}
          index={index}
          totalStages={stages.length}
          editingStage={editingStage}
          onEdit={onEdit}
          onDelete={onDelete}
          onMove={onMove}
          onUpdate={onUpdate}
          onCancelEdit={onCancelEdit}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          isDragging={draggedIndex !== null}
          dragOverIndex={dragOverIndex}
        />
      ))}
    </div>
  );
}

function ValidationStagesList() {
  const [editingStage, setEditingStage] = useState<ValidationStage | null>(
    null
  );
  const [showAddForm, setShowAddForm] = useState(false);

  const {
    data: stages = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['validation-stages'],
    queryFn: settingsApi.getValidationStages,
  });

  const { addMutation, updateMutation, deleteMutation } =
    useValidationStagesMutations();

  // Sort stages by order/priority for display
  const sortedStages = [...stages].sort((a, b) => {
    const aOrder = a.priority || 0;
    const bOrder = b.priority || 0;
    return aOrder - bOrder;
  });

  const { moveStage, reorderByDrag } = useStageReordering(
    sortedStages,
    updateMutation
  );

  const handleAddStage = (stage: Omit<ValidationStage, 'id'>) => {
    addMutation.mutate(stage, {
      onSuccess: () => setShowAddForm(false),
      onError: () => setShowAddForm(false), // Still close form to prevent hanging in tests
    });
  };

  const handleUpdateStage = (
    id: string,
    stage: Omit<ValidationStage, 'id'>
  ) => {
    updateMutation.mutate(
      { id, stage },
      {
        onSuccess: () => setEditingStage(null),
        onError: () => setEditingStage(null), // Still close form to prevent hanging in tests
      }
    );
  };

  if (isLoading) {
    return <LoadingStages />;
  }

  if (error) {
    return <ErrorLoadingStages />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">
          Validation Stages
        </h3>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Stage
        </Button>
      </div>

      <AddStageForm
        showAddForm={showAddForm}
        onAdd={handleAddStage}
        onCancel={() => setShowAddForm(false)}
      />

      <StagesList
        stages={sortedStages}
        editingStage={editingStage}
        onEdit={setEditingStage}
        onDelete={(stageId) => deleteMutation.mutate(stageId)}
        onMove={moveStage}
        onUpdate={handleUpdateStage}
        onCancelEdit={() => setEditingStage(null)}
        onReorderByDrag={reorderByDrag}
      />
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
