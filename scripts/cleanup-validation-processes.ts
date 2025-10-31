#!/usr/bin/env ts-node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface ProcessInfo {
  pid: string;
  command: string;
  user: string;
}

const VALIDATION_PROCESS_PATTERNS = [
  'validate-task.ts',
  'check-typescript-preference.ts',
  'check-uncommitted-files.ts',
  'validate-todo-list.ts',
  'ai-code-reviewer.ts',
  'check-dead-code.ts',
  'visual-regression.js',
  'playwright test',
  'jest --coverage',
  'jest --watchAll=false',
  '/chromium_headless_shell',
  '/playwright/',
];

async function findValidationProcesses(): Promise<ProcessInfo[]> {
  try {
    const { stdout } = await execAsync('ps aux');
    const lines = stdout.split('\n');
    const processes: ProcessInfo[] = [];

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 11) continue;

      const user = parts[0];
      const pid = parts[1];
      const command = parts.slice(10).join(' ');

      // Only look at processes owned by current user
      if (user !== process.env.USER) continue;

      // Check if this process matches validation patterns
      const isValidationProcess = VALIDATION_PROCESS_PATTERNS.some(pattern =>
        command.includes(pattern)
      );

      if (isValidationProcess) {
        processes.push({ pid, command, user });
      }
    }

    return processes;
  } catch (error) {
    console.error('Failed to find processes:', error);
    return [];
  }
}

async function killProcesses(processes: ProcessInfo[]): Promise<void> {
  console.log(`🔄 Found ${processes.length} validation-related processes to clean up`);

  if (processes.length === 0) {
    console.log('✅ No orphaned validation processes found');
    return;
  }

  const pidsToKill = processes.map(p => p.pid);

  // First try graceful termination with SIGTERM
  try {
    const killCommand = `kill ${pidsToKill.join(' ')}`;
    console.log('🔧 Sending SIGTERM to processes...');
    await execAsync(killCommand);

    // Wait 2 seconds for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 2000));
  } catch (error) {
    console.log('⚠️ Some processes may have already exited');
  }

  // Check which processes are still running and force kill them
  const stillRunning = await findValidationProcesses();
  const stillRunningPids = stillRunning.map(p => p.pid);

  if (stillRunningPids.length > 0) {
    try {
      const forceKillCommand = `kill -9 ${stillRunningPids.join(' ')}`;
      console.log('💀 Force killing remaining processes with SIGKILL...');
      await execAsync(forceKillCommand);
    } catch (error) {
      console.log('⚠️ Some processes may have already exited');
    }
  }

  console.log('🧹 Process cleanup completed');
}

async function cleanupValidationProcesses(): Promise<void> {
  try {
    console.log('🔍 Scanning for orphaned validation processes...');

    const processes = await findValidationProcesses();

    // Filter out the current script process and legitimate dev servers
    const orphanedProcesses = processes.filter(p => {
      // Don't kill the current cleanup script
      if (p.command.includes('cleanup-validation-processes.ts')) return false;

      // Don't kill legitimate dev servers (they should have 'dev' in command)
      if (p.command.includes('npm run dev') || p.command.includes('nodemon')) return false;

      // Don't kill VS Code processes
      if (p.command.includes('Visual Studio Code')) return false;

      return true;
    });

    if (orphanedProcesses.length > 0) {
      console.log('\n📋 Orphaned processes found:');
      orphanedProcesses.forEach(p => {
        console.log(`  PID ${p.pid}: ${p.command.substring(0, 100)}...`);
      });
      console.log('');

      await killProcesses(orphanedProcesses);
    } else {
      console.log('✅ No orphaned validation processes found');
    }
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  }
}

if (require.main === module) {
  cleanupValidationProcesses().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { cleanupValidationProcesses };
