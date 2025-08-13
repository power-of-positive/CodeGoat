import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from './ui/button';
import { LogDetailCollapsible } from './LogDetailCollapsible';
import { RefreshCw, Globe, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { QUERY_CONFIG } from '../constants/api';
import { getStatusIcon, getStatusColor } from '../utils/logStatusUtils';

export function RequestLogs() {
  const [expandedLogIndex, setExpandedLogIndex] = useState<number | null>(null);
  const [limit] = useState(100);
  const [offset, setOffset] = useState(0);

  const { data: logsData, isLoading, error, refetch } = useQuery({
    queryKey: ['chat-completion-logs', limit, offset],
    queryFn: () => {
      console.log('Fetching chat completion logs with:', { limit, offset });
      return api.getChatCompletionLogs(limit, offset);
    },
    refetchInterval: QUERY_CONFIG.defaultRefetchInterval,
  });

  // Debug logging
  React.useEffect(() => {
    if (logsData) {
      console.log('Successfully fetched chat completion logs:', logsData);
    }
    if (error) {
      console.error('Failed to fetch chat completion logs:', error);
    }
  }, [logsData, error]);


  const handlePrevious = () => {
    if (offset > 0) {
      setOffset(Math.max(0, offset - limit));
    }
  };

  const handleNext = () => {
    if (logsData && offset + limit < logsData.total) {
      setOffset(offset + limit);
    }
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-400 mb-4">Failed to load chat completion logs</p>
        <Button onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-100">Chat Completion Logs</h2>
          <p className="text-sm text-gray-400">
            View detailed chat completion requests, responses, and metadata
          </p>
        </div>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-gray-400">Loading logs...</p>
        </div>
      ) : logsData?.logs.length === 0 ? (
        <div className="text-center py-8">
          <Globe className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No chat completion logs found</p>
        </div>
      ) : (
        <>
          <div className="bg-gray-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Method
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Path
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {logsData?.logs.map((log, index) => {
                    const isExpanded = expandedLogIndex === index;
                    return (
                      <React.Fragment key={`${log.timestamp}-${index}`}>
                        <tr 
                          className="hover:bg-gray-700 cursor-pointer"
                          onClick={() => setExpandedLogIndex(isExpanded ? null : index)}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              )}
                              {getStatusIcon(log.statusCode)}
                              <span className={`font-mono text-sm ${getStatusColor(log.statusCode)}`}>
                                {log.statusCode || 'N/A'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-mono text-sm text-gray-300">
                              {log.method}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-sm text-gray-300 break-all">
                              {log.path}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-300">
                              {log.duration ? `${log.duration}ms` : 'N/A'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-sm text-gray-300">
                              {new Date(log.timestamp).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-xs text-gray-400">
                              Click to {isExpanded ? 'collapse' : 'expand'}
                            </span>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${log.timestamp}-${index}-details`}>
                            <td colSpan={6} className="p-0">
                              <LogDetailCollapsible log={log} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {logsData && logsData.total > limit && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Showing {offset + 1} to {Math.min(offset + limit, logsData.total)} of {logsData.total} logs
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrevious}
                  disabled={offset === 0}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNext}
                  disabled={offset + limit >= logsData.total}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}