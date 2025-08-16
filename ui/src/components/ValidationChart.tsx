import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ValidationMetrics } from 'shared/types';

interface ValidationChartProps {
  metrics: ValidationMetrics;
}

export function ValidationChart({ metrics }: ValidationChartProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const stageEntries = Object.entries(metrics.stageMetrics);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-gray-900">Stage Performance Overview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stageEntries.map(([stageName, stageMetrics]) => {
            const isDisabled = !stageMetrics.enabled;
            const hasData = stageMetrics.totalRuns > 0;
            
            return (
              <div 
                key={stageName} 
                className={`border-b pb-3 last:border-b-0 transition-colors ${
                  hasData ? 'cursor-pointer hover:bg-gray-50 p-2 rounded' : ''
                }`}
                onClick={() => hasData && setSelectedStage(selectedStage === stageName ? null : stageName)}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${
                      isDisabled 
                        ? 'text-gray-400' 
                        : 'text-gray-900'
                    }`}>
                      {stageMetrics.name || stageName}
                    </span>
                    {isDisabled && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                        Disabled
                      </span>
                    )}
                    {!hasData && stageMetrics.enabled && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                        No Data
                      </span>
                    )}
                  </div>
                  {hasData && (
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
                  )}
                </div>
                {hasData && (
                  <>
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
                      {stageMetrics.totalRuns} total runs • {stageMetrics.successes} successes • {stageMetrics.attempts - stageMetrics.successes} failures
                    </div>
                  </>
                )}
                
                {selectedStage === stageName && hasData && (
                  <div className="mt-3 p-3 bg-gray-50 rounded border">
                    <h4 className="font-medium text-gray-900 mb-2">
                      {stageMetrics.name || stageName} Details
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Success Rate:</span>
                        <div className="font-medium text-gray-900">
                          {(stageMetrics.successRate * 100).toFixed(2)}%
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Average Duration:</span>
                        <div className="font-medium text-gray-900">
                          {(stageMetrics.averageDuration / 1000).toFixed(2)}s
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Total Attempts:</span>
                        <div className="font-medium text-gray-900">
                          {stageMetrics.attempts}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-600">Successes:</span>
                        <div className="font-medium text-green-600">
                          {stageMetrics.successes}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}