import React, { useState } from 'react';
import { BarChart3, Activity, ChevronDown, ChevronRight, FileText, Loader2, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ValidationMetrics, ValidationStageResult } from '../../shared/types';

export function AnalyticsHeader({ refetch }: { refetch: () => void }) {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleRefresh = async () => {
    setIsLoading(true);
    setShowSuccess(false);
    
    try {
      await refetch();
      setShowSuccess(true);
      
      // Hide success notification after 2 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Validation Analytics</h2>
          <p className="text-gray-600">
            Track validation pipeline performance and success rates
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {showSuccess && (
          <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
            <CheckCircle className="h-4 w-4" />
            Updated
          </div>
        )}
        <Button 
          onClick={handleRefresh} 
          variant="outline" 
          size="sm"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Activity className="h-4 w-4 mr-2" />
          )}
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>
    </div>
  );
}

export function MetricsSummary({ metrics }: { metrics: ValidationMetrics }) {
  const totalRuns = metrics.totalRuns || 0;
  const successRate = metrics.successRate || 0;
  const averageDuration = metrics.averageDuration || 0;
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">Total Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">{totalRuns}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">Success Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {(successRate * 100).toFixed(1)}%
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-700">Avg Duration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {(averageDuration / 1000).toFixed(1)}s
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function StageDetail({ stage }: { stage: ValidationStageResult }) {
  const [showLogs, setShowLogs] = useState(false);
  const hasOutput = stage.output && stage.output.trim().length > 0;
  const hasError = stage.error && stage.error.trim().length > 0;
  const hasLogs = hasOutput || hasError;

  return (
    <div className="border border-gray-200 rounded">
      <div 
        className="flex justify-between items-center py-2 px-3 cursor-pointer hover:bg-gray-50"
        onClick={() => hasLogs && setShowLogs(!showLogs)}
      >
        <div className="flex items-center gap-2">
          {stage.success ? (
            <div className="w-2 h-2 bg-green-500 rounded-full" />
          ) : (
            <div className="w-2 h-2 bg-red-500 rounded-full" />
          )}
          <span className="text-sm text-gray-900">
            {stage.name || stage.id}
          </span>
          {hasLogs && (
            <FileText className="w-3 h-3 text-gray-400" />
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 text-xs">
            <span className={stage.success ? 'text-green-600' : 'text-red-600'}>
              {stage.success ? 'PASS' : 'FAIL'}
            </span>
            <span className="text-gray-500">
              {(stage.duration / 1000).toFixed(1)}s
            </span>
          </div>
          {hasLogs && (
            showLogs ? (
              <ChevronDown className="w-4 h-4 text-gray-400" data-testid="chevron-down" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" data-testid="chevron-right" />
            )
          )}
        </div>
      </div>
      
      {showLogs && hasLogs && (
        <div className="border-t border-gray-200 p-3 bg-gray-50">
          {hasError && (
            <div className="mb-3">
              <div className="text-xs font-medium text-red-700 mb-1">Error Output:</div>
              <pre className="text-xs bg-red-50 text-red-800 p-2 rounded border overflow-x-auto whitespace-pre-wrap">
                {stage.error}
              </pre>
            </div>
          )}
          
          {hasOutput && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">
                {hasError ? 'Standard Output:' : 'Output:'}
              </div>
              <pre className="text-xs bg-white text-gray-800 p-2 rounded border overflow-x-auto whitespace-pre-wrap">
                {stage.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}