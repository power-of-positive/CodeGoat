import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Button } from '../../../shared/ui/button';
import { BarChart3 } from 'lucide-react';
import { ValidationMetrics, ValidationStage } from '../../../../shared/types';
import { settingsApi } from '../../../shared/lib/api';
import { StageHistoryView } from './StageHistoryView';

interface StageMetrics {
  enabled: boolean;
  totalRuns: number;
  successes: number;
  attempts: number;
  successRate: number;
  averageDuration: number;
  name?: string;
}

interface StageItemProps {
  stageName: string;
  stageMetrics: StageMetrics;
  stageConfig: ValidationStage | undefined;
  selectedStage: string | null;
  onStageClick: (stageName: string) => void;
  onViewHistory: (stageId: string, stageName: string) => void;
}

function StageHeader({
  stageMetrics,
  stageName,
  isDisabled,
  stageConfig,
}: {
  stageMetrics: StageMetrics;
  stageName: string;
  isDisabled: boolean;
  stageConfig: ValidationStage | undefined;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`font-medium ${
          isDisabled ? 'text-gray-400' : 'text-gray-900'
        }`}
      >
        {stageMetrics.name || stageName}
      </span>
      {isDisabled && (
        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
          Disabled
        </span>
      )}
      {!stageMetrics.totalRuns && stageMetrics.enabled && (
        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
          No Data
        </span>
      )}
      {stageConfig && (
        <span
          className={`text-xs px-2 py-1 rounded ${
            stageConfig.continueOnFailure
              ? 'bg-orange-100 text-orange-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {stageConfig.continueOnFailure ? 'Continue on fail' : 'Stop on fail'}
        </span>
      )}
    </div>
  );
}

function StageStats({ stageMetrics }: { stageMetrics: StageMetrics }) {
  return (
    <div className="flex items-center gap-4 text-sm">
      <span
        className={`font-medium ${
          stageMetrics.successRate > 0.8
            ? 'text-green-600'
            : stageMetrics.successRate > 0.5
              ? 'text-yellow-600'
              : 'text-red-600'
        }`}
      >
        {(stageMetrics.successRate * 100).toFixed(1)}% success
      </span>
      <span className="text-gray-600">
        {(stageMetrics.averageDuration / 1000).toFixed(1)}s avg
      </span>
    </div>
  );
}

function StageProgressBar({ stageMetrics }: { stageMetrics: StageMetrics }) {
  return (
    <>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${
            stageMetrics.successRate > 0.8
              ? 'bg-green-500'
              : stageMetrics.successRate > 0.5
                ? 'bg-yellow-500'
                : 'bg-red-500'
          }`}
          style={{ width: `${stageMetrics.successRate * 100}%` }}
        />
      </div>
      <div className="text-xs text-gray-500 mt-1">
        {stageMetrics.totalRuns} total runs • {stageMetrics.successes} successes
        • {stageMetrics.attempts - stageMetrics.successes} failures
      </div>
    </>
  );
}

function StageDetails({
  stageMetrics,
  stageName,
  stageConfig,
  onViewHistory,
}: {
  stageMetrics: StageMetrics;
  stageName: string;
  stageConfig: ValidationStage | undefined;
  onViewHistory: (stageId: string, stageName: string) => void;
}) {
  return (
    <div className="mt-3 p-3 bg-gray-50 rounded border">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-gray-900">
          {stageMetrics.name || stageName} Details
        </h4>
        {stageMetrics.totalRuns > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              onViewHistory(stageName, stageMetrics.name || stageName)
            }
          >
            <BarChart3 className="h-3 w-3 mr-1" />
            View History
          </Button>
        )}
      </div>
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
        {stageConfig && (
          <>
            <div>
              <span className="text-gray-600">Continue on Failure:</span>
              <div
                className={`font-medium ${
                  stageConfig.continueOnFailure
                    ? 'text-orange-600'
                    : 'text-red-600'
                }`}
              >
                {stageConfig.continueOnFailure ? 'Yes' : 'No'}
              </div>
            </div>
            <div>
              <span className="text-gray-600">Timeout:</span>
              <div className="font-medium text-gray-900">
                {(stageConfig.timeout / 1000).toFixed(0)}s
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StageItem({
  stageName,
  stageMetrics,
  stageConfig,
  selectedStage,
  onStageClick,
  onViewHistory,
}: StageItemProps) {
  const isDisabled = !stageMetrics.enabled;
  const hasData = stageMetrics.totalRuns > 0;

  return (
    <div
      className={`border-b pb-3 last:border-b-0 transition-colors ${
        hasData ? 'cursor-pointer hover:bg-gray-50 p-2 rounded' : ''
      }`}
      onClick={() => hasData && onStageClick(stageName)}
    >
      <div className="flex justify-between items-center mb-2">
        <StageHeader
          stageMetrics={stageMetrics}
          stageName={stageName}
          isDisabled={isDisabled}
          stageConfig={stageConfig}
        />
        {hasData && <StageStats stageMetrics={stageMetrics} />}
      </div>
      {hasData && <StageProgressBar stageMetrics={stageMetrics} />}
      {selectedStage === stageName && hasData && (
        <StageDetails
          stageMetrics={stageMetrics}
          stageName={stageName}
          stageConfig={stageConfig}
          onViewHistory={onViewHistory}
        />
      )}
    </div>
  );
}

interface ValidationChartProps {
  metrics: ValidationMetrics;
}

export function ValidationChart({ metrics }: ValidationChartProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [stages, setStages] = useState<ValidationStage[]>([]);
  const [viewingStageHistory, setViewingStageHistory] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const stageEntries = Object.entries(metrics.stageMetrics);

  useEffect(() => {
    // Fetch validation stages configuration to get continueOnFailure info
    settingsApi.getValidationStages().then(setStages).catch(console.error);
  }, []);

  // Create a lookup map for stage configuration
  const stageConfigMap = stages.reduce(
    (acc, stage) => {
      acc[stage.id] = stage;
      return acc;
    },
    {} as Record<string, ValidationStage>
  );

  if (viewingStageHistory) {
    return (
      <StageHistoryView
        stageId={viewingStageHistory.id}
        stageName={viewingStageHistory.name}
        onBack={() => setViewingStageHistory(null)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-gray-900">
          Stage Performance Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {stageEntries.map(([stageName, stageMetrics]) => (
            <StageItem
              key={stageName}
              stageName={stageName}
              stageMetrics={stageMetrics}
              stageConfig={stageConfigMap[stageName]}
              selectedStage={selectedStage}
              onStageClick={(name) =>
                setSelectedStage(selectedStage === name ? null : name)
              }
              onViewHistory={(stageId, name) =>
                setViewingStageHistory({ id: stageId, name })
              }
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
