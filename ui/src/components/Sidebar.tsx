import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ChartColumn, 
  Settings, 
  Menu, 
  X,
  Activity,
  CheckSquare,
  Shield
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
    href: '/tasks',
    icon: CheckSquare,
    label: 'Tasks',
    description: 'Manage tasks with kanban-style board'
  },
  {
    href: '/permissions',
    icon: Shield,
    label: 'Permissions',
    description: 'Configure executor security permissions'
  },
  {
    href: '/settings',
    icon: Settings,
    label: 'Settings',
    description: 'Configure validation pipeline stages'
  }
];

// Mobile overlay component
function MobileOverlay({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) {
  if (isCollapsed) return null;
  
  return (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 md:hidden"
      onClick={onToggle}
    />
  );
}

// Sidebar header component
function SidebarHeader({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) {
  return (
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
        onClick={onToggle}
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
        onClick={onToggle}
        className="md:hidden h-8 w-8 p-0"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

// Navigation item component
function NavigationItem({ 
  item, 
  isActive, 
  isCollapsed, 
  onMobileClick 
}: { 
  item: NavItem; 
  isActive: boolean; 
  isCollapsed: boolean; 
  onMobileClick: () => void;
}) {
  const Icon = item.icon;
  
  return (
    <li>
      <Link
        to={item.href}
        className={`
          flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
          ${isActive 
            ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300' 
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
          }
        `}
        onClick={onMobileClick}
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
}

// Navigation component
function SidebarNavigation({ 
  isCollapsed, 
  onMobileNavigate 
}: { 
  isCollapsed: boolean; 
  onMobileNavigate: () => void;
}) {
  const location = useLocation();
  
  return (
    <nav className="flex-1 p-4">
      <ul className="space-y-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          
          return (
            <NavigationItem
              key={item.href}
              item={item}
              isActive={isActive}
              isCollapsed={isCollapsed}
              onMobileClick={onMobileNavigate}
            />
          );
        })}
      </ul>
    </nav>
  );
}

// Sidebar footer component
function SidebarFooter({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
      {!isCollapsed && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Validation Analytics v1.0
        </div>
      )}
    </div>
  );
}

// Mobile menu button component
function MobileMenuButton({ isCollapsed, onToggle }: { isCollapsed: boolean; onToggle: () => void }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onToggle}
      className={`
        fixed top-4 left-4 z-40 md:hidden
        ${isCollapsed ? 'block' : 'hidden'}
      `}
    >
      <Menu className="h-4 w-4" />
    </Button>
  );
}

export function Sidebar({ className = '' }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleMobileNavigate = () => {
    // Close mobile sidebar on navigation
    if (window.innerWidth < 768) {
      setIsCollapsed(true);
    }
  };

  return (
    <>
      <MobileOverlay isCollapsed={isCollapsed} onToggle={toggleSidebar} />
      
      {/* Sidebar */}
      <div className={`
        fixed left-0 top-0 z-50 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 
        transition-transform duration-300 ease-in-out transform
        ${isCollapsed ? '-translate-x-full md:translate-x-0' : 'translate-x-0'}
        ${isCollapsed ? 'md:w-16' : 'w-64'}
        ${className}
      `}>
        <SidebarHeader isCollapsed={isCollapsed} onToggle={toggleSidebar} />
        <SidebarNavigation isCollapsed={isCollapsed} onMobileNavigate={handleMobileNavigate} />
        <SidebarFooter isCollapsed={isCollapsed} />
      </div>

      <MobileMenuButton isCollapsed={isCollapsed} onToggle={toggleSidebar} />
    </>
  );
}