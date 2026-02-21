import React from 'react';
import { Sidebar } from './Sidebar';
import { useSidebar } from '../contexts/SidebarContext';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />

      {/* Main content area */}
      <div className={`${isCollapsed ? 'md:ml-16' : 'md:ml-64'} transition-all duration-300`}>
        <main className="min-h-screen">{children}</main>
      </div>
    </div>
  );
}
