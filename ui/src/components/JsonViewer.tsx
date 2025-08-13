import { useState } from 'react';
import { Copy, CheckCircle } from 'lucide-react';
import { Button } from './ui/button';

interface JsonViewerProps {
  data: unknown;
  maxHeight?: string;
}

export function JsonViewer({ data, maxHeight = '400px' }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);
  
  let jsonString: string;
  try {
    jsonString = JSON.stringify(data, null, 2);
  } catch {
    jsonString = String(data);
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className="absolute top-2 right-2 z-10"
      >
        {copied ? (
          <>
            <CheckCircle className="w-3 h-3" />
            Copied
          </>
        ) : (
          <>
            <Copy className="w-3 h-3" />
            Copy
          </>
        )}
      </Button>
      <pre 
        className="bg-gray-900 border border-gray-700 rounded p-4 text-xs text-gray-300 overflow-auto"
        style={{ maxHeight }}
      >
        {jsonString}
      </pre>
    </div>
  );
}