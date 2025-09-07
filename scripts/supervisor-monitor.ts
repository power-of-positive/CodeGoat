#!/usr/bin/env npx ts-node

import { promises as fs } from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

// Time constants
const DAYS_TO_KEEP_LOGS = 7;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1000;

interface SessionStatus {
  sessionId: string;
  status: 'running' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  attempts: number;
  currentStage?: string;
  lastActivity: string;
}

class SupervisorMonitor {
  private logDir: string;

  constructor(logDir: string = './logs/supervisor') {
    this.logDir = logDir;
  }

  async getActiveSessions(): Promise<SessionStatus[]> {
    try {
      const files = await fs.readdir(this.logDir);
      const sessions: SessionStatus[] = [];

      for (const file of files) {
        if (file.endsWith('-results.json')) {
          const sessionPath = path.join(this.logDir, file);
          const sessionData = JSON.parse(await fs.readFile(sessionPath, 'utf8'));

          sessions.push({
            sessionId: sessionData.sessionId,
            status: sessionData.success ? 'completed' : 'failed',
            startTime: sessionData.startTime || 'unknown',
            endTime: sessionData.endTime,
            attempts: sessionData.attempts,
            lastActivity: sessionData.lastActivity || 'unknown',
          });
        }
      }

      return sessions.sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
    } catch (error) {
      console.error('Error reading sessions:', error);
      return [];
    }
  }

  async showStatus(): Promise<void> {
    console.error('🎯 Claude Supervisor Monitor\n');

    const sessions = await this.getActiveSessions();

    if (sessions.length === 0) {
      console.error('📭 No sessions found');
      return;
    }

    console.error(`📊 Found ${sessions.length} session(s):\n`);

    for (const session of sessions.slice(0, 10)) {
      // Show last 10 sessions
      const statusIcon =
        session.status === 'completed' ? '✅' : session.status === 'failed' ? '❌' : '🔄';

      console.error(`${statusIcon} ${session.sessionId}`);
      console.error(`   Status: ${session.status}`);
      console.error(`   Started: ${session.startTime}`);
      console.error(`   Attempts: ${session.attempts}`);
      if (session.endTime) {
        console.error(`   Ended: ${session.endTime}`);
      }
      console.error(`   Last Activity: ${session.lastActivity}`);
      console.error('');
    }
  }

  async watchLogs(sessionId?: string): Promise<void> {
    console.error(`👀 Watching logs${sessionId ? ` for ${sessionId}` : ' (latest)'}...\n`);

    // Find the latest log file
    let logFile: string;

    if (sessionId) {
      const files = await fs.readdir(this.logDir);
      const sessionFiles = files.filter(f => f.startsWith(sessionId));
      if (sessionFiles.length === 0) {
        console.error(`❌ No logs found for session ${sessionId}`);
        return;
      }
      logFile = path.join(this.logDir, sessionFiles[sessionFiles.length - 1]);
    } else {
      const files = await fs.readdir(this.logDir);
      const logFiles = files.filter(f => f.endsWith('.log')).sort();
      if (logFiles.length === 0) {
        console.error('❌ No log files found');
        return;
      }
      logFile = path.join(this.logDir, logFiles[logFiles.length - 1]);
    }

    // Use tail to follow the log
    const tail = spawn('tail', ['-f', logFile]);

    tail.stdout.on('data', data => {
      process.stdout.write(data);
    });

    tail.stderr.on('data', data => {
      process.stderr.write(data);
    });

    tail.on('close', code => {
      console.error(`\nLog watching ended with code ${code}`);
    });

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      tail.kill();
      process.exit(0);
    });
  }

  async killSession(sessionId: string): Promise<void> {
    try {
      // Find processes related to the session
      const ps = spawn('ps', ['aux']);
      const grep = spawn('grep', [sessionId]);

      ps.stdout.pipe(grep.stdin);

      let output = '';
      grep.stdout.on('data', data => {
        output += data.toString();
      });

      grep.on('close', _code => {
        if (output.trim()) {
          const lines = output.trim().split('\n');
          for (const line of lines) {
            const parts = line.split(/\s+/);
            const pid = parts[1];
            if (pid && !isNaN(parseInt(pid))) {
              console.error(`🛑 Killing process ${pid} for session ${sessionId}`);
              spawn('kill', ['-TERM', pid]);
            }
          }
        } else {
          console.error(`ℹ️ No running processes found for session ${sessionId}`);
        }
      });
    } catch (error) {
      console.error('Error killing session:', error);
    }
  }

  async cleanup(): Promise<void> {
    console.error('🧹 Cleaning up old logs...');

    try {
      const files = await fs.readdir(this.logDir);
      const now = Date.now();
      const maxAge =
        DAYS_TO_KEEP_LOGS * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND; // 7 days

      let cleanedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.logDir, file);
        const stats = await fs.stat(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }

      console.error(`✅ Cleaned up ${cleanedCount} old files`);
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const monitor = new SupervisorMonitor();

  switch (command) {
    case 'status':
      await monitor.showStatus();
      break;

    case 'watch': {
      const sessionId = args[1];
      await monitor.watchLogs(sessionId);
      break;
    }

    case 'kill': {
      const killSessionId = args[1];
      if (!killSessionId) {
        console.error('❌ Session ID required for kill command');
        process.exit(1);
      }
      await monitor.killSession(killSessionId);
      break;
    }

    case 'cleanup':
      await monitor.cleanup();
      break;

    default:
      console.error(`
🎯 Claude Supervisor Monitor

Usage:
  npx ts-node scripts/supervisor-monitor.ts <command> [args]

Commands:
  status                 Show status of all sessions
  watch [sessionId]      Watch logs (latest or specific session)  
  kill <sessionId>       Kill a running session
  cleanup                Clean up old log files

Examples:
  npx ts-node scripts/supervisor-monitor.ts status
  npx ts-node scripts/supervisor-monitor.ts watch session-1-123456
  npx ts-node scripts/supervisor-monitor.ts kill session-1-123456
      `);
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { SupervisorMonitor };
