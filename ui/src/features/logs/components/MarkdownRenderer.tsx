import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Simple markdown renderer for now - can be enhanced later with a proper markdown library
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  // Simple code block detection
  if (content.includes('```')) {
    const parts = content.split('```');
    return (
      <div className={className}>
        {parts.map((part, index) => {
          if (index % 2 === 1) {
            // This is a code block
            return (
              <pre
                key={index}
                className="bg-gray-100 dark:bg-gray-800 rounded p-2 my-2 overflow-x-auto"
              >
                <code className="text-sm">{part}</code>
              </pre>
            );
          } else {
            // Regular text - apply simple formatting
            return (
              <span key={index} className="whitespace-pre-wrap">
                {part.split('`').map((textPart, textIndex) => {
                  if (textIndex % 2 === 1) {
                    return (
                      <code
                        key={textIndex}
                        className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-sm"
                      >
                        {textPart}
                      </code>
                    );
                  }
                  return textPart;
                })}
              </span>
            );
          }
        })}
      </div>
    );
  }

  // Simple inline code handling
  if (content.includes('`')) {
    return (
      <div className={className}>
        {content.split('`').map((part, index) => {
          if (index % 2 === 1) {
            return (
              <code key={index} className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-sm">
                {part}
              </code>
            );
          }
          return part;
        })}
      </div>
    );
  }

  // Regular text
  return <div className={className}>{content}</div>;
};

export default MarkdownRenderer;
