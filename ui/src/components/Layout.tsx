import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, FileText, Settings as SettingsIcon, BarChart3 } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const tabs = [
    { 
      id: 'dashboard', 
      name: 'Dashboard', 
      icon: Home, 
      path: '/dashboard' 
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
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-100">
              Proxy Management
            </h1>
            <p className="mt-2 text-sm text-gray-400">
              Manage your AI model configurations and API keys
            </p>
          </div>

          <div className="space-y-8">
            {/* Navigation Tabs */}
            <div className="border-b border-gray-700">
              <nav className="flex space-x-8">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = location.pathname === tab.path;
                  
                  return (
                    <Link
                      key={tab.id}
                      to={tab.path}
                      data-testid={`nav-${tab.id === 'logs' ? 'request-logs' : tab.id}`}
                      className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                        isActive
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.name}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Content */}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}