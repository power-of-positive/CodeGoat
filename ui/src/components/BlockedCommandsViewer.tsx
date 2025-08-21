import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { claudeWorkersApi } from '../lib/api';

interface BlockedCommandsViewerProps {
  workerId: string;
  onClose: () => void;
}

export function BlockedCommandsViewer({ workerId, onClose }: BlockedCommandsViewerProps) {
  const { data: blockedData, isLoading } = useQuery({
    queryKey: ['worker-blocked-commands', workerId],
    queryFn: () => claudeWorkersApi.getBlockedCommands(workerId),
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-orange-600" />
            Blocked Commands - {workerId.split('-').pop()}
          </CardTitle>
          <Button size="sm" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-gray-600">Loading blocked commands...</div>
          </div>
        ) : (
          <div>
            {blockedData && blockedData.blockedCommandsList.length > 0 ? (
              <div className="space-y-3">
                <div className="text-sm text-gray-600 mb-4">
                  Total blocked commands:{' '}
                  <span className="font-semibold text-orange-600">
                    {blockedData.blockedCommands}
                  </span>
                  {!blockedData.hasPermissionSystem && (
                    <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                      Permission system disabled
                    </span>
                  )}
                </div>
                {blockedData.blockedCommandsList.map((blocked, index) => (
                  <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-mono text-sm text-red-800 bg-red-100 px-2 py-1 rounded">
                        {blocked.command}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(blocked.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm text-red-700 mb-1">
                      <strong>Reason:</strong> {blocked.reason}
                    </div>
                    {blocked.suggestion && (
                      <div className="text-sm text-gray-600">
                        <strong>Suggestion:</strong> {blocked.suggestion}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ShieldAlert className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <div className="text-sm text-gray-600">No blocked commands</div>
                {blockedData && !blockedData.hasPermissionSystem && (
                  <div className="text-xs text-yellow-600 mt-2">
                    Permission system is not active for this worker
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}