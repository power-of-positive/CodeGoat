import React from 'react';

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className = '', ...props }: TextareaProps) {
  return (
    <textarea
      className={`
        flex min-h-[80px] w-full rounded-md border border-gray-300 dark:border-gray-600 
        bg-white dark:bg-gray-700 px-3 py-2 text-sm 
        ring-offset-white placeholder:text-gray-500 focus:outline-none 
        focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
        disabled:cursor-not-allowed disabled:opacity-50 
        dark:ring-offset-gray-800 dark:placeholder:text-gray-400 dark:text-gray-100
        ${className}
      `}
      {...props}
    />
  );
}
