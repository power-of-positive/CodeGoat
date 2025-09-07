import React, { useState } from 'react';

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

interface ScenarioModalProps {
  scenario: BDDScenario;
  isOpen: boolean;
  onClose: () => void;
}

function ScenarioModal({ scenario, isOpen, onClose }: ScenarioModalProps) {
  if (!isOpen) {
    return null;
  }

  const handleBackdropClick = () => {
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        className="bg-white p-6 rounded-lg max-w-2xl w-full m-4 max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 data-testid="modal-title" className="text-xl font-semibold">
            Scenario Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            data-testid="close-modal"
          >
            Close
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <strong>Title:</strong> <span data-testid="modal-scenario-title">{scenario.title}</span>
          </div>

          <div>
            <strong>Feature:</strong> <span data-testid="modal-feature">{scenario.feature}</span>
          </div>

          <div>
            <strong>Status:</strong> <span data-testid="modal-status">{scenario.status}</span>
          </div>

          <div>
            <strong>Description:</strong>{' '}
            <span data-testid="modal-description">{scenario.description}</span>
          </div>

          {scenario.executionDuration && (
            <div>
              <strong>Duration:</strong>{' '}
              <span data-testid="modal-duration">
                {scenario.executionDuration < 1000
                  ? `${scenario.executionDuration}ms`
                  : `${(scenario.executionDuration / 1000).toFixed(1)}s`}
              </span>
            </div>
          )}

          {scenario.executedAt && (
            <div>
              <strong>Executed:</strong>{' '}
              <span data-testid="modal-executed-at">
                {new Date(scenario.executedAt).toLocaleString()}
              </span>
            </div>
          )}

          {scenario.playwrightTestFile && (
            <div>
              <strong>Linked to:</strong>{' '}
              <span data-testid="modal-test-file">{scenario.playwrightTestFile}</span>
            </div>
          )}

          {scenario.todoTask && (
            <div>
              <strong>Task:</strong>{' '}
              <span data-testid="modal-task">{scenario.todoTask.content}</span>
            </div>
          )}

          {scenario.errorMessage && (
            <div>
              <strong>Error Message:</strong>{' '}
              <span data-testid="modal-error" className="text-red-600">
                {scenario.errorMessage}
              </span>
            </div>
          )}

          {scenario.gherkinContent && (
            <div>
              <strong>Gherkin Content:</strong>
              <pre
                data-testid="gherkin-content"
                className="bg-gray-100 p-3 rounded text-sm mt-2 whitespace-pre-wrap"
              >
                {scenario.gherkinContent}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ScenarioCard({
  scenario,
  onExecute,
}: {
  scenario: BDDScenario;
  onExecute: (id: string) => void;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Normalize status for data attributes and conditions (uppercase to lowercase)
  const normalizedStatus = scenario.status.toLowerCase();

  // Status styling
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'passed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'skipped':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      default: // pending
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  // Status icons
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <div data-testid="check-circle-icon">✓</div>;
      case 'failed':
        return <div data-testid="x-circle-icon">✗</div>;
      case 'skipped':
        return <div data-testid="alert-circle-icon">!</div>;
      default: // pending
        return <div data-testid="clock-icon">⏰</div>;
    }
  };

  // Format execution duration
  const formatDuration = (duration?: number) => {
    if (!duration) {
      return null;
    }
    return duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(1)}s`;
  };

  return (
    <>
      <div className="p-4 border rounded" data-testid="scenario-card">
        <h3 data-testid="scenario-title">{scenario.title}</h3>
        <p className="text-sm text-gray-600">{scenario.feature}</p>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={`inline-block px-2 py-1 text-xs rounded ${getStatusStyles(normalizedStatus)}`}
            data-testid="scenario-status"
            data-status={normalizedStatus}
          >
            {normalizedStatus}
          </span>
          {getStatusIcon(normalizedStatus)}
          {scenario.executionDuration && (
            <span data-testid="execution-duration" className="text-xs text-gray-500">
              {formatDuration(scenario.executionDuration)}
            </span>
          )}
        </div>

        {/* Error indicator */}
        {scenario.errorMessage && (
          <div className="mt-2 flex items-center gap-1">
            <div data-testid="error-indicator" className="text-red-600 text-xs font-semibold">
              Error
            </div>
            <div data-testid="error-message" className="text-xs text-red-600">
              {scenario.errorMessage}
            </div>
          </div>
        )}

        {/* Execution timestamp */}
        {scenario.executedAt && (
          <div className="mt-2 text-xs text-gray-500">
            <span>Executed:</span> {new Date(scenario.executedAt).toLocaleString()}
          </div>
        )}

        {/* Playwright test file link */}
        {scenario.playwrightTestFile && (
          <div className="mt-2 text-xs text-blue-600 flex items-center gap-1">
            <span>Linked to:</span>
            <span>{scenario.playwrightTestFile}</span>
            <div data-testid="external-link-icon">🔗</div>
          </div>
        )}

        {/* Associated task */}
        {scenario.todoTask && (
          <div className="mt-2 text-xs text-gray-700">
            <span>Task:</span> {scenario.todoTask.content}
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-3 flex gap-2">
          {/* View Details button - always show */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1 text-xs bg-gray-500 text-white rounded flex items-center gap-1"
            title="View Details"
          >
            <div data-testid="eye-icon">👁️</div>
            View Details
          </button>

          {/* Execute button - for pending and failed scenarios */}
          {(scenario.status === 'PENDING' || scenario.status === 'FAILED') && (
            <button
              onClick={() => onExecute(scenario.id)}
              className="px-3 py-1 text-xs bg-blue-500 text-white rounded flex items-center gap-1"
              title="Execute Scenario"
            >
              <div data-testid="play-icon">▶️</div>
              Execute Scenario
            </button>
          )}
        </div>
      </div>

      {/* Modal */}
      <ScenarioModal
        scenario={scenario}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
