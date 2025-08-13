import { Button } from './ui/button';
import type { LogEntry } from '../types/api';

interface LogDetailModalProps {
  log: LogEntry | null;
  onClose: () => void;
}

export function LogDetailModal({ log, onClose }: LogDetailModalProps) {
  if (!log) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl max-h-[80vh] w-full mx-4 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-100">Request Details</h2>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Timestamp</label>
              <p className="text-gray-100">{new Date(log.timestamp).toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Method</label>
              <p className="text-gray-100 font-mono">{log.method}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Path</label>
              <p className="text-gray-100 font-mono">{log.path}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Status</label>
              <p className={`font-mono ${
                log.statusCode && log.statusCode >= 200 && log.statusCode < 300 
                  ? 'text-green-400' 
                  : log.statusCode && log.statusCode >= 400 
                    ? 'text-red-400' 
                    : 'text-yellow-400'
              }`}>
                {log.statusCode || 'N/A'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Duration</label>
              <p className="text-gray-100">{log.duration ? `${log.duration}ms` : 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Route Name</label>
              <p className="text-gray-100">{log.routeName || 'N/A'}</p>
            </div>
          </div>

          {log.targetUrl && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Target URL</label>
              <p className="text-gray-100 font-mono break-all">{log.targetUrl}</p>
            </div>
          )}

          {log.error && (
            <div>
              <label className="block text-sm font-medium text-red-300 mb-1">Error</label>
              <div className="bg-red-900/20 border border-red-500/20 rounded p-3">
                <p className="text-red-300 mb-2">
                  {typeof log.error === 'string' ? log.error : log.error.message}
                </p>
                {typeof log.error !== 'string' && log.error.stack && (
                  <pre className="text-red-400 text-xs overflow-x-auto whitespace-pre-wrap">
                    {log.error.stack}
                  </pre>
                )}
              </div>
            </div>
          )}

          {log.meta && Object.keys(log.meta).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Metadata</label>
              <pre className="bg-gray-900 border border-gray-700 rounded p-3 text-gray-300 text-sm overflow-x-auto">
                {JSON.stringify(log.meta, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}