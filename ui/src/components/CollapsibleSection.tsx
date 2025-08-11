import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}

export function CollapsibleSection({ title, children, defaultOpen = false, badge }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-gray-800 hover:bg-gray-700 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-sm font-medium text-gray-200">{title}</span>
          {badge && (
            <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
              {badge}
            </span>
          )}
        </div>
      </button>
      {isOpen && (
        <div className="p-4 bg-gray-900 border-t border-gray-700">
          {children}
        </div>
      )}
    </div>
  );
}