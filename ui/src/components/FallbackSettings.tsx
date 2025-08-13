import { Input } from './ui/input';
import { Label } from './ui/label';
import { RefreshCw } from 'lucide-react';
import type { FallbackSettings as FallbackSettingsType, Settings } from '../types/api';

interface FallbackSettingsProps {
  settings: Settings | undefined;
  updateSettingsMutation: {
    mutate: (settings: Settings) => void;
  };
}

export function FallbackSettings({ settings, updateSettingsMutation }: FallbackSettingsProps) {
  const fallback = settings?.fallback || {
    maxRetries: 3,
    retryDelay: 1000,
    enableFallbacks: true,
    fallbackOnContextLength: true,
    fallbackOnRateLimit: true,
    fallbackOnServerError: false,
  };

  const updateFallback = (updates: Partial<FallbackSettingsType>) => {
    const updatedSettings = {
      ...settings,
      fallback: {
        ...fallback,
        ...updates,
      },
    };

    updateSettingsMutation.mutate(updatedSettings);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
        <RefreshCw className="w-5 h-5" />
        Fallback Configuration
      </h3>
      
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="maxRetries">Max Retries</Label>
            <Input
              id="maxRetries"
              type="number"
              min="1"
              max="10"
              value={fallback.maxRetries}
              onChange={(e) => updateFallback({ maxRetries: parseInt(e.target.value) })}
            />
          </div>
          
          <div>
            <Label htmlFor="retryDelay">Retry Delay (ms)</Label>
            <Input
              id="retryDelay"
              type="number"
              min="100"
              max="10000"
              value={fallback.retryDelay}
              onChange={(e) => updateFallback({ retryDelay: parseInt(e.target.value) })}
            />
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-gray-200">Fallback Triggers</h4>
          
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={fallback.enableFallbacks}
              onChange={(e) => updateFallback({ enableFallbacks: e.target.checked })}
              className="rounded border-gray-600 bg-gray-700"
            />
            Enable fallbacks globally
          </label>
          
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={fallback.fallbackOnContextLength}
              onChange={(e) => updateFallback({ fallbackOnContextLength: e.target.checked })}
              className="rounded border-gray-600 bg-gray-700"
              disabled={!fallback.enableFallbacks}
            />
            Fallback on context length exceeded
          </label>
          
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={fallback.fallbackOnRateLimit}
              onChange={(e) => updateFallback({ fallbackOnRateLimit: e.target.checked })}
              className="rounded border-gray-600 bg-gray-700"
              disabled={!fallback.enableFallbacks}
            />
            Fallback on rate limit errors
          </label>
          
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={fallback.fallbackOnServerError}
              onChange={(e) => updateFallback({ fallbackOnServerError: e.target.checked })}
              className="rounded border-gray-600 bg-gray-700"
              disabled={!fallback.enableFallbacks}
            />
            Fallback on server errors (5xx)
          </label>
        </div>
      </div>
    </div>
  );
}