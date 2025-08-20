/**
 * Example usage of ClaudeCodeExecutor
 *
 * This file demonstrates how to use the ClaudeCodeExecutor to programmatically
 * run Claude agent processes and collect their output.
 */

import { ClaudeCodeExecutor } from '../src/utils/claude-executor';
import { WinstonLogger } from '../src/logger-winston';

async function basicExample() {
  console.log('=== Basic Claude Executor Example ===\n');

  // Create executor with basic configuration
  const executor = new ClaudeCodeExecutor({
    worktreeDir: '/tmp/claude-workspace',
    claudeCommand:
      'npx -y @anthropic-ai/claude-code@latest -p --dangerously-skip-permissions --verbose --output-format=stream-json',
  });

  try {
    const prompt = 'Write a hello world program in Python and save it to hello.py';
    console.log('Sending prompt to Claude:', prompt);

    const result = await executor.spawn(prompt);

    console.log('\nExecution completed:');
    console.log('Exit code:', result.exitCode);
    console.log('Stdout length:', result.stdout.length);
    console.log('Stderr length:', result.stderr.length);

    if (result.exitCode === 0) {
      console.log('\n--- Claude Output ---');
      console.log(result.stdout);
    } else {
      console.log('\n--- Claude Errors ---');
      console.log(result.stderr);
    }
  } catch (error) {
    console.error('Error executing Claude:', error);
  }
}

async function exampleWithLogging() {
  console.log('\n=== Claude Executor with Logging Example ===\n');

  // Create a logger instance
  const logger = new WinstonLogger();

  // Create executor with logging
  const executor = new ClaudeCodeExecutor(
    {
      worktreeDir: '/tmp/claude-workspace-logged',
      claudeCommand: 'npx -y @anthropic-ai/claude-code@latest -p --dangerously-skip-permissions',
    },
    logger
  );

  try {
    const prompt = 'Create a simple TypeScript interface for a User with name and email properties';

    const result = await executor.spawn(prompt);

    console.log('Result:', {
      exitCode: result.exitCode,
      hasOutput: result.stdout.length > 0,
      hasErrors: result.stderr.length > 0,
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

async function commandParsingExample() {
  console.log('\n=== Command Parsing Example ===\n');

  // Example with complex command including quoted arguments
  const executor = new ClaudeCodeExecutor({
    worktreeDir: '/tmp/test-workspace',
    claudeCommand:
      'node script.js --config "path/with spaces/config.json" --verbose --flag \'single quotes\'',
  });

  console.log('Worktree directory:', executor.getWorktreeDir());
  console.log('Claude command:', executor.getClaudeCommand());

  // In a real scenario, this would execute the parsed command
  console.log('Command would be parsed and executed with proper argument handling');
}

async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===\n');

  // Example with invalid command to demonstrate error handling
  const executor = new ClaudeCodeExecutor({
    worktreeDir: '/tmp/test-workspace',
    claudeCommand: 'nonexistent-command-12345',
  });

  try {
    await executor.spawn('This should fail');
  } catch (error) {
    console.log('Successfully caught error:', (error as Error).message);
  }
}

async function multipleExecutorsExample() {
  console.log('\n=== Multiple Executors Example ===\n');

  // Create multiple executors with different configurations
  const executors = [
    new ClaudeCodeExecutor({
      worktreeDir: '/tmp/workspace-1',
      claudeCommand: 'echo "Workspace 1 output"',
    }),
    new ClaudeCodeExecutor({
      worktreeDir: '/tmp/workspace-2',
      claudeCommand: 'echo "Workspace 2 output"',
    }),
  ];

  const promises = executors.map(async (executor, index) => {
    try {
      const result = await executor.spawn(`prompt-${index + 1}`);
      return { index: index + 1, result };
    } catch (error) {
      return { index: index + 1, error };
    }
  });

  const results = await Promise.all(promises);

  results.forEach(({ index, result, error }) => {
    if (error) {
      console.log(`Executor ${index} failed:`, error);
    } else {
      console.log(`Executor ${index} output:`, result?.stdout.trim());
    }
  });
}

// Run examples if this file is executed directly
if (require.main === module) {
  async function runExamples() {
    try {
      await basicExample();
      await exampleWithLogging();
      await commandParsingExample();
      await errorHandlingExample();
      await multipleExecutorsExample();
    } catch (error) {
      console.error('Example execution failed:', error);
    }
  }

  runExamples();
}
