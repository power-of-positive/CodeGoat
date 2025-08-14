import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Settings as SettingsIcon, BarChart3, FolderKanban } from 'lucide-react';

interface SidebarLayoutProps {
  children: ReactNode;
}

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const location = useLocation();

  const tabs = [
    { 
      id: 'dashboard', 
      name: 'Dashboard', 
      icon: Home, 
      path: '/dashboard' 
    },
    { 
      id: 'projects', 
      name: 'Projects', 
      icon: FolderKanban, 
      path: '/projects' 
    },
    { 
      id: 'logs', 
      name: 'Request Logs', 
      icon: FileText, 
      path: '/logs' 
    },
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
      <div className="w-64 bg-gray-800 border-r border-gray-700">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-gray-100">
            CodeGoat
          </h1>
          <p className="mt-1 text-xs text-gray-400">
            AI-powered project management
          </p>
        </div>
        
        <nav className="px-4 pb-6">
          <ul className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = location.pathname === tab.path || 
                (tab.id === 'projects' && location.pathname.startsWith('/projects'));
              
              return (
                <li key={tab.id}>
                  <Link
                    to={tab.path}
                    data-testid={`nav-${tab.id === 'logs' ? 'request-logs' : tab.id}`}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-gray-700 text-gray-100'
                        : 'text-gray-400 hover:text-gray-100 hover:bg-gray-700/50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.name}
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