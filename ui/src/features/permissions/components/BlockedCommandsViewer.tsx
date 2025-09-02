import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { claudeWorkersApi } from '../../../shared/lib/api';

interface BlockedCommandsViewerProps {
  workerId: string;
  onClose: () => void;
}

export function BlockedCommandsViewer({ workerId, onClose }: BlockedCommandsViewerProps) {
  const { data: blockedData, isLoading } = useQuery({
    queryKey: ['worker-blocked-commands', workerId],
    queryFn: () => claudeWorkersApi.getBlockedCommands(),
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
            {blockedData && blockedData.length > 0 ? (
              <div className="space-y-3">
                <div className="text-sm text-gray-600 mb-4">
                  Total blocked commands:{' '}
                  <span className="font-semibold text-orange-600">
                    {blockedData.filter(cmd => cmd.workerId === workerId).length}
                  </span>
                </div>
                {blockedData.filter(cmd => cmd.workerId === workerId).map((blocked, index) => (
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
                    {blocked.context && (
                      <div className="text-sm text-gray-600">
                        <strong>Context:</strong> {blocked.context}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ShieldAlert className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <div className="text-sm text-gray-600">No blocked commands</div>
                <div className="text-xs text-gray-500 mt-2">
                  No commands have been blocked by the security system
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}