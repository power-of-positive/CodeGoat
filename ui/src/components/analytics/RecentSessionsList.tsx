import { 
  CheckCircle, 
  XCircle, 
  Calendar,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { SessionMetrics } from '../../types/api';

interface RecentSessionsListProps {
  sessions: SessionMetrics[];
}

export function RecentSessionsList({ sessions }: RecentSessionsListProps) {
  const navigate = useNavigate();
  
  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Sessions</h3>
      {sessions.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No sessions found</p>
          <p className="text-sm text-gray-400">
            Development sessions will appear here as they are tracked
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {sessions.map((session) => (
            <div
              key={session.sessionId}
              className="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer group"
              onClick={() => navigate(`/analytics/sessions/${session.sessionId}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {session.finalSuccess ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                      {session.userPrompt || 'Development Session'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {new Date(session.startTime).toLocaleString()}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>{session.attempts.length} attempts</span>
                    {session.totalDuration && (
                      <span>{formatDuration(session.totalDuration)}</span>
                    )}
                  </div>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}