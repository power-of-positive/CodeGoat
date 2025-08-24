/**
 * Script linting utilities - ESLint execution for TypeScript scripts
 *
 * This module handles ESLint execution for script files with proper error handling,
 * file filtering, and command escaping for security. It integrates with the file
 * filtering module to ensure only valid files are processed.
 */
import { execCommand } from '../utils/command-utils';
import { filterValidFiles } from '../files/file-filtering';

/**
 * Run ESLint on script files with comprehensive error handling
 *
 * Executes ESLint validation on filtered script files using secure command
 * construction and proper error handling. Returns structured results for
 * integration with the broader validation pipeline.
 *
 * @param projectRoot - Absolute path to project root for command execution
 * @param scriptFiles - Array of script file paths to lint
 * @returns Object with failure status and formatted output
 */
export function runScriptLinting(
  projectRoot: string,
  scriptFiles: string[]
): { failed: boolean; output: string } {
  const validFiles = filterValidFiles(projectRoot, scriptFiles) || [];
  if (validFiles.length === 0) {
    return { failed: false, output: '' };
  }

  const escaped = validFiles.map(f => `'${f.replace(/'/g, `'\\''`)}'`).join(' ');
  const command = `ESLINT_USE_FLAT_CONFIG=false npx eslint --max-warnings 100 --rule 'no-console:off' ${escaped}`;

  const result = execCommand(command, projectRoot);
  if (result.success) {
    return { failed: false, output: '' };
  } else {
    return {
      failed: true,
      output: `\nSCRIPT LINT FAILURES:\n${result.output}\n`,
    };
  }
}
