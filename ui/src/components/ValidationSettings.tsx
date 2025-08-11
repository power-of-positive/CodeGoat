import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Select } from './ui/Select';
import { 
  Settings as SettingsIcon, 
  Wrench, 
  Plus, 
  Target
} from 'lucide-react';
import { ValidationStage } from './ValidationStage';
import { QUERY_CONFIG } from '../constants/api';
import type { ValidationStage as ValidationStageType, Settings } from '../types/api';

interface ValidationSettingsProps {
  settings: Settings | undefined;
  updateSettingsMutation: {
    mutate: (settings: Settings) => void;
  };
}

export function ValidationSettings({ settings, updateSettingsMutation }: ValidationSettingsProps) {
  const validation = settings?.validation || { stages: [], enableMetrics: true, maxAttempts: 5 };

  const addNewStage = () => {
    const newStage: ValidationStageType = {
      id: `stage-${Date.now()}`,
      name: 'New Validation Stage',
      command: 'echo "Configure your command"',
      timeout: QUERY_CONFIG.defaultStaleTime,
      enabled: true,
      continueOnFailure: false,
      order: validation.stages.length + 1,
    };

    const updatedSettings = {
      ...settings,
      validation: {
        ...validation,
        stages: [...validation.stages, newStage],
      },
    };

    updateSettingsMutation.mutate(updatedSettings);
  };

  const updateStage = (stageId: string, updates: Partial<ValidationStageType>) => {
    const updatedStages = validation.stages.map(stage =>
      stage.id === stageId ? { ...stage, ...updates } : stage
    );

    const updatedSettings = {
      ...settings,
      validation: {
        ...validation,
        stages: updatedStages,
      },
    };

    updateSettingsMutation.mutate(updatedSettings);
  };

  const deleteStage = (stageId: string) => {
    const updatedStages = validation.stages.filter(stage => stage.id !== stageId);

    const updatedSettings = {
      ...settings,
      validation: {
        ...validation,
        stages: updatedStages,
      },
    };

    updateSettingsMutation.mutate(updatedSettings);
  };

  const moveStage = (stageId: string, direction: 'up' | 'down') => {
    const stages = [...validation.stages].sort((a, b) => a.order - b.order);
    const currentIndex = stages.findIndex(s => s.id === stageId);
    
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === stages.length - 1)
    ) {
      return;
    }

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const temp = stages[currentIndex].order;
    stages[currentIndex].order = stages[swapIndex].order;
    stages[swapIndex].order = temp;

    const updatedSettings = {
      ...settings,
      validation: {
        ...validation,
        stages,
      },
    };

    updateSettingsMutation.mutate(updatedSettings);
  };

  return (
    <div className="space-y-6">
      {/* Global Validation Settings */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5" />
          Global Settings
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="enableMetrics">Enable Metrics Collection</Label>
            <Select
              value={validation.enableMetrics ? 'true' : 'false'}
              onValueChange={(value) => {
                const updatedSettings = {
                  ...settings,
                  validation: {
                    ...validation,
                    enableMetrics: value === 'true',
                  },
                };
                updateSettingsMutation.mutate(updatedSettings);
              }}
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="maxAttempts">Max Attempts</Label>
            <Input
              id="maxAttempts"
              type="number"
              min="1"
              max="20"
              value={validation.maxAttempts}
              onChange={(e) => {
                const updatedSettings = {
                  ...settings,
                  validation: {
                    ...validation,
                    maxAttempts: parseInt(e.target.value),
                  },
                };
                updateSettingsMutation.mutate(updatedSettings);
              }}
            />
          </div>
        </div>
      </div>

      {/* Validation Stages */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Validation Stages
          </h3>
          <Button onClick={addNewStage} size="sm">
            <Plus className="w-4 h-4" />
            Add Stage
          </Button>
        </div>

        {validation.stages.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Target className="w-12 h-12 mx-auto mb-4" />
            <p>No validation stages configured</p>
            <p className="text-sm">Add stages to customize your validation pipeline</p>
          </div>
        ) : (
          <div className="space-y-4">
            {validation.stages
              .sort((a, b) => a.order - b.order)
              .map((stage, index) => (
                <ValidationStage
                  key={stage.id}
                  stage={stage}
                  index={index}
                  totalStages={validation.stages.length}
                  onUpdate={updateStage}
                  onDelete={deleteStage}
                  onMove={moveStage}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}