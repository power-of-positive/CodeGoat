interface HeadersViewerProps {
  headers: Record<string, string>;
}

export function HeadersViewer({ headers }: HeadersViewerProps) {
  return (
    <div className="space-y-2">
      {Object.entries(headers).map(([key, value]) => (
        <div key={key} className="flex flex-col sm:flex-row sm:gap-2">
          <span className="font-mono text-xs text-gray-400 sm:min-w-[200px]">{key}:</span>
          <span className="font-mono text-xs text-gray-200 break-all">{value}</span>
        </div>
      ))}
    </div>
  );
}