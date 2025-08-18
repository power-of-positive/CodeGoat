import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps {
  children: React.ReactNode;
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
  isOpen?: boolean;
  setIsOpen?: (open: boolean) => void;
}

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
  isOpen?: boolean;
  value?: string;
  onValueChange?: (value: string) => void;
  setIsOpen?: (open: boolean) => void;
}

interface SelectItemProps {
  children: React.ReactNode;
  value: string;
  className?: string;
  currentValue?: string;
  onSelect?: (value: string) => void;
}

interface SelectValueProps {
  placeholder?: string;
  className?: string;
  value?: string;
}

export function Select({ children, value, onValueChange, className = '' }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className={`relative ${className}`}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<{
            value?: string;
            onValueChange?: (value: string) => void;
            isOpen?: boolean;
            setIsOpen?: (open: boolean) => void;
            currentValue?: string;
            onSelect?: (value: string) => void;
          }>, { 
            value, 
            onValueChange, 
            isOpen, 
            setIsOpen 
          });
        }
        return child;
      })}
    </div>
  );
}

export function SelectTrigger({ children, className = '', isOpen, setIsOpen }: SelectTriggerProps) {
  
  return (
    <button
      type="button"
      className={`
        flex h-10 w-full items-center justify-between rounded-md border border-gray-300 dark:border-gray-600 
        bg-white dark:bg-gray-700 px-3 py-2 text-sm 
        ring-offset-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 
        disabled:cursor-not-allowed disabled:opacity-50 
        dark:ring-offset-gray-800 dark:text-gray-100
        ${className}
      `}
      onClick={() => setIsOpen?.(!isOpen)}
    >
      {children}
      <ChevronDown className="h-4 w-4 opacity-50" />
    </button>
  );
}

export function SelectContent({ children, className = '', isOpen, value, onValueChange, setIsOpen }: SelectContentProps) {
  
  if (!isOpen) return null;
  
  return (
    <div className={`
      absolute top-full left-0 z-50 w-full mt-1 rounded-md border border-gray-300 dark:border-gray-600
      bg-white dark:bg-gray-700 shadow-lg max-h-60 overflow-auto
      ${className}
    `}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<{
            value?: string;
            onValueChange?: (value: string) => void;
            isOpen?: boolean;
            setIsOpen?: (open: boolean) => void;
            currentValue?: string;
            onSelect?: (value: string) => void;
          }>, { 
            currentValue: value,
            onSelect: (selectedValue: string) => {
              onValueChange?.(selectedValue);
              setIsOpen?.(false);
            }
          });
        }
        return child;
      })}
    </div>
  );
}

export function SelectItem({ children, value, className = '', currentValue, onSelect }: SelectItemProps) {
  const isSelected = currentValue === value;
  
  return (
    <button
      type="button"
      className={`
        w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600
        ${isSelected ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' : ''}
        ${className}
      `}
      onClick={() => onSelect?.(value)}
    >
      {children}
    </button>
  );
}

export function SelectValue({ placeholder, value }: SelectValueProps) {
  
  return (
    <span className="block truncate">
      {value || placeholder}
    </span>
  );
}

// Keep the original simple components for backward compatibility
interface SimpleSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

interface OptionProps extends React.OptionHTMLAttributes<HTMLOptionElement> {
  children: React.ReactNode;
}

export function SimpleSelect({ className = '', ...props }: SimpleSelectProps) {
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