import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ChartColumn, 
  Settings, 
  Menu, 
  X,
  BarChart3,
  Activity
} from 'lucide-react';
import { Button } from './ui/button';

interface SidebarProps {
  className?: string;
}

interface NavItem {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}

const navItems: NavItem[] = [
  {
    href: '/analytics',
    icon: ChartColumn,
    label: 'Analytics',
    description: 'View validation metrics and performance data'
  },
  {
    href: '/settings',
    icon: Settings,
    label: 'Settings',
    description: 'Configure validation pipeline stages'
  }
];

export function Sidebar({ className = '' }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      {/* Mobile overlay */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 z-50 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 
        transition-transform duration-300 ease-in-out transform
        ${isCollapsed ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
        ${isCollapsed ? 'md:w-16' : 'w-64'}
        ${className}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-blue-600" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                CodeGoat
              </h1>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="hidden md:flex h-8 w-8 p-0"
          >
            {isCollapsed ? (
              <Menu className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
          {/* Mobile close button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="md:hidden h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                      ${isActive 
                        ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' 
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }
                    `}
                    onClick={() => {
                      // Close mobile sidebar on navigation
                      if (window.innerWidth < 768) {
                        setIsCollapsed(true);
                      }
                    }}
                  >
                    <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-blue-600' : ''}`} />
                    {!isCollapsed && (
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{item.label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {item.description}
                        </div>
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {!isCollapsed && (
            <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Validation Analytics v1.0
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu button */}
      <Button
        variant="outline"
        size="sm"
        onClick={toggleSidebar}
        className={`
          fixed top-4 left-4 z-40 md:hidden
          ${isCollapsed ? 'block' : 'hidden'}
        `}
      >
        <Menu className="h-4 w-4" />
      </Button>
    </>
  );
}