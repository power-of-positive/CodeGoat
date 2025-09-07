#!/usr/bin/env npx tsx

/**
 * Run Orchestrator with Streaming Output
 *
 * This script runs the orchestrator and streams its output in real-time.
 * It starts both the orchestrator process and the stream viewer.
 *
 * Usage:
 *   npx tsx scripts/run-orchestrator-with-stream.ts [orchestrator-options]
 *
 * Examples:
 *   npx tsx scripts/run-orchestrator-with-stream.ts --prompt "help me fix linting errors" --single
 *   npx tsx scripts/run-orchestrator-with-stream.ts --continuous
 */

import { spawn, ChildProcess } from 'child_process';

interface StreamedOrchestratorOptions {
  orchestratorArgs: string[];
  showHelp: boolean;
}

function parseArgs(): StreamedOrchestratorOptions {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    return { orchestratorArgs: [], showHelp: true };
  }

  return {
    orchestratorArgs: args,
    showHelp: false,
  };
}

function showHelp(): void {
  console.log(`
Run Orchestrator with Streaming Output

This script runs the orchestrator and streams its output in real-time.
It starts both the orchestrator process and the stream viewer.

Usage:
  npx tsx scripts/run-orchestrator-with-stream.ts [orchestrator-options]

Examples:
  # Run single task with streaming
  npx tsx scripts/run-orchestrator-with-stream.ts --prompt "help me fix linting errors" --single
  
  # Run in continuous mode with streaming  
  npx tsx scripts/run-orchestrator-with-stream.ts --continuous
  
  # Run with custom settings
  npx tsx scripts/run-orchestrator-with-stream.ts --single --max-retries 5 --timeout 600000

All orchestrator options are supported. See orchestrator help for full options:
  npx tsx scripts/run-orchestrator.ts --help
`);
}

async function startStreamViewer(): Promise<ChildProcess> {
  console.log('🎬 Starting stream viewer...');

  const streamProcess = spawn('npx', ['tsx', 'scripts/stream-orchestrator.ts'], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  // Give the stream viewer a moment to connect
  await new Promise(resolve => setTimeout(resolve, 2000));

  return streamProcess;
}

async function startOrchestrator(args: string[]): Promise<ChildProcess> {
  console.log('🤖 Starting orchestrator...');
  console.log(`Command: npx tsx scripts/run-orchestrator.ts ${args.join(' ')}`);

  const orchestratorProcess = spawn('npx', ['tsx', 'scripts/run-orchestrator.ts', ...args], {
    stdio: 'inherit',
    cwd: process.cwd(),
  });

  return orchestratorProcess;
}

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.showHelp) {
    showHelp();
    return;
  }

  console.log('🚀 Starting Orchestrator with Streaming Output');
  console.log('==================================================');

  let streamProcess: ChildProcess | null = null;
  let orchestratorProcess: ChildProcess | null = null;

  // Cleanup function
  const cleanup = () => {
    console.log('\n🧹 Cleaning up processes...');
    if (streamProcess && !streamProcess.killed) {
      streamProcess.kill('SIGTERM');
    }
    if (orchestratorProcess && !orchestratorProcess.killed) {
      orchestratorProcess.kill('SIGTERM');
    }
  };

  // Handle cleanup on exit
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', cleanup);

  try {
    // Start stream viewer first
    streamProcess = await startStreamViewer();

    // Then start orchestrator
    orchestratorProcess = await startOrchestrator(options.orchestratorArgs);

    // Wait for orchestrator to complete
    await new Promise<void>((resolve, reject) => {
      if (!orchestratorProcess) {
        reject(new Error('Orchestrator process not started'));
        return;
      }

      orchestratorProcess.on('close', code => {
        console.log(`\n✅ Orchestrator finished with exit code: ${code}`);
        resolve();
      });

      orchestratorProcess.on('error', error => {
        console.error('❌ Orchestrator error:', error);
        reject(error);
      });
    });
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    cleanup();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { main as runOrchestratorWithStream };
