import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings as SettingsIcon, BarChart3, Menu, X } from 'lucide-react';

interface SidebarLayoutProps {
  children: ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const tabs = [
    { 
      id: 'analytics', 
      name: 'Analytics', 
      icon: BarChart3, 
      path: '/analytics' 
    },
    { 
      id: 'settings', 
      name: 'Settings', 
      icon: SettingsIcon, 
      path: '/settings' 
    },
  ];

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <div className={`bg-gray-800 border-r border-gray-700 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`} data-testid="sidebar">
        <div className={`p-6 ${isCollapsed ? 'px-3' : ''}`}>
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div>
                <h1 className="text-2xl font-bold text-gray-100">
                  CodeGoat
                </h1>
                <p className="mt-1 text-xs text-gray-400">
                  Validation Analytics
                </p>
              </div>
            )}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              data-testid="sidebar-toggle"
              className="p-2 text-gray-400 hover:text-gray-100 hover:bg-gray-700 rounded-lg transition-colors"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
            </button>
          </div>
        </div>
        
        <nav className={`px-4 pb-6 ${isCollapsed ? 'px-2' : ''}`}>
          <ul className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = location.pathname === tab.path;
              
              return (
                <li key={tab.id}>
                  <Link
                    to={tab.path}
                    data-testid={`nav-${tab.id === 'logs' ? 'request-logs' : tab.id}`}
                    className={`flex items-center ${isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'} rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-gray-700 text-gray-100'
                        : 'text-gray-400 hover:text-gray-100 hover:bg-gray-700/50'
                    }`}
                    title={isCollapsed ? tab.name : undefined}
                  >
                    <Icon className="w-5 h-5" />
                    {!isCollapsed && tab.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </div>
    </div>
  );
}