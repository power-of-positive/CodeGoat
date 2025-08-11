import { useState } from 'react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { 
  Settings as SettingsIcon, 
  Trash2, 
  ArrowUp, 
  ArrowDown,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react';
import type { ValidationStage as ValidationStageType } from '../types/api';

interface ValidationStageProps {
  stage: ValidationStageType;
  index: number;
  totalStages: number;
  onUpdate: (stageId: string, updates: Partial<ValidationStageType>) => void;
  onDelete: (stageId: string) => void;
  onMove: (stageId: string, direction: 'up' | 'down') => void;
}

export function ValidationStage({ 
  stage, 
  index, 
  totalStages, 
  onUpdate, 
  onDelete, 
  onMove 
}: ValidationStageProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleUpdate = (updates: Partial<ValidationStageType>) => {
    onUpdate(stage.id, updates);
    setIsEditing(false);
  };

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-gray-600 px-2 py-1 rounded">
            {index + 1}
          </span>
          <span className="font-medium text-gray-200">{stage.name}</span>
          {stage.enabled ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-gray-400" />
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMove(stage.id, 'up')}
            disabled={index === 0}
          >
            <ArrowUp className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onMove(stage.id, 'down')}
            disabled={index === totalStages - 1}
          >
            <ArrowDown className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            <SettingsIcon className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(stage.id)}
          >
            <Trash2 className="w-3 h-3 text-red-400" />
          </Button>
        </div>
      </div>

      <div className="text-xs text-gray-400 font-mono mb-2">
        {stage.command}
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {stage.timeout}ms timeout
        </span>
        {stage.continueOnFailure && (
          <span className="bg-yellow-900/20 text-yellow-400 px-2 py-0.5 rounded">
            Continue on failure
          </span>
        )}
      </div>

      {isEditing && (
        <div className="mt-4 pt-4 border-t border-gray-600 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`name-${stage.id}`}>Name</Label>
              <Input
                id={`name-${stage.id}`}
                value={stage.name}
                onChange={(e) => handleUpdate({ name: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor={`timeout-${stage.id}`}>Timeout (ms)</Label>
              <Input
                id={`timeout-${stage.id}`}
                type="number"
                min="1000"
                max="300000"
                value={stage.timeout}
                onChange={(e) => handleUpdate({ timeout: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor={`command-${stage.id}`}>Command</Label>
            <Input
              id={`command-${stage.id}`}
              value={stage.command}
              onChange={(e) => handleUpdate({ command: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={stage.enabled}
                onChange={(e) => handleUpdate({ enabled: e.target.checked })}
                className="rounded border-gray-600 bg-gray-700"
              />
              Enabled
            </label>
            
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={stage.continueOnFailure}
                onChange={(e) => handleUpdate({ continueOnFailure: e.target.checked })}
                className="rounded border-gray-600 bg-gray-700"
              />
              Continue on failure
            </label>
          </div>
        </div>
      )}
    </div>
  );
}