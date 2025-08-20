/**
 * Command validation utilities for security and safety
 */

/**
 * Clean command string for validation by removing environment variables and cd commands
 */
function cleanCommandForValidation(command: string): string {
  let cleanCommand = command.trim();

  if (cleanCommand.startsWith('cd scripts && ')) {
    cleanCommand = cleanCommand.replace('cd scripts && ', '');
  }

  const envPrefixes = [
    /^ESLINT_USE_FLAT_CONFIG=\w+\s+/,
    /^NODE_OPTIONS="[^"]*"\s+/,
    /^NODE_OPTIONS='[^']*'\s+/,
    /^NODE_OPTIONS=[^\s]+\s+/,
  ];

  for (const prefix of envPrefixes) {
    cleanCommand = cleanCommand.replace(prefix, '');
  }

  return cleanCommand;
}

/**
 * Get list of allowed command prefixes
 */
function getAllowedCommands(): string[] {
  return [
    'npm run',
    'npx eslint',
    'npx prettier',
    'npx tsc',
    'npx vitest',
    'npx jscpd',
    'npx unimported',
    'npx ts-prune',
    'npm audit',
    'cargo',
    'git',
    'node',
    'pnpm',
    'yarn',
  ];
}

/**
 * Enhanced command validation with whitelist approach
 */
export function validateCommand(command: string): void {
  if (!command || typeof command !== 'string') {
    throw new Error('Invalid command: must be non-empty string');
  }

  const cleanCommand = cleanCommandForValidation(command);
  const allowedCommands = getAllowedCommands();

  const isAllowed = allowedCommands.some(allowed => cleanCommand.startsWith(allowed));
  if (!isAllowed) {
    throw new Error(`Invalid command: '${command}' not in allowed list`);
  }
}
