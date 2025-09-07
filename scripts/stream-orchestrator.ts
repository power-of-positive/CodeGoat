#!/usr/bin/env npx tsx

/**
 * Orchestrator Stream Viewer CLI
 *
 * This script connects to the orchestrator's Server-Sent Events stream to display
 * real-time progress of Claude execution, validation stages, and other events.
 *
 * Usage:
 *   npx tsx scripts/stream-orchestrator.ts [sessionId]
 *
 * Examples:
 *   # Stream all orchestrator events
 *   npx tsx scripts/stream-orchestrator.ts
 *
 *   # Stream events for specific session
 *   npx tsx scripts/stream-orchestrator.ts orchestrator-1693123456789-abc123
 */

import fetch from 'node-fetch';

interface EventData {
  [key: string]: unknown;
}

interface StreamEvent {
  type: string;
  data: EventData;
  timestamp: string;
  sessionId: string;
}

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

function formatEventType(type: string): string {
  const typeColors = {
    orchestrator_start: colors.green,
    orchestrator_stop: colors.red,
    task_start: colors.cyan,
    task_complete: colors.green,
    task_failed: colors.red,
    claude_start: colors.blue,
    claude_output: colors.white,
    claude_error: colors.red,
    claude_complete: colors.blue,
    validation_start: colors.yellow,
    validation_stage: colors.yellow,
    validation_complete: colors.green,
    validation_failed: colors.red,
    retry_attempt: colors.magenta,
    info: colors.cyan,
    error: colors.red,
    debug: colors.dim,
  };

  const color = typeColors[type as keyof typeof typeColors] || colors.white;
  return `${color}${type}${colors.reset}`;
}

function formatEventData(event: StreamEvent): string {
  switch (event.type) {
    case 'orchestrator_start':
      return `Started with options: ${JSON.stringify(event.data.options || {}, null, 2)}`;

    case 'task_start':
      return `Task ${colors.bright}${event.data.taskId}${colors.reset}: ${event.data.taskContent}`;

    case 'task_complete':
      return `Task ${colors.bright}${event.data.taskId}${colors.reset} completed in ${event.data.duration}ms (${event.data.attempts} attempts)`;

    case 'task_failed':
      return `Task ${colors.bright}${event.data.taskId}${colors.reset} failed after ${event.data.attempts} attempts: ${event.data.error}`;

    case 'claude_start':
      return `Claude execution started for ${colors.bright}${event.data.taskId}${colors.reset} (attempt ${event.data.attempt})\\nPrompt: ${event.data.promptPreview}`;

    case 'claude_output': {
      // Clean up the output and add indentation
      const output = (event.data.output as string).replace(/\n$/, ''); // Remove trailing newline
      if (output.trim()) {
        return `${colors.dim}> ${colors.reset}${output}`;
      }
      return '';
    }

    case 'claude_error':
      return `${colors.red}ERROR:${colors.reset} ${event.data.output}`;

    case 'claude_complete':
      return `Claude execution completed for ${colors.bright}${event.data.taskId}${colors.reset} (exit code: ${event.data.exitCode}, duration: ${event.data.duration}ms)`;

    case 'validation_start':
      return `Starting validation for ${colors.bright}${event.data.taskId}${colors.reset} (attempt ${event.data.attempt})`;

    case 'validation_stage': {
      const status =
        event.data.status === 'passed'
          ? colors.green
          : event.data.status === 'failed'
            ? colors.red
            : colors.yellow;
      return `${status}${(event.data.status as string).toUpperCase()}${colors.reset} ${event.data.stageName}${event.data.duration ? ` (${event.data.duration}ms)` : ''}${event.data.error ? `\\n  Error: ${event.data.error}` : ''}`;
    }

    case 'validation_complete': {
      const resultColor = event.data.success ? colors.green : colors.red;
      return `Validation ${resultColor}${event.data.success ? 'PASSED' : 'FAILED'}${colors.reset} for ${colors.bright}${event.data.taskId}${colors.reset} (${event.data.passed}/${event.data.totalStages} stages passed, ${event.data.totalDuration}ms)`;
    }

    case 'retry_attempt':
      return `Retrying ${colors.bright}${event.data.taskId}${colors.reset} (attempt ${event.data.attempt}): ${event.data.reason}`;

    case 'info':
      return String(event.data.message);

    case 'error':
      return `${colors.red}ERROR:${colors.reset} ${event.data.error}`;

    default:
      return JSON.stringify(event.data, null, 2);
  }
}

async function streamOrchestrator(sessionId?: string) {
  const baseUrl = process.env.ORCHESTRATOR_API_BASE || 'http://localhost:3001';
  const streamUrl = `${baseUrl}/api/orchestrator/stream${sessionId ? `?sessionId=${sessionId}` : ''}`;

  console.log(`${colors.cyan}🚀 Connecting to orchestrator stream...${colors.reset}`);
  console.log(`${colors.dim}URL: ${streamUrl}${colors.reset}`);
  if (sessionId) {
    console.log(`${colors.dim}Session Filter: ${sessionId}${colors.reset}`);
  }
  console.log('');

  try {
    const response = await fetch(streamUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    console.log(`${colors.green}✅ Connected! Listening for events...${colors.reset}`);
    console.log('');

    // Read the stream
    const reader = (response.body as unknown as ReadableStream).getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        console.log(`\\n${colors.yellow}📡 Stream ended${colors.reset}`);
        break;
      }

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete messages
      const lines = buffer.split('\\n');
      buffer = lines.pop() || ''; // Keep the incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const eventData = line.substring(6); // Remove 'data: ' prefix
            const event: StreamEvent = JSON.parse(eventData);

            // Format and display the event
            const timestamp = formatTimestamp(event.timestamp);
            const eventType = formatEventType(event.type);
            const eventContent = formatEventData(event);

            // Skip empty output events
            if (event.type === 'claude_output' && !eventContent) {
              continue;
            }

            console.log(
              `${colors.dim}[${timestamp}]${colors.reset} ${eventType} ${colors.dim}(${event.sessionId})${colors.reset}`
            );
            if (eventContent) {
              // Handle multi-line content
              const contentLines = eventContent.split('\\n');
              for (const contentLine of contentLines) {
                console.log(`  ${contentLine}`);
              }
            }
            console.log('');
          } catch (error) {
            console.error(`${colors.red}Error parsing event:${colors.reset}`, error);
            console.error(`${colors.dim}Raw line: ${line}${colors.reset}`);
          }
        }
      }
    }
  } catch (error) {
    console.error(`${colors.red}❌ Stream error:${colors.reset}`, error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\\n${colors.yellow}👋 Disconnecting from stream...${colors.reset}`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`\\n${colors.yellow}👋 Disconnecting from stream...${colors.reset}`);
  process.exit(0);
});

// Main execution
const sessionId = process.argv[2];

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
${colors.bright}Orchestrator Stream Viewer CLI${colors.reset}

This script connects to the orchestrator's Server-Sent Events stream to display
real-time progress of Claude execution, validation stages, and other events.

${colors.bright}Usage:${colors.reset}
  npx tsx scripts/stream-orchestrator.ts [sessionId]

${colors.bright}Examples:${colors.reset}
  # Stream all orchestrator events
  npx tsx scripts/stream-orchestrator.ts

  # Stream events for specific session
  npx tsx scripts/stream-orchestrator.ts orchestrator-1693123456789-abc123

${colors.bright}Environment Variables:${colors.reset}
  ORCHESTRATOR_API_BASE    Base URL for the API (default: http://localhost:3001)

${colors.bright}Event Types:${colors.reset}
  ${formatEventType('orchestrator_start')}  Orchestrator started
  ${formatEventType('task_start')}          Task execution started
  ${formatEventType('claude_start')}        Claude Code execution started
  ${formatEventType('claude_output')}       Real-time Claude output
  ${formatEventType('validation_start')}   Validation pipeline started
  ${formatEventType('validation_stage')}   Individual validation stage result
  ${formatEventType('task_complete')}      Task completed successfully
  ${formatEventType('task_failed')}        Task failed after retries
`);
  process.exit(0);
}

console.log(`${colors.bright}🎯 Orchestrator Stream Viewer${colors.reset}`);
streamOrchestrator(sessionId).catch(error => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, error);
  process.exit(1);
});
