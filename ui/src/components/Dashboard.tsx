import { useState } from 'react';
import { Settings } from './Settings';
import { Analytics } from './Analytics';
import { ModelManagement } from './ModelManagement';
import { Validation } from './Validation';
import { Home, Settings as SettingsIcon, BarChart3, Server, Target } from 'lucide-react';

type ActiveTab = 'dashboard' | 'models' | 'validation' | 'analytics' | 'settings';

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  const tabs = [
    { id: 'dashboard' as const, name: 'Dashboard', icon: Home },
    { id: 'models' as const, name: 'Model Management', icon: Server },
    { id: 'validation' as const, name: 'Validation', icon: Target },
    { id: 'analytics' as const, name: 'Analytics', icon: BarChart3 },
    { id: 'settings' as const, name: 'Settings', icon: SettingsIcon },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'models':
        return <ModelManagement />;
      case 'validation':
        return <Validation />;
      case 'analytics':
        return <Analytics />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <div className="space-y-8">
            <div className="text-center py-12">
              <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-semibold text-slate-100 mb-2">
                Welcome to CodeGoat
              </h2>
              <p className="text-gray-400 mb-6">
                Your AI development workflow management platform
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                <button
                  onClick={() => setActiveTab('models')}
                  className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors"
                >
                  <Server className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <h3 className="font-medium text-slate-100">Model Management</h3>
                  <p className="text-sm text-gray-400">Configure and test AI models</p>
                </button>
                <button
                  onClick={() => setActiveTab('validation')}
                  className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors"
                >
                  <Target className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <h3 className="font-medium text-slate-100">Validation</h3>
                  <p className="text-sm text-gray-400">Configure validation pipeline</p>
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors"
                >
                  <BarChart3 className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <h3 className="font-medium text-slate-100">Analytics</h3>
                  <p className="text-sm text-gray-400">View development insights</p>
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className="p-4 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-500 transition-colors"
                >
                  <SettingsIcon className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <h3 className="font-medium text-slate-100">Settings</h3>
                  <p className="text-sm text-gray-400">Configure system preferences</p>
                </button>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Navigation Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}