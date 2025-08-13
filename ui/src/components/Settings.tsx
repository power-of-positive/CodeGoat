import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from './ui/button';
import { 
  Settings as SettingsIcon, 
  RefreshCw, 
  AlertCircle,
  FileText,
  Target
} from 'lucide-react';
import { api } from '../services/api';
import { ValidationSettings } from './ValidationSettings';
import { FallbackSettings } from './FallbackSettings';
import { LoggingSettings } from './LoggingSettings';

type SettingsTab = 'validation' | 'fallback' | 'logging';

export function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('validation');
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['settings'],
    queryFn: api.getSettings,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: api.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const tabs = [
    { id: 'validation' as const, name: 'Validation Stages', icon: Target },
    { id: 'fallback' as const, name: 'Fallback Config', icon: RefreshCw },
    { id: 'logging' as const, name: 'Logging Config', icon: FileText },
  ];

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto mb-2" />
        <p className="text-gray-400">Loading settings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-400 mb-4">Failed to load settings</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['settings'] })}>
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'validation':
        return <ValidationSettings settings={settings} updateSettingsMutation={updateSettingsMutation} />;
      case 'fallback':
        return <FallbackSettings settings={settings} updateSettingsMutation={updateSettingsMutation} />;
      case 'logging':
        return <LoggingSettings settings={settings} updateSettingsMutation={updateSettingsMutation} />;
      default:
        return <ValidationSettings settings={settings} updateSettingsMutation={updateSettingsMutation} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5" />
          Settings
        </h2>
        <p className="text-sm text-gray-400">
          Configure validation stages, fallback behavior, and logging settings
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
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

      {/* Save Status */}
      {updateSettingsMutation.isPending && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Saving settings...
        </div>
      )}
    </div>
  );
}