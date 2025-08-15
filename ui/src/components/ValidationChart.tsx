import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ValidationMetrics } from 'shared/types';

interface ValidationChartProps {
  metrics: ValidationMetrics;
}

export function ValidationChart({ metrics }: ValidationChartProps) {
  const stageEntries = Object.entries(metrics.stageMetrics);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stage Performance Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stageEntries.map(([stageName, stageMetrics]) => (
            <div key={stageName} className="border-b pb-3 last:border-b-0">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">{stageName}</span>
                <div className="flex items-center gap-4 text-sm">
                  <span className={`font-medium ${
                    stageMetrics.successRate > 0.8 ? 'text-green-600' : 
                    stageMetrics.successRate > 0.5 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {(stageMetrics.successRate * 100).toFixed(1)}% success
                  </span>
                  <span className="text-gray-600">
                    {(stageMetrics.averageDuration / 1000).toFixed(1)}s avg
                  </span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    stageMetrics.successRate > 0.8 ? 'bg-green-500' : 
                    stageMetrics.successRate > 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${stageMetrics.successRate * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {stageMetrics.totalRuns} total runs
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}