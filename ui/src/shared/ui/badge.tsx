import React from 'react';
import { cn } from '../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

const badgeVariants = {
  default: 'bg-blue-100 text-blue-800 border-blue-300',
  secondary: 'bg-gray-100 text-gray-800 border-gray-300',
  destructive: 'bg-red-100 text-red-800 border-red-300',
  outline: 'border border-gray-300 text-gray-700 bg-transparent',
};

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        badgeVariants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
