import React, { useState } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Code,
  FileText,
  History
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { BDDScenario } from '../../shared/types';
import BDDExecutionHistory from './BDDExecutionHistory';

interface BDDScenarioManagerProps {
  taskId: string;
  scenarios: BDDScenario[];
  onAddScenario: (scenario: Omit<BDDScenario, 'id'>) => void;
  onUpdateScenario: (id: string, scenario: Partial<BDDScenario>) => void;
  onDeleteScenario: (id: string) => void;
  readonly?: boolean;
}

// Status configuration for BDD scenarios
const scenarioStatusConfig = {
  pending: {
    icon: Clock,
    color: 'bg-gray-100 text-gray-800 border-gray-300',
    label: 'Pending'
  },
  passed: {
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 border-green-300',
    label: 'Passed'
  },
  failed: {
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-300',
    label: 'Failed'
  },
  skipped: {
    icon: AlertTriangle,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    label: 'Skipped'
  }
} as const;

interface BDDScenarioFormProps {
  scenario?: BDDScenario;
  onSave: (scenario: Omit<BDDScenario, 'id'> | BDDScenario) => void;
  onCancel: () => void;
}

function BDDScenarioForm({ scenario, onSave, onCancel }: BDDScenarioFormProps) {
  const [title, setTitle] = useState(scenario?.title || '');
  const [feature, setFeature] = useState(scenario?.feature || '');
  const [description, setDescription] = useState(scenario?.description || '');
  const [gherkinContent, setGherkinContent] = useState(scenario?.gherkinContent || '');
  const [status, setStatus] = useState<BDDScenario['status']>(scenario?.status || 'pending');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !feature.trim() || !gherkinContent.trim()) return;

    const scenarioData = {
      title: title.trim(),
      feature: feature.trim(),
      description: description.trim(),
      gherkinContent: gherkinContent.trim(),
      status,
      ...(scenario && { 
        id: scenario.id,
        executedAt: scenario.executedAt,
        executionDuration: scenario.executionDuration,
        errorMessage: scenario.errorMessage
      })
    };

    onSave(scenarioData);
  };

  const gherkinTemplate = `Feature: ${feature || 'Feature Name'}
  As a user
  I want to [goal]
  So that [benefit]

  Scenario: ${title || 'Scenario Title'}
    Given [initial context]
    When [action]
    Then [expected outcome]`;

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-sm">
          {scenario ? 'Edit BDD Scenario' : 'Create New BDD Scenario'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="scenario-title" className="block text-sm font-medium text-gray-700 mb-1">
                Scenario Title
              </label>
              <input
                id="scenario-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                placeholder="e.g., Creating a new task"
                required
              />
            </div>
            
            <div>
              <label htmlFor="feature-name" className="block text-sm font-medium text-gray-700 mb-1">
                Feature Name
              </label>
              <input
                id="feature-name"
                type="text"
                value={feature}
                onChange={(e) => setFeature(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                placeholder="e.g., Task Management"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm h-20"
              placeholder="Brief description of what this scenario tests..."
            />
          </div>

          <div>
            <label htmlFor="gherkin-content" className="block text-sm font-medium text-gray-700 mb-1">
              Gherkin Content
            </label>
            <textarea
              id="gherkin-content"
              value={gherkinContent}
              onChange={(e) => setGherkinContent(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md text-sm h-40 font-mono"
              placeholder={gherkinTemplate}
              required
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as BDDScenario['status'])}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="pending">Pending</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="skipped">Skipped</option>
            </select>
          </div>

          <div className="flex space-x-2">
            <Button type="submit" size="sm">
              {scenario ? 'Update Scenario' : 'Add Scenario'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function BDDScenarioCard({ 
  taskId,
  scenario, 
  onEdit, 
  onDelete, 
  readonly 
}: { 
  taskId: string;
  scenario: BDDScenario;
  onEdit: () => void;
  onDelete: () => void;
  readonly?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const statusConfig = scenarioStatusConfig[scenario.status];
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="mb-2">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-gray-900 text-sm">{scenario.title}</h4>
              <Badge variant="outline" className={`${statusConfig.color} text-xs`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            
            <div className="text-xs text-gray-600 mb-2">
              <span className="inline-flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Feature: {scenario.feature}
              </span>
            </div>

            {scenario.description && (
              <p className="text-sm text-gray-700 mb-2">{scenario.description}</p>
            )}

            {scenario.executedAt && (
              <div className="text-xs text-gray-500 mb-2">
                Executed: {new Date(scenario.executedAt).toLocaleString()}
                {scenario.executionDuration && (
                  <span className="ml-2">Duration: {scenario.executionDuration}ms</span>
                )}
              </div>
            )}

            {scenario.errorMessage && (
              <div className="text-xs text-red-600 bg-red-50 p-2 rounded mb-2">
                Error: {scenario.errorMessage}
              </div>
            )}
          </div>

          {!readonly && (
            <div className="flex space-x-1 ml-2">
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Edit className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="destructive" onClick={onDelete}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setExpanded(!expanded)}
            className="text-xs"
          >
            <Code className="w-3 h-3 mr-1" />
            {expanded ? 'Hide' : 'Show'} Gherkin Content
          </Button>
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs"
          >
            <History className="w-3 h-3 mr-1" />
            {showHistory ? 'Hide' : 'Show'} Execution History
          </Button>
        </div>

        {expanded && (
          <div className="mt-2 p-3 bg-gray-50 rounded-md">
            <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
              {scenario.gherkinContent}
            </pre>
          </div>
        )}

        {showHistory && (
          <div className="mt-4 border-t pt-4">
            <BDDExecutionHistory 
              taskId={taskId} 
              scenarioId={scenario.id} 
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function BDDScenarioManager({ 
  taskId,
  scenarios, 
  onAddScenario, 
  onUpdateScenario, 
  onDeleteScenario, 
  readonly = false 
}: BDDScenarioManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingScenario, setEditingScenario] = useState<BDDScenario | null>(null);

  const handleAddScenario = (scenarioData: Omit<BDDScenario, 'id'>) => {
    onAddScenario(scenarioData);
    setShowForm(false);
  };

  const handleUpdateScenario = (scenarioData: BDDScenario) => {
    onUpdateScenario(scenarioData.id, scenarioData);
    setEditingScenario(null);
  };

  const scenarioStats = scenarios.reduce((acc, scenario) => {
    acc[scenario.status] = (acc[scenario.status] || 0) + 1;
    return acc;
  }, {} as Record<BDDScenario['status'], number>);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">BDD Scenarios</h3>
          <p className="text-sm text-gray-600">
            Behavior-driven development test scenarios for this task
          </p>
        </div>
        
        {!readonly && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-1" />
            Add Scenario
          </Button>
        )}
      </div>

      {scenarios.length > 0 && (
        <div className="flex gap-2 mb-4">
          {Object.entries(scenarioStats).map(([status, count]) => {
            const config = scenarioStatusConfig[status as BDDScenario['status']];
            const StatusIcon = config.icon;
            return (
              <Badge key={status} variant="outline" className={`${config.color} text-xs`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {config.label}: {count}
              </Badge>
            );
          })}
        </div>
      )}

      {(showForm || editingScenario) && (
        <BDDScenarioForm
          scenario={editingScenario || undefined}
          onSave={editingScenario ? handleUpdateScenario : handleAddScenario}
          onCancel={() => {
            setShowForm(false);
            setEditingScenario(null);
          }}
        />
      )}

      {scenarios.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <h4 className="font-medium text-gray-900 mb-1">No BDD Scenarios</h4>
            <p className="text-sm text-gray-600 mb-3">
              Add BDD scenarios to document and test the expected behavior for this task.
            </p>
            {!readonly && (
              <Button size="sm" onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-1" />
                Add First Scenario
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div>
          {scenarios.map((scenario) => (
            <BDDScenarioCard
              key={scenario.id}
              taskId={taskId}
              scenario={scenario}
              onEdit={() => setEditingScenario(scenario)}
              onDelete={() => onDeleteScenario(scenario.id)}
              readonly={readonly}
            />
          ))}
        </div>
      )}
    </div>
  );
}