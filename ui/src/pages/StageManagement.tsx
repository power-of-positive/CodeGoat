/* eslint-disable max-lines, max-lines-per-function, complexity */
import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Settings as SettingsIcon,
  Plus,
  Trash2,
  Save,
  AlertCircle,
  GripVertical,
  Edit,
  X,
  Eye,
  EyeOff,
  Clock,
  Terminal,
  Hash,
  FileText,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  UniqueIdentifier,
  useSensor,
  useSensors,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '../shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../shared/ui/card';
import { Input } from '../shared/ui/input';
import { Label } from '../shared/ui/label';
import { Switch } from '../shared/ui/switch';
import { Textarea } from '../shared/ui/textarea';
import { settingsApi } from '../shared/lib/api';
import { ValidationStage } from '../shared/types/index';

// Constants
const MAX_TIMEOUT_MS = 300000; // 5 minutes
const MIN_TIMEOUT_MS = 1000; // 1 second

interface ValidationStageFormData {
  name: string;
  command: string;
  timeout: number;
  enabled: boolean;
  continueOnFailure: boolean;
  priority: number;
}

interface StageEditFormProps {
  stage: ValidationStage;
  onSave: (stageId: string, updates: Partial<ValidationStage>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function StageEditForm({ stage, onSave, onCancel, isLoading = false }: StageEditFormProps) {
  const [formData, setFormData] = useState<ValidationStageFormData>({
    name: stage.name,
    command: stage.command,
    timeout: stage.timeout,
    enabled: stage.enabled,
    continueOnFailure: stage.continueOnFailure,
    priority: stage.priority,
    });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Stage name is required';
    }

    if (!formData.command.trim()) {
      newErrors.command = 'Command is required';
    }

    if (formData.timeout < MIN_TIMEOUT_MS) {
      newErrors.timeout = `Timeout must be at least ${MIN_TIMEOUT_MS}ms`;
    } else if (formData.timeout > MAX_TIMEOUT_MS) {
      newErrors.timeout = `Timeout must not exceed ${MAX_TIMEOUT_MS}ms (5 minutes)`;
    }

    if (formData.priority < 0) {
      newErrors.priority = 'Priority must be non-negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(stage.id, formData);
    }
  };

  const handleInputChange = (field: keyof ValidationStageFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <Label htmlFor={`name-${stage.id}`} className="text-sm font-medium">
            <FileText className="w-4 h-4 inline mr-1" />
            Stage Name
          </Label>
          <Input
            id={`name-${stage.id}`}
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="e.g., Code Linting"
            className={errors.name ? 'border-red-500' : ''}
            disabled={isLoading}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        <div>
          <Label htmlFor={`priority-${stage.id}`} className="text-sm font-medium">
            <Hash className="w-4 h-4 inline mr-1" />
            Priority
          </Label>
          <Input
            id={`priority-${stage.id}`}
            type="number"
            value={formData.priority}
            onChange={(e) => handleInputChange('priority', parseInt(e.target.value) || 0)}
            min="0"
            className={errors.priority ? 'border-red-500' : ''}
            disabled={isLoading}
          />
          {errors.priority && <p className="text-red-500 text-xs mt-1">{errors.priority}</p>}
        </div>
      </div>

      <div>
        <Label htmlFor={`command-${stage.id}`} className="text-sm font-medium">
          <Terminal className="w-4 h-4 inline mr-1" />
          Command
        </Label>
        <Textarea
          id={`command-${stage.id}`}
          value={formData.command}
          onChange={(e) => handleInputChange('command', e.target.value)}
          placeholder="e.g., npm run lint"
          rows={2}
          className={errors.command ? 'border-red-500' : ''}
          disabled={isLoading}
        />
        {errors.command && <p className="text-red-500 text-xs mt-1">{errors.command}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <Label htmlFor={`timeout-${stage.id}`} className="text-sm font-medium">
            <Clock className="w-4 h-4 inline mr-1" />
            Timeout (milliseconds)
          </Label>
          <Input
            id={`timeout-${stage.id}`}
            type="number"
            value={formData.timeout}
            onChange={(e) => handleInputChange('timeout', parseInt(e.target.value) || MIN_TIMEOUT_MS)}
            min={MIN_TIMEOUT_MS}
            max={MAX_TIMEOUT_MS}
            step="1000"
            className={errors.timeout ? 'border-red-500' : ''}
            disabled={isLoading}
          />
          {errors.timeout && <p className="text-red-500 text-xs mt-1">{errors.timeout}</p>}
          <p className="text-xs text-gray-500 mt-1">
            {formData.timeout ? `${(formData.timeout / 1000).toFixed(1)} seconds` : ''}
          </p>
        </div>

      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center space-x-3">
          <Switch
            id={`enabled-${stage.id}`}
            checked={formData.enabled}
            onCheckedChange={(checked) => handleInputChange('enabled', checked)}
            disabled={isLoading}
          />
          <Label htmlFor={`enabled-${stage.id}`} className="text-sm font-medium cursor-pointer">
            {formData.enabled ? (
              <>
                <Eye className="w-4 h-4 inline mr-1" />
                Enabled
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 inline mr-1" />
                Disabled
              </>
            )}
          </Label>
        </div>

        <div className="flex items-center space-x-3">
          <Switch
            id={`continueOnFailure-${stage.id}`}
            checked={formData.continueOnFailure}
            onCheckedChange={(checked) => handleInputChange('continueOnFailure', checked)}
            disabled={isLoading}
          />
          <Label htmlFor={`continueOnFailure-${stage.id}`} className="text-sm font-medium cursor-pointer">
            Continue on failure
          </Label>
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t">
        <Button type="submit" disabled={isLoading} className="flex-1 sm:flex-initial">
          <Save className="w-4 h-4 mr-2" />
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface AddStageFormProps {
  onAdd: (stage: Omit<ValidationStage, 'id'>) => void;
  onCancel: () => void;
  existingStages: ValidationStage[];
  isLoading?: boolean;
}

function AddStageForm({ onAdd, onCancel, existingStages, isLoading = false }: AddStageFormProps) {
  const [formData, setFormData] = useState<ValidationStageFormData>({
    name: '',
    command: '',
    timeout: 30000,
    enabled: true,
    continueOnFailure: false,
    priority: Math.max(0, ...existingStages.map(s => s.priority)) + 1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Stage name is required';
    }

    if (!formData.command.trim()) {
      newErrors.command = 'Command is required';
    }

    if (formData.timeout < MIN_TIMEOUT_MS) {
      newErrors.timeout = `Timeout must be at least ${MIN_TIMEOUT_MS}ms`;
    } else if (formData.timeout > MAX_TIMEOUT_MS) {
      newErrors.timeout = `Timeout must not exceed ${MAX_TIMEOUT_MS}ms (5 minutes)`;
    }

    if (formData.priority < 0) {
      newErrors.priority = 'Priority must be non-negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onAdd(formData);
    }
  };

  const handleInputChange = (field: keyof ValidationStageFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Add New Validation Stage</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="new-name" className="text-sm font-medium">
                <FileText className="w-4 h-4 inline mr-1" />
                Stage Name
              </Label>
              <Input
                id="new-name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Code Linting"
                className={errors.name ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="new-priority" className="text-sm font-medium">
                <Hash className="w-4 h-4 inline mr-1" />
                Priority
              </Label>
              <Input
                id="new-priority"
                type="number"
                value={formData.priority}
                onChange={(e) => handleInputChange('priority', parseInt(e.target.value) || 0)}
                min="0"
                className={errors.priority ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.priority && <p className="text-red-500 text-xs mt-1">{errors.priority}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="new-command" className="text-sm font-medium">
              <Terminal className="w-4 h-4 inline mr-1" />
              Command
            </Label>
            <Textarea
              id="new-command"
              value={formData.command}
              onChange={(e) => handleInputChange('command', e.target.value)}
              placeholder="e.g., npm run lint"
              rows={2}
              className={errors.command ? 'border-red-500' : ''}
              disabled={isLoading}
            />
            {errors.command && <p className="text-red-500 text-xs mt-1">{errors.command}</p>}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="new-timeout" className="text-sm font-medium">
                <Clock className="w-4 h-4 inline mr-1" />
                Timeout (milliseconds)
              </Label>
              <Input
                id="new-timeout"
                type="number"
                value={formData.timeout}
                onChange={(e) => handleInputChange('timeout', parseInt(e.target.value) || MIN_TIMEOUT_MS)}
                min="1000"
                max="300000"
                step="1000"
                className={errors.timeout ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.timeout && <p className="text-red-500 text-xs mt-1">{errors.timeout}</p>}
              <p className="text-xs text-gray-500 mt-1">
                {formData.timeout ? `${(formData.timeout / 1000).toFixed(1)} seconds` : ''}
              </p>
            </div>

          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center space-x-3">
              <Switch
                id="new-enabled"
                checked={formData.enabled}
                onCheckedChange={(checked) => handleInputChange('enabled', checked)}
                disabled={isLoading}
              />
              <Label htmlFor="new-enabled" className="text-sm font-medium cursor-pointer">
                {formData.enabled ? (
                  <>
                    <Eye className="w-4 h-4 inline mr-1" />
                    Enabled
                  </>
                ) : (
                  <>
                    <EyeOff className="w-4 h-4 inline mr-1" />
                    Disabled
                  </>
                )}
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Switch
                id="new-continueOnFailure"
                checked={formData.continueOnFailure}
                onCheckedChange={(checked) => handleInputChange('continueOnFailure', checked)}
                disabled={isLoading}
              />
              <Label htmlFor="new-continueOnFailure" className="text-sm font-medium cursor-pointer">
                Continue on failure
              </Label>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" disabled={isLoading}>
              <Plus className="w-4 h-4 mr-2" />
              {isLoading ? 'Adding...' : 'Add Stage'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

interface StageCardProps {
  stage: ValidationStage;
  _index: number;
  isEditing: boolean;
  onEdit: (stage: ValidationStage) => void;
  onSave: (stageId: string, updates: Partial<ValidationStage>) => void;
  onCancelEdit: () => void;
  onDelete: (stageId: string) => void;
  onToggleEnabled: (stageId: string, enabled: boolean) => void;
  isLoading?: boolean;
}

function StageCard({
  stage,
  _index,
  isEditing,
  onEdit,
  onSave,
  onCancelEdit,
  onDelete,
  onToggleEnabled,
  isLoading = false,
}: StageCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: stage.id,
    disabled: isEditing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isEditing) {
    return (
      <Card className="border-blue-500 shadow-lg">
        <CardContent className="p-0">
          <StageEditForm
            stage={stage}
            onSave={onSave}
            onCancel={onCancelEdit}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${
        isDragging ? 'opacity-50 rotate-2 shadow-2xl z-10' : ''
      }`}
    >
      <Card
        className={`transition-all duration-200 ${
          isDragging ? '' : 'hover:shadow-md'
        } ${!stage.enabled ? 'opacity-60' : ''}`}
      >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div
              {...attributes}
              {...listeners}
              className="mt-1 cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            >
              <GripVertical className="w-5 h-5 text-gray-400" />
            </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {stage.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-1 rounded-full">
                        Priority: {stage.priority}
                      </span>
                      {!stage.enabled && (
                        <span className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 px-2 py-1 rounded-full">
                          Disabled
                        </span>
                      )}
                      {stage.continueOnFailure && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-1 rounded-full">
                          Continue on failure
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4" />
                      <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs flex-1 truncate">
                        {stage.command}
                      </code>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{(stage.timeout / 1000).toFixed(1)}s timeout</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onToggleEnabled(stage.id, !stage.enabled)}
                  disabled={isLoading}
                  className="p-2"
                  title={stage.enabled ? 'Disable stage' : 'Enable stage'}
                >
                  {stage.enabled ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(stage)}
                  disabled={isLoading}
                  className="p-2"
                  title="Edit stage"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(stage.id)}
                  disabled={isLoading}
                  className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Delete stage"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
  );
}

export default function StageManagement() {
  const queryClient = useQueryClient();
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor)
  );
  
  const {
    data: stages = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['validation-stages'],
    queryFn: settingsApi.getValidationStages,
  });

  // Mutations
  const addMutation = useMutation({
    mutationFn: settingsApi.addValidationStage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validation-stages'] });
      setShowAddForm(false);
    },
    onError: (error) => {
      console.error('Failed to add validation stage:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, stage }: { id: string; stage: Partial<ValidationStage> }) =>
      settingsApi.updateValidationStage(id, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['validation-stages'] });
      setEditingStageId(null);
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
    onError: (error) => {
      console.error('Failed to delete validation stage:', error);
    },
  });

  // Sort stages by priority
  const sortedStages = [...stages].sort((a, b) => a.priority - b.priority);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = sortedStages.findIndex((stage) => stage.id === active.id);
      const newIndex = sortedStages.findIndex((stage) => stage.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        // Create new array with reordered items
        const reorderedStages = arrayMove(sortedStages, oldIndex, newIndex);

        // Update priorities based on new positions
        const updates = reorderedStages.map((stage, index) => ({
          id: stage.id,
          priority: index,
        }));

        try {
          // Update priorities sequentially to avoid conflicts
          for (const { id, priority } of updates) {
            await updateMutation.mutateAsync({
              id,
              stage: { priority },
            });
          }
        } catch (error) {
          console.error('Failed to reorder stages:', error);
        }
      }
    }
  };

  const handleAddStage = (stage: Omit<ValidationStage, 'id'>) => {
    addMutation.mutate(stage);
  };

  const handleUpdateStage = (stageId: string, updates: Partial<ValidationStage>) => {
    updateMutation.mutate({ id: stageId, stage: updates });
  };

  const handleToggleEnabled = (stageId: string, enabled: boolean) => {
    updateMutation.mutate({ id: stageId, stage: { enabled } });
  };

  const handleDeleteStage = (stageId: string) => {
    if (window.confirm('Are you sure you want to delete this validation stage? This action cannot be undone.')) {
      deleteMutation.mutate(stageId);
    }
  };

  const handleResetPriorities = () => {
    if (window.confirm('Reset all stage priorities to sequential order (0, 1, 2, ...)? This will reorder stages based on their current position.')) {
      sortedStages.forEach((stage, index) => {
        if (stage.priority !== index) {
          updateMutation.mutate({ id: stage.id, stage: { priority: index } });
        }
      });
    }
  };

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="h-6 w-6 text-red-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Stage Management</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Configure validation pipeline stages with advanced editing and reordering
            </p>
          </div>
        </div>
        
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">Failed to load validation stages</p>
                <p className="text-sm">Please check your connection and try again.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Stage Management</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Configure validation pipeline stages with advanced editing and reordering
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {stages.length > 1 && (
            <Button
              variant="outline"
              onClick={handleResetPriorities}
              disabled={isLoading || updateMutation.isPending}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset Priorities
            </Button>
          )}
          
          <Button
            onClick={() => setShowAddForm(true)}
            disabled={showAddForm}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Stage
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Hash className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Stages</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {stages.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Play className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Enabled</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {stages.filter(s => s.enabled).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <Pause className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Disabled</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {stages.filter(s => !s.enabled).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Avg. Timeout</p>
                <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {stages.length > 0 
                    ? `${(stages.reduce((acc, s) => acc + s.timeout, 0) / stages.length / 1000).toFixed(1)}s`
                    : '0s'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Stage Form */}
      {showAddForm && (
        <div className="mb-6">
          <AddStageForm
            onAdd={handleAddStage}
            onCancel={() => setShowAddForm(false)}
            existingStages={stages}
            isLoading={addMutation.isPending}
          />
        </div>
      )}

      {/* Stages List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-3"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : stages.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
                <SettingsIcon className="w-8 h-8 text-gray-400" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  No validation stages configured
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                  Get started by adding your first validation stage
                </p>
                <Button onClick={() => setShowAddForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Stage
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedStages.map(stage => stage.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-4">
              {sortedStages.map((stage, index) => (
                <StageCard
                  key={stage.id}
                  stage={stage}
                  _index={index}
                  isEditing={editingStageId === stage.id}
                  onEdit={(stage) => setEditingStageId(stage.id)}
                  onSave={handleUpdateStage}
                  onCancelEdit={() => setEditingStageId(null)}
                  onDelete={handleDeleteStage}
                  onToggleEnabled={handleToggleEnabled}
                  isLoading={updateMutation.isPending || deleteMutation.isPending}
                />
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            {activeId ? (
              <Card className="opacity-90 rotate-2 shadow-2xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-5 h-5 text-gray-400" />
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {sortedStages.find(s => s.id === activeId)?.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Dragging...
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}
    </div>
  );
}