import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { ValidationRun, ValidationStageResult } from '../../../shared/types';

// Component for stage detail (needed by ValidationRunItem)
function StageDetail({ stage }: { stage: ValidationStageResult }) {
  const [showLogs, setShowLogs] = useState(false);
  const hasOutput = stage.output && stage.output.trim().length > 0;
  const hasError = stage.error && stage.error.trim().length > 0;
  const hasLogs = hasOutput || hasError;

  return (
    <div className="border border-gray-200 rounded" data-testid="stage-detail">
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
            <FileText
              className="w-3 h-3 text-gray-400"
              data-testid="file-icon"
            />
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
          {hasLogs &&
            (showLogs ? (
              <ChevronDown
                className="w-4 h-4 text-gray-400"
                data-testid="chevron-down"
              />
            ) : (
              <ChevronRight
                className="w-4 h-4 text-gray-400"
                data-testid="chevron-right"
              />
            ))}
        </div>
      </div>

      {showLogs && hasLogs && (
        <div
          className="border-t border-gray-200 p-3 bg-gray-50"
          data-testid="stage-logs"
        >
          {hasError && (
            <div className="mb-3">
              <div className="text-xs font-medium text-red-700 mb-1">
                Error Output:
              </div>
              <pre
                className="text-xs bg-red-50 text-red-800 p-2 rounded border overflow-x-auto whitespace-pre-wrap"
                data-testid="error-output"
              >
                {stage.error}
              </pre>
            </div>
          )}

          {hasOutput && (
            <div>
              <div className="text-xs font-medium text-gray-700 mb-1">
                {hasError ? 'Standard Output:' : 'Output:'}
              </div>
              <pre
                className="text-xs bg-white text-gray-800 p-2 rounded border overflow-x-auto whitespace-pre-wrap"
                data-testid="standard-output"
              >
                {stage.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Utility function to generate page numbers for pagination
function getPageNumbers(currentPage: number, totalPages: number): number[] {
  const pages = [];
  const maxVisiblePages = 5;

  if (totalPages <= maxVisiblePages) {
    // Show all pages if total is small
    for (let i = 0; i < totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Show ellipsis pagination for large numbers
    const start = Math.max(0, currentPage - 2);
    const end = Math.min(totalPages - 1, currentPage + 2);

    if (start > 0) {
      pages.push(0);
      if (start > 1) {
        pages.push(-1); // Ellipsis marker
      }
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages - 1) {
      if (end < totalPages - 2) {
        pages.push(-1); // Ellipsis marker
      }
      pages.push(totalPages - 1);
    }
  }

  return pages;
}

// Component for the runs per page selector
function RunsPerPageSelector({
  runsPerPage,
  setRunsPerPage,
  totalRuns,
}: {
  runsPerPage: number;
  setRunsPerPage: (value: number) => void;
  totalRuns: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-600">Show:</label>
      <select
        value={runsPerPage}
        onChange={(e) => setRunsPerPage(Number(e.target.value))}
        className="border border-gray-300 rounded px-2 py-1 text-sm text-gray-900 bg-white"
        data-testid="runs-per-page-select"
      >
        <option value={5}>5</option>
        <option value={10}>10</option>
        <option value={25}>25</option>
        <option value={50}>50</option>
        <option value={totalRuns}>All ({totalRuns})</option>
      </select>
      <span className="text-sm text-gray-600">per page</span>
    </div>
  );
}

// Component for pagination controls
function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  startIndex,
  runsPerPage,
  totalRuns,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  startIndex: number;
  runsPerPage: number;
  totalRuns: number;
}) {
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div
      className="flex items-center justify-between"
      data-testid="pagination-controls"
    >
      <div className="flex items-center gap-1">
        {/* First and Previous buttons */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(0)}
          disabled={currentPage === 0}
          className="px-2"
        >
          ⟨⟨
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(0, currentPage - 1))}
          disabled={currentPage === 0}
        >
          Previous
        </Button>

        {/* Page numbers */}
        <div className="flex items-center gap-1 mx-2">
          {pageNumbers.map((pageNum, index) =>
            pageNum === -1 ? (
              <span key={`ellipsis-${index}`} className="px-2 text-gray-400">
                ...
              </span>
            ) : (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? 'default' : 'outline'}
                size="sm"
                onClick={() => onPageChange(pageNum)}
                className="min-w-[2rem] px-2"
              >
                {pageNum + 1}
              </Button>
            )
          )}
        </div>

        {/* Next and Last buttons */}
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onPageChange(Math.min(totalPages - 1, currentPage + 1))
          }
          disabled={currentPage === totalPages - 1}
        >
          Next
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages - 1)}
          disabled={currentPage === totalPages - 1}
          className="px-2"
        >
          ⟩⟩
        </Button>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span>
          Showing {startIndex + 1}-
          {Math.min(startIndex + runsPerPage, totalRuns)} of {totalRuns}
        </span>
      </div>
    </div>
  );
}

// Component for individual validation run item
function ValidationRunItem({
  run,
  isExpanded,
  onToggleExpand,
}: {
  run: ValidationRun;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const navigate = useNavigate();
  const successfulStages = run.stages.filter((stage) => stage.success).length;
  const failedStages = run.stages.length - successfulStages;

  return (
    <div data-testid="validation-run-item">
      <div
        className={`p-3 rounded border-l-4 cursor-pointer transition-colors hover:bg-gray-50 ${
          run.success
            ? 'border-green-500 bg-green-50'
            : 'border-red-500 bg-red-50'
        }`}
        onClick={onToggleExpand}
      >
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            {run.success ? (
              <div className="w-2 h-2 bg-green-500 rounded-full" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500" />
            )}
            <div>
              <span className="font-medium text-gray-900">
                {run.stages.length} stages
              </span>
              <div className="text-xs text-gray-600">
                {successfulStages} passed • {failedStages} failed
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm text-gray-500">
                {new Date(run.timestamp).toLocaleString()}
              </div>
              <div className="text-xs text-gray-600">
                {(run.duration ? run.duration / 1000 : 0).toFixed(1)}s
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/validation-run/${run.id}`);
              }}
              className="flex items-center gap-2"
            >
              <ExternalLink className="w-3 h-3" />
              View Details
            </Button>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-2 ml-4 p-3 bg-gray-50 rounded border">
          <h4 className="font-medium text-gray-900 mb-2">Stage Details</h4>
          <div className="space-y-2">
            {run.stages.map((stage, index) => (
              <StageDetail key={`${stage.id}-${index}`} stage={stage} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Component for the list of validation runs
function ValidationRunsList({
  runs,
  expandedRun,
  onToggleExpand,
}: {
  runs: ValidationRun[];
  expandedRun: string | null;
  onToggleExpand: (runId: string) => void;
}) {
  if (runs.length === 0) {
    return <p className="text-gray-500">No validation runs found</p>;
  }

  return (
    <div className="space-y-2" data-testid="validation-runs-list">
      {runs.map((run) => (
        <ValidationRunItem
          key={run.id}
          run={run}
          isExpanded={expandedRun === run.id}
          onToggleExpand={() => onToggleExpand(run.id)}
        />
      ))}
    </div>
  );
}

export function RecentRuns({ runs }: { runs: ValidationRun[] }) {
  const [currentPage, setCurrentPage] = useState(0);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [runsPerPage, setRunsPerPage] = useState(5);

  const totalPages = Math.ceil(runs.length / runsPerPage);
  const startIndex = currentPage * runsPerPage;
  const currentRuns = runs.slice(startIndex, startIndex + runsPerPage);

  // Reset to first page when runs per page changes
  React.useEffect(() => {
    setCurrentPage(0);
  }, [runsPerPage]);

  const handleToggleExpand = (runId: string) => {
    setExpandedRun(expandedRun === runId ? null : runId);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <CardTitle className="text-gray-900">
              Recent Validation Runs
            </CardTitle>
            <RunsPerPageSelector
              runsPerPage={runsPerPage}
              setRunsPerPage={setRunsPerPage}
              totalRuns={runs.length}
            />
          </div>

          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            startIndex={startIndex}
            runsPerPage={runsPerPage}
            totalRuns={runs.length}
          />
        </div>
      </CardHeader>
      <CardContent>
        <ValidationRunsList
          runs={currentRuns}
          expandedRun={expandedRun}
          onToggleExpand={handleToggleExpand}
        />
      </CardContent>
    </Card>
  );
}
