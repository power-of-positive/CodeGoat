import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Badge } from '../../../shared/ui/badge';
import {
  FileText,
  Plus,
  Minus,
  FileEdit,
  FolderGit2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

interface DiffViewerProps {
  diff?: string;
  diffStat?: string;
  changedFiles?: Array<{ status: string; path: string }>;
  worktreePath?: string;
}

// Parse a unified diff into structured data
function parseDiff(diff: string) {
  const files: Array<{
    path: string;
    hunks: Array<{
      header: string;
      lines: Array<{ type: 'add' | 'remove' | 'context'; content: string; lineNumber?: number }>;
    }>;
  }> = [];

  const lines = diff.split('\n');
  let currentFile: (typeof files)[0] | null = null;
  let currentHunk: (typeof currentFile)['hunks'][0] | null = null;
  let addLineNumber = 0;
  let removeLineNumber = 0;

  for (const line of lines) {
    // File header
    if (line.startsWith('diff --git')) {
      if (currentFile && currentHunk) {
        currentFile.hunks.push(currentHunk);
      }
      currentFile = { path: '', hunks: [] };
      currentHunk = null;
      files.push(currentFile);
    } else if (line.startsWith('--- ') || line.startsWith('+++ ')) {
      if (currentFile && line.startsWith('+++ ')) {
        const match = line.match(/\+\+\+ b\/(.*)/);
        if (match) {
          currentFile.path = match[1];
        }
      }
    } else if (line.startsWith('@@')) {
      // Hunk header
      if (currentFile && currentHunk) {
        currentFile.hunks.push(currentHunk);
      }
      const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
      if (match) {
        removeLineNumber = parseInt(match[1], 10);
        addLineNumber = parseInt(match[2], 10);
      }
      currentHunk = { header: line, lines: [] };
    } else if (currentHunk) {
      // Diff lines
      if (line.startsWith('+')) {
        currentHunk.lines.push({
          type: 'add',
          content: line.substring(1),
          lineNumber: addLineNumber++,
        });
      } else if (line.startsWith('-')) {
        currentHunk.lines.push({
          type: 'remove',
          content: line.substring(1),
          lineNumber: removeLineNumber++,
        });
      } else if (line.startsWith(' ')) {
        currentHunk.lines.push({
          type: 'context',
          content: line.substring(1),
        });
        addLineNumber++;
        removeLineNumber++;
      }
    }
  }

  // Push last hunk
  if (currentFile && currentHunk) {
    currentFile.hunks.push(currentHunk);
  }

  return files.filter(f => f.path);
}

// Get status icon and color
function getFileStatusIcon(status: string) {
  switch (status.toUpperCase()) {
    case 'A':
      return <Plus className="h-4 w-4 text-green-600" />;
    case 'M':
      return <FileEdit className="h-4 w-4 text-blue-600" />;
    case 'D':
      return <Minus className="h-4 w-4 text-red-600" />;
    default:
      return <FileText className="h-4 w-4 text-gray-600" />;
  }
}

function getFileStatusBadge(status: string) {
  switch (status.toUpperCase()) {
    case 'A':
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
          Added
        </Badge>
      );
    case 'M':
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
          Modified
        </Badge>
      );
    case 'D':
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
          Deleted
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
          Changed
        </Badge>
      );
  }
}

export function DiffViewer({
  diff = '',
  diffStat,
  changedFiles = [],
  worktreePath,
}: DiffViewerProps) {
  const parsedDiff = React.useMemo(() => parseDiff(diff ?? ''), [diff]);
  const [expandedFiles, setExpandedFiles] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setExpandedFiles(prev => {
      const next: Record<string, boolean> = {};
      parsedDiff.forEach(file => {
        next[file.path] = prev[file.path] ?? true;
      });
      return next;
    });
  }, [parsedDiff]);

  const toggleFile = React.useCallback((path: string) => {
    setExpandedFiles(prev => ({
      ...prev,
      [path]: !(prev[path] ?? true),
    }));
  }, []);

  const hasTextualDiff = diff.trim() !== '';
  const hasAnyChanges = hasTextualDiff || changedFiles.length > 0;

  if (!hasAnyChanges) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Changes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-8">No changes detected</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-full overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Changes ({changedFiles.length} file{changedFiles.length !== 1 ? 's' : ''})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {worktreePath && (
          <div className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 border border-dashed border-gray-200 px-3 py-2 rounded">
            <FolderGit2 className="h-3 w-3 text-gray-500" />
            <span className="font-mono truncate">{worktreePath}</span>
          </div>
        )}

        {/* Stats */}
        {diffStat && diffStat.trim() !== '' && (
          <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md">
            <pre className="text-xs font-mono whitespace-pre-wrap text-gray-700 dark:text-gray-300">
              {diffStat}
            </pre>
          </div>
        )}

        {/* Changed Files List */}
        {changedFiles.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Changed Files
            </h3>
            <div className="space-y-1">
              {changedFiles.map(file => {
                const key = `${file.status}-${file.path}`;
                const isCollapsed = expandedFiles[file.path] === false;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => toggleFile(file.path)}
                    className={`w-full flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-left transition hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      isCollapsed ? 'opacity-75' : ''
                    }`}
                  >
                    {getFileStatusIcon(file.status)}
                    <span className="text-sm font-mono flex-1 text-gray-700 dark:text-gray-300">
                      {file.path}
                    </span>
                    {isCollapsed && (
                      <span className="text-[10px] uppercase tracking-wide text-gray-500">
                        Collapsed
                      </span>
                    )}
                    {getFileStatusBadge(file.status)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Diff Content */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Diff</h3>
          {parsedDiff.length === 0 ? (
            <p className="text-xs text-gray-500">
              No textual diff available. Files may be binary or staged without textual changes.
            </p>
          ) : (
            parsedDiff.map(file => {
              const isExpanded = expandedFiles[file.path] ?? true;

              return (
                <div
                  key={file.path}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                >
                  {/* File Header */}
                  <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 font-mono text-sm font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3">
                    <span className="truncate">{file.path}</span>
                    <button
                      type="button"
                      onClick={() => toggleFile(file.path)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3 w-3" />
                      ) : (
                        <ChevronRight className="h-3 w-3" />
                      )}
                      {isExpanded ? 'Collapse' : 'Expand'}
                    </button>
                  </div>

                  {!isExpanded ? (
                    <div className="px-4 py-3 text-xs text-gray-500 bg-white dark:bg-gray-900">
                      Diff collapsed. Click &quot;Expand&quot; to view changes.
                    </div>
                  ) : file.hunks.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-gray-500 bg-white dark:bg-gray-900">
                      No visible diff hunks for this file.
                    </div>
                  ) : (
                    file.hunks.map((hunk, hunkIdx) => (
                      <div key={hunkIdx} className="font-mono text-xs">
                        {/* Hunk Header */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-1 text-blue-700 dark:text-blue-300 border-b border-gray-200 dark:border-gray-700">
                          {hunk.header}
                        </div>

                        {/* Diff Lines */}
                        <div>
                          {hunk.lines.map((line, lineIdx) => {
                            let bgColor = '';
                            let textColor = 'text-gray-800 dark:text-gray-200';
                            let prefix = ' ';

                            if (line.type === 'add') {
                              bgColor = 'bg-green-50 dark:bg-green-900/20';
                              textColor = 'text-green-800 dark:text-green-200';
                              prefix = '+';
                            } else if (line.type === 'remove') {
                              bgColor = 'bg-red-50 dark:bg-red-900/20';
                              textColor = 'text-red-800 dark:text-red-200';
                              prefix = '-';
                            }

                            return (
                              <div
                                key={lineIdx}
                                className={`${bgColor} ${textColor} px-4 py-0.5 hover:bg-opacity-80 flex`}
                              >
                                <span className="inline-block w-6 text-gray-500 dark:text-gray-400 select-none">
                                  {prefix}
                                </span>
                                <span className="flex-1 whitespace-pre-wrap break-all">
                                  {line.content}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
