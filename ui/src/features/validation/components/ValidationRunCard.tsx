import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, Calendar, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '../../../shared/ui/card';

interface ValidationStageData {
  id: string;
  name: string;
  success: boolean;
  duration: number;
}

interface ValidationRunData {
  id: string;
  success: boolean;
  duration: number;
  timestamp: string;
  stages?: string;
}

interface ValidationRunCardProps {
  run: ValidationRunData;
}

export function ValidationRunCard({ run }: ValidationRunCardProps) {
  const stages: ValidationStageData[] = JSON.parse(run.stages || '[]');
  const successRate =
    stages.length > 0
      ? Math.round((stages.filter(s => s.success).length / stages.length) * 100)
      : 0;

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {run.success ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm font-medium">{run.success ? 'Passed' : 'Failed'}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {run.duration}ms
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {new Date(run.timestamp).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
          <div>
            <div className="text-xs text-gray-500">Total Stages</div>
            <div className="text-lg font-semibold">{stages.length}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Success Rate</div>
            <div className="text-lg font-semibold">{successRate}%</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">Passed/Failed</div>
            <div className="text-lg font-semibold">
              <span className="text-green-600">{stages.filter(s => s.success).length}</span>/
              <span className="text-red-600">{stages.filter(s => !s.success).length}</span>
            </div>
          </div>
        </div>

        {stages.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-2">Stages</div>
            <div className="space-y-1">
              {stages.slice(0, 3).map((stage, index: number) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {stage.success ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-600" />
                    )}
                    <span className="truncate">{stage.name}</span>
                  </div>
                  <span className="text-gray-500">{stage.duration}ms</span>
                </div>
              ))}
              {stages.length > 3 && (
                <div className="text-xs text-gray-500">+{stages.length - 3} more stages</div>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Link
            to={`/validation-run/${run.id}`}
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            View Details
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
