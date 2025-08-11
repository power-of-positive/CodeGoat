import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Select } from './ui/Select';
import { FileText } from 'lucide-react';
import type { LoggingSettings as LoggingSettingsType, Settings } from '../types/api';

interface LoggingSettingsProps {
  settings: Settings | undefined;
  updateSettingsMutation: {
    mutate: (settings: Settings) => void;
  };
}

export function LoggingSettings({ settings, updateSettingsMutation }: LoggingSettingsProps) {
  const logging = settings?.logging || {
    level: 'info' as const,
    enableConsole: true,
    enableFile: true,
    logsDir: './logs',
    accessLogFile: 'access.log',
    appLogFile: 'app.log',
    errorLogFile: 'error.log',
    maxFileSize: '10485760',
    maxFiles: '10',
    datePattern: 'YYYY-MM-DD',
  };

  const updateLogging = (updates: Partial<LoggingSettingsType>) => {
    const updatedSettings = {
      ...settings,
      logging: {
        ...logging,
        ...updates,
      },
    };

    updateSettingsMutation.mutate(updatedSettings);
  };

  return (
    <div className="space-y-6">
      {/* General Logging Settings */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          General Logging Settings
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="logLevel">Log Level</Label>
            <Select
              value={logging.level}
              onValueChange={(value) => updateLogging({ level: value as LoggingSettingsType['level'] })}
            >
              <option value="error">Error</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
              <option value="debug">Debug</option>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="logsDir">Logs Directory</Label>
            <Input
              id="logsDir"
              value={logging.logsDir}
              onChange={(e) => updateLogging({ logsDir: e.target.value })}
            />
          </div>
        </div>

        <div className="flex items-center gap-6 mt-4">
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={logging.enableConsole}
              onChange={(e) => updateLogging({ enableConsole: e.target.checked })}
              className="rounded border-gray-600 bg-gray-700"
            />
            Enable console logging
          </label>
          
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={logging.enableFile}
              onChange={(e) => updateLogging({ enableFile: e.target.checked })}
              className="rounded border-gray-600 bg-gray-700"
            />
            Enable file logging
          </label>
        </div>
      </div>

      {/* File Settings */}
      {logging.enableFile && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h4 className="font-medium text-gray-200 mb-4">Log Files Configuration</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="accessLogFile">Access Log File</Label>
              <Input
                id="accessLogFile"
                value={logging.accessLogFile}
                onChange={(e) => updateLogging({ accessLogFile: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="appLogFile">Application Log File</Label>
              <Input
                id="appLogFile"
                value={logging.appLogFile}
                onChange={(e) => updateLogging({ appLogFile: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="errorLogFile">Error Log File</Label>
              <Input
                id="errorLogFile"
                value={logging.errorLogFile}
                onChange={(e) => updateLogging({ errorLogFile: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="maxFileSize">Max File Size (bytes)</Label>
              <Input
                id="maxFileSize"
                value={logging.maxFileSize}
                onChange={(e) => updateLogging({ maxFileSize: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="maxFiles">Max Files to Keep</Label>
              <Input
                id="maxFiles"
                value={logging.maxFiles}
                onChange={(e) => updateLogging({ maxFiles: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="datePattern">Date Pattern</Label>
              <Input
                id="datePattern"
                value={logging.datePattern}
                onChange={(e) => updateLogging({ datePattern: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}