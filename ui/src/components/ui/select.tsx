import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

interface OptionProps extends React.OptionHTMLAttributes<HTMLOptionElement> {
  children: React.ReactNode;
}

export function Select({ className = '', ...props }: SelectProps) {
  return (
    <select
      className={`
        flex h-10 w-full rounded-md border border-gray-300 dark:border-gray-600 
        bg-white dark:bg-gray-700 px-3 py-2 text-sm 
        ring-offset-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
        disabled:cursor-not-allowed disabled:opacity-50 
        dark:ring-offset-gray-800 dark:text-gray-100
        ${className}
      `}
      {...props}
    />
  );
}

export function Option({ children, ...props }: OptionProps) {
  return (
    <option {...props}>
      {children}
    </option>
  );
}