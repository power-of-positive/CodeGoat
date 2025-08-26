/**
 * Permission System Examples
 *
 * This file demonstrates how to use the permission system to control
 * what actions the ClaudeCodeExecutor can perform.
 */

import { ClaudeCodeExecutor } from '../src/utils/claude-executor';
import {
  PermissionManager,
  DefaultPermissions,
  ActionType,
  PermissionScope,
  PermissionRule,
} from '../src/utils/permissions';
import { WinstonLogger } from '../src/logger-winston';

async function basicPermissionExample() {
  console.log('=== Basic Permission System Example ===\n');

  // Create a restrictive permission configuration
  const config = DefaultPermissions.restrictive();
  const permissionManager = new PermissionManager(config);

  // Create executor with permission manager
  const executor = new ClaudeCodeExecutor({
    worktreeDir: '/tmp/secure-workspace',
    claudeCommand: 'echo "Simulated Claude output"',
    permissionManager,
  });

  // Check if execution is permitted
  console.log('Execution permitted:', executor.isExecutionPermitted());

  // Check specific permissions
  console.log('File read permitted:', executor.checkPermission(ActionType.FILE_READ));
  console.log(
    'System command permitted:',
    executor.checkPermission(ActionType.SYSTEM_COMMAND, 'rm -rf /')
  );
  console.log(
    'Network request permitted:',
    executor.checkPermission(ActionType.NETWORK_REQUEST, 'http://malicious.com')
  );

  try {
    await executor.spawn('Write a hello world program');
    console.log('✅ Execution succeeded');
  } catch (error) {
    console.log('❌ Execution failed:', (error as Error).message);
  }
}

async function customPermissionRulesExample() {
  console.log('\n=== Custom Permission Rules Example ===\n');

  // Start with a permissive base configuration
  const config = DefaultPermissions.permissive();
  const permissionManager = new PermissionManager(config);

  // Add custom rules for enhanced security
  const customRules: PermissionRule[] = [
    {
      id: 'deny-dangerous-commands',
      action: ActionType.SYSTEM_COMMAND,
      scope: PermissionScope.PATTERN,
      target: 'rm *',
      allowed: false,
      reason: 'Deletion commands are forbidden for safety',
      priority: 200,
    },
    {
      id: 'allow-git-commands',
      action: ActionType.SYSTEM_COMMAND,
      scope: PermissionScope.PATTERN,
      target: 'git *',
      allowed: true,
      reason: 'Git commands are safe and useful',
      priority: 150,
    },
    {
      id: 'restrict-network-to-https',
      action: ActionType.NETWORK_REQUEST,
      scope: PermissionScope.PATTERN,
      target: 'http://*',
      allowed: false,
      reason: 'Only HTTPS connections allowed for security',
      priority: 180,
    },
    {
      id: 'allow-worktree-file-ops',
      action: ActionType.FILE_WRITE,
      scope: PermissionScope.WORKTREE,
      allowed: true,
      reason: 'File operations allowed within worktree',
      priority: 100,
    },
  ];

  // Add all custom rules
  customRules.forEach(rule => permissionManager.addRule(rule));

  const executor = new ClaudeCodeExecutor({
    worktreeDir: '/tmp/development-workspace',
    claudeCommand: 'echo "Development Claude"',
    permissionManager,
  });

  // Test various permissions
  console.log(
    'Git status allowed:',
    executor.checkPermission(ActionType.SYSTEM_COMMAND, 'git status')
  );
  console.log(
    'File deletion allowed:',
    executor.checkPermission(ActionType.SYSTEM_COMMAND, 'rm important-file.txt')
  );
  console.log(
    'HTTP request allowed:',
    executor.checkPermission(ActionType.NETWORK_REQUEST, 'http://insecure.com')
  );
  console.log(
    'HTTPS request allowed:',
    executor.checkPermission(ActionType.NETWORK_REQUEST, 'https://secure.com')
  );

  try {
    await executor.spawn('Create a new feature with git integration');
    console.log('✅ Development task succeeded');
  } catch (error) {
    console.log('❌ Development task failed:', (error as Error).message);
  }
}

async function workspaceIsolationExample() {
  console.log('\n=== Workspace Isolation Example ===\n');

  const logger = new WinstonLogger();

  // Create development configuration that restricts operations outside worktree
  const config = DefaultPermissions.development();
  const permissionManager = new PermissionManager(config, logger);

  // Add additional workspace isolation rules
  permissionManager.addRule({
    id: 'deny-system-directories',
    action: ActionType.FILE_WRITE,
    scope: PermissionScope.PATTERN,
    target: '/etc/*',
    allowed: false,
    reason: 'System directory access forbidden',
    priority: 300,
  });

  permissionManager.addRule({
    id: 'deny-home-directory',
    action: ActionType.FILE_WRITE,
    scope: PermissionScope.PATTERN,
    target: '/home/*',
    allowed: false,
    reason: 'Home directory access restricted',
    priority: 250,
  });

  const executor = new ClaudeCodeExecutor(
    {
      worktreeDir: '/tmp/isolated-workspace',
      claudeCommand: 'echo "Isolated Claude execution"',
      permissionManager,
    },
    logger
  );

  // Test workspace isolation
  console.log(
    'Write to worktree:',
    executor.checkPermission(ActionType.FILE_WRITE, '/tmp/isolated-workspace/file.txt')
  );
  console.log('Write to /etc:', executor.checkPermission(ActionType.FILE_WRITE, '/etc/passwd'));
  console.log(
    'Write to /home:',
    executor.checkPermission(ActionType.FILE_WRITE, '/home/user/file.txt')
  );
  console.log(
    'Write to /tmp:',
    executor.checkPermission(ActionType.FILE_WRITE, '/tmp/other-file.txt')
  );

  try {
    await executor.spawn('Refactor code within workspace boundaries');
    console.log('✅ Workspace-isolated task succeeded');
  } catch (error) {
    console.log('❌ Workspace-isolated task failed:', (error as Error).message);
  }
}

async function dynamicPermissionManagementExample() {
  console.log('\n=== Dynamic Permission Management Example ===\n');

  const config = DefaultPermissions.development();
  const permissionManager = new PermissionManager(config);

  const executor = new ClaudeCodeExecutor({
    worktreeDir: '/tmp/dynamic-workspace',
    claudeCommand: 'echo "Dynamic permissions"',
    permissionManager,
  });

  console.log(
    'Initial network permission:',
    executor.checkPermission(ActionType.NETWORK_REQUEST, 'https://api.example.com')
  );

  // Dynamically add a restriction during runtime
  console.log('\n--- Adding network restriction ---');
  permissionManager.addRule({
    id: 'emergency-network-block',
    action: ActionType.NETWORK_REQUEST,
    scope: PermissionScope.GLOBAL,
    allowed: false,
    reason: 'Emergency network lockdown activated',
    priority: 500,
  });

  console.log(
    'Network permission after restriction:',
    executor.checkPermission(ActionType.NETWORK_REQUEST, 'https://api.example.com')
  );

  // Remove the restriction
  console.log('\n--- Removing network restriction ---');
  const removed = permissionManager.removeRule('emergency-network-block');
  console.log('Rule removed:', removed);
  console.log(
    'Network permission after removal:',
    executor.checkPermission(ActionType.NETWORK_REQUEST, 'https://api.example.com')
  );

  // Update configuration
  console.log('\n--- Updating base configuration ---');
  permissionManager.updateConfig({ defaultAllow: false });
  console.log(
    'Unknown action permitted:',
    executor.checkPermission(ActionType.ENVIRONMENT_WRITE, 'PATH')
  );
}

async function securityScenarioExample() {
  console.log('\n=== Security Scenario Example ===\n');

  // Simulate a high-security environment
  const secureConfig = {
    defaultAllow: false,
    enableLogging: true,
    strictMode: true,
    rules: [
      {
        id: 'allow-claude-execution',
        action: ActionType.CLAUDE_EXECUTE,
        scope: PermissionScope.WORKTREE,
        allowed: true,
        reason: 'Claude execution allowed only in designated worktree',
        priority: 100,
      },
      {
        id: 'allow-read-only-access',
        action: ActionType.FILE_READ,
        scope: PermissionScope.WORKTREE,
        allowed: true,
        reason: 'Read-only access to worktree files',
        priority: 90,
      },
      {
        id: 'deny-all-network',
        action: ActionType.NETWORK_REQUEST,
        scope: PermissionScope.GLOBAL,
        allowed: false,
        reason: 'All network access forbidden in secure mode',
        priority: 200,
      },
      {
        id: 'deny-all-system-commands',
        action: ActionType.SYSTEM_COMMAND,
        scope: PermissionScope.GLOBAL,
        allowed: false,
        reason: 'System commands forbidden in secure mode',
        priority: 200,
      },
      {
        id: 'deny-file-modifications',
        action: ActionType.FILE_WRITE,
        scope: PermissionScope.GLOBAL,
        allowed: false,
        reason: 'No file modifications allowed in secure mode',
        priority: 200,
      },
    ],
  };

  const securePermissionManager = new PermissionManager(secureConfig);
  const secureExecutor = new ClaudeCodeExecutor({
    worktreeDir: '/tmp/secure-environment',
    claudeCommand: 'echo "Secure Claude"',
    permissionManager: securePermissionManager,
  });

  console.log('=== Security Policy Checks ===');
  console.log('Claude execution:', secureExecutor.isExecutionPermitted());
  console.log('File read:', secureExecutor.checkPermission(ActionType.FILE_READ));
  console.log('File write:', secureExecutor.checkPermission(ActionType.FILE_WRITE));
  console.log(
    'Network access:',
    secureExecutor.checkPermission(ActionType.NETWORK_REQUEST, 'https://trusted.com')
  );
  console.log('System commands:', secureExecutor.checkPermission(ActionType.SYSTEM_COMMAND, 'ls'));

  try {
    await secureExecutor.spawn('Analyze code without making changes');
    console.log('✅ Secure analysis succeeded');
  } catch (error) {
    console.log('❌ Secure analysis failed:', (error as Error).message);
  }
}

async function permissionConfigComparisonExample() {
  console.log('\n=== Permission Configuration Comparison ===\n');

  const configs = {
    restrictive: DefaultPermissions.restrictive(),
    permissive: DefaultPermissions.permissive(),
    development: DefaultPermissions.development(),
  };

  const testActions = [
    { action: ActionType.CLAUDE_EXECUTE, target: 'claude --help' },
    { action: ActionType.FILE_WRITE, target: '/tmp/test.txt' },
    { action: ActionType.SYSTEM_COMMAND, target: 'git status' },
    { action: ActionType.NETWORK_REQUEST, target: 'https://api.github.com' },
    { action: ActionType.FILE_DELETE, target: '/tmp/old-file.txt' },
  ];

  const SEPARATOR_LENGTH = 70;
  const COLUMN_PADDING = 25;
  
  console.log('Action\t\t\tRestrictive\tPermissive\tDevelopment');
  console.log('─'.repeat(SEPARATOR_LENGTH));

  testActions.forEach(({ action, target }) => {
    const results = Object.entries(configs).map(([_name, config]) => {
      const manager = new PermissionManager(config);
      const executor = new ClaudeCodeExecutor({
        worktreeDir: '/tmp/test-workspace',
        claudeCommand: 'echo test',
        permissionManager: manager,
      });
      return executor.checkPermission(action, target) ? '✅' : '❌';
    });

    const actionName = `${action} (${target?.split(' ')[0] || 'N/A'})`;
    console.log(`${actionName.padEnd(COLUMN_PADDING)}\t${results[0]}\t\t${results[1]}\t\t${results[2]}`);
  });
}

// Run examples if this file is executed directly
if (require.main === module) {
  async function runExamples() {
    try {
      await basicPermissionExample();
      await customPermissionRulesExample();
      await workspaceIsolationExample();
      await dynamicPermissionManagementExample();
      await securityScenarioExample();
      await permissionConfigComparisonExample();
    } catch (error) {
      console.error('Example execution failed:', error);
    }
  }

  runExamples();
}
