import type { LogEntry } from '../types/api';
import { CollapsibleSection } from './CollapsibleSection';
import { JsonViewer } from './JsonViewer';
import { HeadersViewer } from './HeadersViewer';

interface LogDetailCollapsibleProps {
  log: LogEntry;
}

export function LogDetailCollapsible({ log }: LogDetailCollapsibleProps) {
  const getErrorInfo = () => {
    if (!log.error) return null;
    if (typeof log.error === 'string') return { message: log.error };
    return log.error;
  };

  const errorInfo = getErrorInfo();

  return (
    <div className="log-details bg-gray-800 rounded-lg p-4 space-y-4">
      {/* Basic Info Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-4 border-b border-gray-700">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Timestamp</label>
          <p className="text-sm text-gray-200">{new Date(log.timestamp).toLocaleString()}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Method</label>
          <p className="text-sm font-mono text-gray-200">{log.method}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Status</label>
          <p className={`text-sm font-mono ${
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
          <label className="block text-xs font-medium text-gray-400 mb-1">Duration</label>
          <p className="text-sm text-gray-200">{log.duration ? `${log.duration}ms` : 'N/A'}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Response Size</label>
          <p className="text-sm text-gray-200">
            {log.responseSize ? `${(log.responseSize / 1024).toFixed(2)} KB` : 'N/A'}
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Client IP</label>
          <p className="text-sm font-mono text-gray-200">{log.clientIp || 'N/A'}</p>
        </div>
      </div>

      {/* Path and Target URL */}
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Path</label>
          <p className="text-sm font-mono text-gray-200 break-all">{log.path}</p>
        </div>
        {log.targetUrl && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Target URL</label>
            <p className="text-sm font-mono text-gray-200 break-all">{log.targetUrl}</p>
          </div>
        )}
        {log.userAgent && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">User Agent</label>
            <p className="text-sm text-gray-200">{log.userAgent}</p>
          </div>
        )}
      </div>

      {/* Collapsible Sections */}
      <div className="space-y-3">
        {log.requestHeaders && (
          <CollapsibleSection 
            title="Request Headers" 
            badge={`${Object.keys(log.requestHeaders).length} headers`}
          >
            <HeadersViewer headers={log.requestHeaders} />
          </CollapsibleSection>
        )}
        {log.requestBody !== undefined && (
          <CollapsibleSection title="Request Body">
            <JsonViewer data={log.requestBody} />
          </CollapsibleSection>
        )}

        {log.responseHeaders && (
          <CollapsibleSection 
            title="Response Headers" 
            badge={`${Object.keys(log.responseHeaders).length} headers`}
          >
            <HeadersViewer headers={log.responseHeaders} />
          </CollapsibleSection>
        )}
        {log.responseBody !== undefined && (
          <CollapsibleSection 
            title="Response Body"
            defaultOpen={log.statusCode ? log.statusCode >= 400 : false}
          >
            <JsonViewer data={log.responseBody} />
          </CollapsibleSection>
        )}

        {errorInfo && (
          <CollapsibleSection title="Error Details" defaultOpen={true}>
            <div className="space-y-2">
              <p className="text-sm text-red-300">{errorInfo.message}</p>
              {errorInfo.stack && (
                <pre className="text-xs text-red-400 bg-red-900/20 border border-red-500/20 rounded p-3 overflow-x-auto">
                  {errorInfo.stack}
                </pre>
              )}
            </div>
          </CollapsibleSection>
        )}

        {log.meta && Object.keys(log.meta).length > 0 && (
          <CollapsibleSection title="Metadata">
            <JsonViewer data={log.meta} />
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}