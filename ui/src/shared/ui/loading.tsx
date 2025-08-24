import React from 'react';
import { RefreshCw } from 'lucide-react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  className?: string;
}

interface LoadingSkeletonProps {
  className?: string;
  children?: React.ReactNode;
}

interface PageLoadingProps {
  message?: string;
  type?: 'spinner' | 'skeleton';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6', 
  lg: 'h-8 w-8',
};

export function LoadingSpinner({ 
  size = 'md', 
  message, 
  className = '' 
}: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="text-center">
        <RefreshCw className={`${sizeClasses[size]} animate-spin mx-auto text-blue-600`} />
        {message && (
          <p className="mt-2 text-sm text-gray-600">{message}</p>
        )}
      </div>
    </div>
  );
}

export function LoadingSkeleton({ className = '', children }: LoadingSkeletonProps) {
  return (
    <div className={`animate-pulse ${className}`}>
      {children || (
        <>
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </>
      )}
    </div>
  );
}

export function PageLoading({ 
  message = 'Loading...', 
  type = 'spinner',
  className = ''
}: PageLoadingProps) {
  const containerClass = `p-6 ${className}`;
  
  if (type === 'skeleton') {
    return (
      <div className={containerClass}>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" message={message} />
      </div>
    </div>
  );
}

export default PageLoading;