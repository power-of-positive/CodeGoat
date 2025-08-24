import React, { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  Play,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent, CardHeader } from '../../../shared/ui/card';
import { Badge } from '../../../shared/ui/badge';

interface BDDScenario {
  id: string;
  todoTaskId: string;
  title: string;
  feature: string;
  description: string;
  gherkinContent: string;
  status: 'pending' | 'passed' | 'failed' | 'skipped';
  executedAt?: string;
  executionDuration?: number;
  errorMessage?: string;
  playwrightTestFile?: string;
  playwrightTestName?: string;
  createdAt: string;
  updatedAt: string;
  todoTask?: {
    id: string;
    content: string;
  };
}

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  passed: 'bg-green-100 text-green-800 border-green-300',
  failed: 'bg-red-100 text-red-800 border-red-300',
  skipped: 'bg-gray-100 text-gray-800 border-gray-300',
} as const;

const statusIcons = {
  pending: Clock,
  passed: CheckCircle,
  failed: XCircle,
  skipped: AlertCircle,
} as const;

export function ScenarioCard({ scenario, onExecute }: { 
  scenario: BDDScenario; 
  onExecute: (id: string) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const StatusIcon = statusIcons[scenario.status];

  const formatDuration = (duration?: number) => {
    if (!duration) {
      return null;
    }
    return duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(1)}s`;
  };

  const formatExecutionTime = (timestamp?: string) => {
    if (!timestamp) {
      return null;
    }
    return new Date(timestamp).toLocaleString();
  };

  return (
    <>
      <Card 
        className="hover:shadow-md transition-shadow cursor-pointer" 
        data-testid="scenario-card"
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 
                className="font-medium text-sm leading-tight mb-2"
                data-testid="scenario-title"
              >
                {scenario.title}
              </h3>
              <p className="text-xs text-gray-600 mb-2">{scenario.feature}</p>
              <div className="flex items-center gap-2">
                <Badge 
                  className={`text-xs ${statusColors[scenario.status]}`}
                  data-testid="scenario-status"
                  data-status={scenario.status}
                >
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {scenario.status}
                </Badge>
                {scenario.executionDuration && (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    <span data-testid="execution-duration">
                      {formatDuration(scenario.executionDuration)}
                    </span>
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setShowDetails(true)}
                title="View Details"
              >
                <Eye className="h-3 w-3" />
              </Button>
              {scenario.status === 'pending' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => onExecute(scenario.id)}
                  title="Execute Scenario"
                >
                  <Play className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-0">
          {scenario.errorMessage && (
            <div className="mb-2">
              <Badge variant="destructive" className="text-xs" data-testid="error-indicator">
                Error
              </Badge>
            </div>
          )}
          
          <div className="text-xs text-gray-500">
            {scenario.executedAt && (
              <p>Executed: {formatExecutionTime(scenario.executedAt)}</p>
            )}
            {scenario.playwrightTestFile && (
              <p className="flex items-center gap-1">
                <ExternalLink className="h-3 w-3" />
                Linked to: {scenario.playwrightTestFile}
              </p>
            )}
            {scenario.todoTask && (
              <p>Task: {scenario.todoTask.content}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Details Modal */}
      {showDetails && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => e.target === e.currentTarget && setShowDetails(false)}
        >
          <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] overflow-auto m-4" role="dialog">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-xl font-semibold">Scenario Details</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                >
                  Close
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title:</label>
                  <p className="text-sm">{scenario.title}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Feature:</label>
                  <p className="text-sm">{scenario.feature}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status:</label>
                  <Badge className={`${statusColors[scenario.status]}`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {scenario.status}
                  </Badge>
                </div>

                {scenario.errorMessage && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Error Message:</label>
                    <p className="text-sm text-red-600" data-testid="error-message">
                      {scenario.errorMessage}
                    </p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gherkin Content:</label>
                  <pre 
                    className="bg-gray-100 p-3 rounded text-xs overflow-auto"
                    data-testid="gherkin-content"
                  >
                    {scenario.gherkinContent}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}