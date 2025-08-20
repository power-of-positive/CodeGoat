import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Edit,
  Trash2,
  TestTube,
  Shield,
  AlertCircle,
  CheckCircle,
  Settings,
  Download,
  Upload,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { SimpleSelect as Select, Option } from './ui/select';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { permissionApi } from '../lib/api';
import {
  PermissionRule,
  PermissionConfig,
  ActionType,
  PermissionScope,
} from '../../shared/types';

interface PermissionFormData {
  action: ActionType;
  scope: PermissionScope;
  target?: string;
  allowed: boolean;
  reason?: string;
  priority: number;
}

interface PermissionTestData {
  action: ActionType;
  target?: string;
  worktreeDir?: string;
}

export function PermissionEditor() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRule, setEditingRule] = useState<PermissionRule | null>(null);
  const [showTestForm, setShowTestForm] = useState(false);
  const [formData, setFormData] = useState<PermissionFormData>({
    action: ActionType.FILE_READ,
    scope: PermissionScope.GLOBAL,
    allowed: true,
    priority: 100,
  });
  const [testData, setTestData] = useState<PermissionTestData>({
    action: ActionType.FILE_READ,
  });
  const [testResult, setTestResult] = useState<{
    allowed: boolean;
    reason: string;
  } | null>(null);

  const queryClient = useQueryClient();

  // Fetch permission configuration
  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['permission-config'],
    queryFn: permissionApi.getConfig,
  });

  // Fetch permission rules
  const { data: rules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['permission-rules'],
    queryFn: permissionApi.getRules,
  });

  // Fetch default configurations
  const { data: defaultConfigs = {} } = useQuery({
    queryKey: ['permission-defaults'],
    queryFn: permissionApi.getDefaultConfigs,
  });

  // Create rule mutation
  const createRuleMutation = useMutation({
    mutationFn: permissionApi.createRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-rules'] });
      setShowCreateForm(false);
      resetForm();
    },
  });

  // Update rule mutation
  const updateRuleMutation = useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<PermissionRule>;
    }) => permissionApi.updateRule(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-rules'] });
      setEditingRule(null);
      resetForm();
    },
  });

  // Delete rule mutation
  const deleteRuleMutation = useMutation({
    mutationFn: permissionApi.deleteRule,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-rules'] });
    },
  });

  // Update config mutation
  const updateConfigMutation = useMutation({
    mutationFn: permissionApi.updateConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permission-config'] });
    },
  });

  // Test permission mutation
  const testPermissionMutation = useMutation({
    mutationFn: permissionApi.testPermission,
    onSuccess: (result) => {
      setTestResult(result);
    },
  });

  // Import Claude settings mutation
  const importClaudeSettingsMutation = useMutation({
    mutationFn: permissionApi.importClaudeSettings,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['permission-rules'] });
      queryClient.invalidateQueries({ queryKey: ['permission-config'] });
      alert(
        `Successfully imported ${result.importedRules} permission rules from .claude/settings.json`
      );
    },
    onError: (error: Error) => {
      const errorMessage = error?.message || 'Failed to import Claude settings';
      alert(`Import failed: ${errorMessage}`);
    },
  });

  const resetForm = () => {
    setFormData({
      action: ActionType.FILE_READ,
      scope: PermissionScope.GLOBAL,
      allowed: true,
      priority: 100,
    });
  };

  const handleCreateRule = () => {
    createRuleMutation.mutate(formData);
  };

  const handleUpdateRule = () => {
    if (!editingRule) return;
    updateRuleMutation.mutate({
      id: editingRule.id,
      updates: formData,
    });
  };

  const handleDeleteRule = (id: string) => {
    if (confirm('Are you sure you want to delete this rule?')) {
      deleteRuleMutation.mutate(id);
    }
  };

  const handleEditRule = (rule: PermissionRule) => {
    setEditingRule(rule);
    setFormData({
      action: rule.action,
      scope: rule.scope,
      target: rule.target,
      allowed: rule.allowed,
      reason: rule.reason,
      priority: rule.priority,
    });
    setShowCreateForm(true);
  };

  const handleTestPermission = () => {
    testPermissionMutation.mutate(testData);
  };

  const handleLoadDefaultConfig = (configName: string) => {
    if (
      confirm(
        `Load ${configName} configuration? This will replace current settings.`
      )
    ) {
      const defaultConfig = defaultConfigs[configName];
      if (defaultConfig) {
        updateConfigMutation.mutate(defaultConfig);
      }
    }
  };

  const handleConfigUpdate = (updates: Partial<PermissionConfig>) => {
    updateConfigMutation.mutate(updates);
  };

  const handleImportClaudeSettings = () => {
    if (
      confirm(
        'Import permission rules from .claude/settings.json? This will convert deny patterns to permission rules.'
      )
    ) {
      importClaudeSettingsMutation.mutate();
    }
  };

  const getActionIcon = (action: ActionType) => {
    switch (action) {
      case ActionType.FILE_READ:
      case ActionType.FILE_WRITE:
      case ActionType.FILE_DELETE:
        return '📁';
      case ActionType.NETWORK_REQUEST:
      case ActionType.NETWORK_LISTEN:
        return '🌐';
      case ActionType.PROCESS_SPAWN:
      case ActionType.PROCESS_KILL:
        return '⚙️';
      case ActionType.SYSTEM_COMMAND:
        return '💻';
      case ActionType.CLAUDE_EXECUTE:
      case ActionType.CLAUDE_PROMPT:
        return '🤖';
      default:
        return '🔧';
    }
  };

  const getScopeColor = (scope: PermissionScope) => {
    switch (scope) {
      case PermissionScope.GLOBAL:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case PermissionScope.WORKTREE:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case PermissionScope.SPECIFIC_PATH:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case PermissionScope.PATTERN:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (configLoading || rulesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">
          Loading permissions configuration...
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Permission Editor
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Configure security permissions for the Claude executor
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowTestForm(!showTestForm)}
              className="flex items-center gap-2"
            >
              <TestTube className="h-4 w-4" />
              Test Permission
            </Button>
            <Button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Rule
            </Button>
          </div>
        </div>

        {/* Global Configuration */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Global Configuration
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="defaultAllow">Default Allow</Label>
              <input
                id="defaultAllow"
                type="checkbox"
                checked={config?.defaultAllow || false}
                onChange={(e) =>
                  handleConfigUpdate({ defaultAllow: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="enableLogging">Enable Logging</Label>
              <input
                id="enableLogging"
                type="checkbox"
                checked={config?.enableLogging || false}
                onChange={(e) =>
                  handleConfigUpdate({ enableLogging: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 rounded"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="strictMode">Strict Mode</Label>
              <input
                id="strictMode"
                type="checkbox"
                checked={config?.strictMode || false}
                onChange={(e) =>
                  handleConfigUpdate({ strictMode: e.target.checked })
                }
                className="h-4 w-4 text-blue-600 rounded"
              />
            </div>
          </div>

          {/* Default Configurations */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Load Default Configuration:
            </h3>
            <div className="flex gap-2 flex-wrap">
              {Object.keys(defaultConfigs).map((configName) => (
                <Button
                  key={configName}
                  variant="outline"
                  size="sm"
                  onClick={() => handleLoadDefaultConfig(configName)}
                  className="flex items-center gap-1 capitalize"
                >
                  <Download className="h-3 w-3" />
                  {configName}
                </Button>
              ))}
            </div>
          </div>

          {/* Claude Settings Import */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Import from Claude Settings:
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportClaudeSettings}
              disabled={importClaudeSettingsMutation.isPending}
              className="flex items-center gap-1"
            >
              <Upload className="h-3 w-3" />
              {importClaudeSettingsMutation.isPending
                ? 'Importing...'
                : 'Import .claude/settings.json'}
            </Button>
            <p className="text-xs text-gray-500 mt-1">
              Import deny patterns from .claude/settings.json as permission
              rules
            </p>
          </div>
        </Card>

        {/* Permission Test */}
        {showTestForm && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TestTube className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Test Permission
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label htmlFor="testAction">Action</Label>
                <Select
                  id="testAction"
                  value={testData.action}
                  onChange={(e) =>
                    setTestData({
                      ...testData,
                      action: e.target.value as ActionType,
                    })
                  }
                >
                  {Object.values(ActionType).map((action) => (
                    <Option key={action} value={action}>
                      {getActionIcon(action)} {action.replace('_', ' ')}
                    </Option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="testTarget">Target (optional)</Label>
                <Input
                  id="testTarget"
                  value={testData.target || ''}
                  onChange={(e) =>
                    setTestData({ ...testData, target: e.target.value })
                  }
                  placeholder="e.g., /path/to/file or git status"
                />
              </div>
              <div>
                <Label htmlFor="testWorktree">Worktree (optional)</Label>
                <Input
                  id="testWorktree"
                  value={testData.worktreeDir || ''}
                  onChange={(e) =>
                    setTestData({ ...testData, worktreeDir: e.target.value })
                  }
                  placeholder="e.g., /tmp/workspace"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleTestPermission}
                disabled={testPermissionMutation.isPending}
                className="flex items-center gap-2"
                data-testid="test-permission-submit"
              >
                <TestTube className="h-4 w-4" />
                {testPermissionMutation.isPending
                  ? 'Testing...'
                  : 'Test Permission'}
              </Button>
              {testResult && (
                <div
                  className={`flex items-center gap-2 px-3 py-1 rounded-md ${
                    testResult.allowed
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}
                >
                  {testResult.allowed ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <span className="text-sm">
                    {testResult.allowed ? 'Allowed' : 'Denied'}:{' '}
                    {testResult.reason}
                  </span>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Rule Form */}
        {showCreateForm && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editingRule ? 'Edit Rule' : 'Create New Rule'}
              </h2>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingRule(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <Label htmlFor="action">Action</Label>
                <Select
                  id="action"
                  value={formData.action}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      action: e.target.value as ActionType,
                    })
                  }
                >
                  {Object.values(ActionType).map((action) => (
                    <Option key={action} value={action}>
                      {getActionIcon(action)} {action.replace('_', ' ')}
                    </Option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="scope">Scope</Label>
                <Select
                  id="scope"
                  value={formData.scope}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      scope: e.target.value as PermissionScope,
                    })
                  }
                >
                  {Object.values(PermissionScope).map((scope) => (
                    <Option key={scope} value={scope}>
                      {scope.replace('_', ' ')}
                    </Option>
                  ))}
                </Select>
              </div>

              {(formData.scope === PermissionScope.SPECIFIC_PATH ||
                formData.scope === PermissionScope.PATTERN) && (
                <div className="md:col-span-2">
                  <Label htmlFor="target">Target</Label>
                  <Input
                    id="target"
                    value={formData.target || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, target: e.target.value })
                    }
                    placeholder={
                      formData.scope === PermissionScope.SPECIFIC_PATH
                        ? 'e.g., /tmp/allowed'
                        : 'e.g., git * or *.js'
                    }
                  />
                </div>
              )}

              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: parseInt(e.target.value),
                    })
                  }
                  min="1"
                  max="1000"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input
                    id="allowed"
                    type="radio"
                    name="permission"
                    checked={formData.allowed}
                    onChange={() => setFormData({ ...formData, allowed: true })}
                    className="h-4 w-4 text-green-600"
                  />
                  <Label htmlFor="allowed" className="text-green-600">
                    Allow
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="denied"
                    type="radio"
                    name="permission"
                    checked={!formData.allowed}
                    onChange={() =>
                      setFormData({ ...formData, allowed: false })
                    }
                    className="h-4 w-4 text-red-600"
                  />
                  <Label htmlFor="denied" className="text-red-600">
                    Deny
                  </Label>
                </div>
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="reason">Reason (optional)</Label>
                <Textarea
                  id="reason"
                  value={formData.reason || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  placeholder="Explain why this rule exists..."
                  rows={3}
                />
              </div>
            </div>

            <Button
              onClick={editingRule ? handleUpdateRule : handleCreateRule}
              disabled={
                createRuleMutation.isPending || updateRuleMutation.isPending
              }
              className="w-full"
            >
              {editingRule ? 'Update Rule' : 'Create Rule'}
            </Button>
          </Card>
        )}

        {/* Rules List */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Permission Rules ({rules.length})
            </h2>
            <div className="text-sm text-gray-500">
              Rules are processed by priority (highest first)
            </div>
          </div>

          {rules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No permission rules configured. Add a rule to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {rules
                .sort((a, b) => b.priority - a.priority)
                .map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-2xl">
                        {getActionIcon(rule.action)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {rule.action.replace('_', ' ')}
                          </span>
                          <Badge className={getScopeColor(rule.scope)}>
                            {rule.scope}
                          </Badge>
                          <Badge
                            variant={rule.allowed ? 'default' : 'destructive'}
                          >
                            {rule.allowed ? 'Allow' : 'Deny'}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            Priority: {rule.priority}
                          </span>
                        </div>
                        {rule.target && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Target:{' '}
                            <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">
                              {rule.target}
                            </code>
                          </div>
                        )}
                        {rule.reason && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {rule.reason}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditRule(rule)}
                        data-testid={`edit-rule-${rule.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteRule(rule.id)}
                        disabled={deleteRuleMutation.isPending}
                        data-testid={`delete-rule-${rule.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
