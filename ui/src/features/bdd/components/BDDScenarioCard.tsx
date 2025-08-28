import React from 'react';

interface BDDScenario {
  id: string;
  todoTaskId: string;
  title: string;
  feature: string;
  description: string;
  gherkinContent: string;
  status: 'PENDING' | 'PASSED' | 'FAILED' | 'SKIPPED';
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


export function ScenarioCard({ scenario, onExecute }: { 
  scenario: BDDScenario; 
  onExecute: (id: string) => void;
}) {
  // Normalize status for data attributes and conditions (uppercase to lowercase)
  const normalizedStatus = scenario.status.toLowerCase();
  
  return (
    <div className="p-4 border rounded" data-testid="scenario-card">
      <h3 data-testid="scenario-title">{scenario.title}</h3>
      <p className="text-sm text-gray-600">{scenario.feature}</p>
      <div className="mt-2">
        <span 
          className="inline-block px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-800" 
          data-testid="scenario-status" 
          data-status={normalizedStatus}
        >
          {normalizedStatus}
        </span>
      </div>
      {scenario.status === 'PENDING' && (
        <button 
          onClick={() => onExecute(scenario.id)}
          className="mt-2 px-3 py-1 text-xs bg-blue-500 text-white rounded"
        >
          Execute
        </button>
      )}
    </div>
  );
}