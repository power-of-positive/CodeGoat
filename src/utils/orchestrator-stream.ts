import { EventEmitter } from 'events';
import { Response } from 'express';

export interface StreamEvent {
  type:
    | 'orchestrator_start'
    | 'orchestrator_stop'
    | 'task_start'
    | 'task_complete'
    | 'task_failed'
    | 'claude_start'
    | 'claude_output'
    | 'claude_error'
    | 'claude_complete'
    | 'validation_start'
    | 'validation_stage'
    | 'validation_complete'
    | 'validation_failed'
    | 'retry_attempt'
    | 'error'
    | 'info'
    | 'debug';
  data: unknown;
  timestamp: string;
  sessionId: string;
}

export interface StreamClient {
  id: string;
  response: Response;
  sessionId?: string; // Optional filter for specific orchestrator sessions
}

/**
 * OrchestratorStreamManager - Manages real-time streaming of orchestrator events
 *
 * This class provides Server-Sent Events (SSE) streaming capabilities for the orchestrator,
 * allowing clients to receive real-time updates about task execution, Claude output,
 * validation results, and other orchestrator events.
 *
 * Features:
 * - SSE streaming to multiple clients
 * - Session filtering (clients can subscribe to specific orchestrator sessions)
 * - Event buffering for new clients
 * - Automatic client cleanup on disconnect
 * - Structured event format with timestamps
 */
export class OrchestratorStreamManager extends EventEmitter {
  private clients = new Map<string, StreamClient>();
  private eventBuffer: StreamEvent[] = [];
  private readonly maxBufferSize: number;
  private readonly bufferRetentionMs: number;

  private cleanupIntervalId?: NodeJS.Timeout;

  constructor(maxBufferSize: number = 100, bufferRetentionMs: number = 300000) {
    // 5 minutes
    super();
    this.maxBufferSize = maxBufferSize;
    this.bufferRetentionMs = bufferRetentionMs;

    // Clean up old buffered events periodically
    // Only set up interval if not in test environment
    if (process.env.NODE_ENV !== 'test') {
      this.cleanupIntervalId = setInterval(() => {
        this.cleanupBuffer();
      }, 60000); // Every minute
    }
  }

  /**
   * Add a new SSE client
   */
  addClient(clientId: string, response: Response, sessionId?: string): void {
    // Set up SSE headers
    response.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Send initial connection event
    this.sendToClient(response, {
      type: 'info',
      data: { message: 'Connected to orchestrator stream', clientId, sessionId },
      timestamp: new Date().toISOString(),
      sessionId: sessionId ?? 'global',
    });

    // Store client
    const client: StreamClient = { id: clientId, response, sessionId };
    this.clients.set(clientId, client);

    // Send recent buffered events to new client
    this.sendBufferedEventsToClient(client);

    // Handle client disconnect
    response.on('close', () => {
      this.removeClient(clientId);
    });

    response.on('error', error => {
      console.error(`SSE client ${clientId} error:`, error);
      this.removeClient(clientId);
    });

    this.emit('client_connected', { clientId, sessionId });
  }

  /**
   * Remove a client
   */
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.response.end();
      } catch {
        // Ignore errors when ending response
      }
      this.clients.delete(clientId);
      this.emit('client_disconnected', { clientId });
    }
  }

  /**
   * Broadcast an event to all relevant clients
   */
  broadcastEvent(event: Omit<StreamEvent, 'timestamp'>): void {
    const streamEvent: StreamEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    // Add to buffer
    this.addToBuffer(streamEvent);

    // Send to all matching clients
    for (const client of this.clients.values()) {
      if (this.shouldSendToClient(client, streamEvent)) {
        this.sendToClient(client.response, streamEvent);
      }
    }
  }

  /**
   * Send orchestrator started event
   */
  broadcastOrchestratorStart(sessionId: string, options: unknown): void {
    this.broadcastEvent({
      type: 'orchestrator_start',
      data: { sessionId, options },
      sessionId,
    });
  }

  /**
   * Send orchestrator stopped event
   */
  broadcastOrchestratorStop(sessionId: string, reason: string): void {
    this.broadcastEvent({
      type: 'orchestrator_stop',
      data: { sessionId, reason },
      sessionId,
    });
  }

  /**
   * Send task started event
   */
  broadcastTaskStart(sessionId: string, taskId: string, taskContent: string): void {
    this.broadcastEvent({
      type: 'task_start',
      data: { sessionId, taskId, taskContent: taskContent.substring(0, 200) },
      sessionId,
    });
  }

  /**
   * Send task completed event
   */
  broadcastTaskComplete(
    sessionId: string,
    taskId: string,
    attempts: number,
    duration: number
  ): void {
    this.broadcastEvent({
      type: 'task_complete',
      data: { sessionId, taskId, attempts, duration },
      sessionId,
    });
  }

  /**
   * Send task failed event
   */
  broadcastTaskFailed(sessionId: string, taskId: string, error: string, attempts: number): void {
    this.broadcastEvent({
      type: 'task_failed',
      data: { sessionId, taskId, error, attempts },
      sessionId,
    });
  }

  /**
   * Send Claude started event
   */
  broadcastClaudeStart(sessionId: string, taskId: string, attempt: number, prompt: string): void {
    this.broadcastEvent({
      type: 'claude_start',
      data: {
        sessionId,
        taskId,
        attempt,
        promptLength: prompt.length,
        promptPreview: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
      },
      sessionId,
    });
  }

  /**
   * Send Claude output chunk
   */
  broadcastClaudeOutput(
    sessionId: string,
    taskId: string,
    output: string,
    isError: boolean = false
  ): void {
    this.broadcastEvent({
      type: isError ? 'claude_error' : 'claude_output',
      data: { sessionId, taskId, output },
      sessionId,
    });
  }

  /**
   * Send Claude completed event
   */
  broadcastClaudeComplete(
    sessionId: string,
    taskId: string,
    exitCode: number,
    duration: number
  ): void {
    this.broadcastEvent({
      type: 'claude_complete',
      data: { sessionId, taskId, exitCode, duration },
      sessionId,
    });
  }

  /**
   * Send validation started event
   */
  broadcastValidationStart(sessionId: string, taskId: string, attempt: number): void {
    this.broadcastEvent({
      type: 'validation_start',
      data: { sessionId, taskId, attempt },
      sessionId,
    });
  }

  /**
   * Send validation stage event
   */
  broadcastValidationStage(
    sessionId: string,
    taskId: string,
    stageName: string,
    status: 'running' | 'passed' | 'failed',
    duration?: number,
    error?: string
  ): void {
    this.broadcastEvent({
      type: 'validation_stage',
      data: { sessionId, taskId, stageName, status, duration, error },
      sessionId,
    });
  }

  /**
   * Send validation completed event
   */
  broadcastValidationComplete(
    sessionId: string,
    taskId: string,
    success: boolean,
    totalStages: number,
    passed: number,
    failed: number,
    totalDuration: number
  ): void {
    this.broadcastEvent({
      type: 'validation_complete',
      data: { sessionId, taskId, success, totalStages, passed, failed, totalDuration },
      sessionId,
    });
  }

  /**
   * Send retry attempt event
   */
  broadcastRetryAttempt(sessionId: string, taskId: string, attempt: number, reason: string): void {
    this.broadcastEvent({
      type: 'retry_attempt',
      data: { sessionId, taskId, attempt, reason },
      sessionId,
    });
  }

  /**
   * Send info message
   */
  broadcastInfo(sessionId: string, message: string, data?: unknown): void {
    this.broadcastEvent({
      type: 'info',
      data: { message, ...(typeof data === 'object' && data !== null ? data : {}) },
      sessionId,
    });
  }

  /**
   * Send error message
   */
  broadcastError(sessionId: string, error: string, data?: unknown): void {
    this.broadcastEvent({
      type: 'error',
      data: { error, ...(typeof data === 'object' && data !== null ? data : {}) },
      sessionId,
    });
  }

  /**
   * Get current client count
   */
  getClientCount(sessionId?: string): number {
    if (!sessionId) {
      return this.clients.size;
    }
    return Array.from(this.clients.values()).filter(
      client => client.sessionId === sessionId || client.sessionId === undefined
    ).length;
  }

  /**
   * Get all active session IDs
   */
  getActiveSessions(): string[] {
    const sessions = new Set<string>();
    for (const event of this.eventBuffer) {
      sessions.add(event.sessionId);
    }
    return Array.from(sessions);
  }

  private sendToClient(response: Response, event: StreamEvent): void {
    try {
      const data = JSON.stringify(event);
      response.write(`data: ${data}\n\n`);
    } catch (error) {
      console.error('Error sending SSE event:', error);
    }
  }

  private shouldSendToClient(client: StreamClient, event: StreamEvent): boolean {
    // If client has no session filter, send all events
    if (!client.sessionId) {
      return true;
    }

    // If client has session filter, only send matching events
    return client.sessionId === event.sessionId;
  }

  private sendBufferedEventsToClient(client: StreamClient): void {
    const relevantEvents = this.eventBuffer.filter(event => this.shouldSendToClient(client, event));

    // Send last 20 events to avoid overwhelming new clients
    const recentEvents = relevantEvents.slice(-20);

    for (const event of recentEvents) {
      this.sendToClient(client.response, event);
    }
  }

  private addToBuffer(event: StreamEvent): void {
    this.eventBuffer.push(event);

    // Trim buffer if too large
    if (this.eventBuffer.length > this.maxBufferSize) {
      this.eventBuffer = this.eventBuffer.slice(-this.maxBufferSize);
    }
  }

  private cleanupBuffer(): void {
    const cutoffTime = Date.now() - this.bufferRetentionMs;
    this.eventBuffer = this.eventBuffer.filter(event => {
      const eventTime = new Date(event.timestamp).getTime();
      return eventTime > cutoffTime;
    });
  }

  /**
   * Shutdown the stream manager
   */
  shutdown(): void {
    // Close all client connections
    for (const client of this.clients.values()) {
      this.removeClient(client.id);
    }

    // Clear buffer
    this.eventBuffer = [];

    this.emit('shutdown');
  }

  /**
   * Clean up resources
   */
  cleanup(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = undefined;
    }
    this.shutdown();
  }
}

// Global stream manager instance
export const orchestratorStreamManager = new OrchestratorStreamManager();
