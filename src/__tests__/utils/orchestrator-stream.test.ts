import { EventEmitter } from 'events';
import { OrchestratorStreamManager } from '../../utils/orchestrator-stream';
import type { Response } from 'express';

class ResponseStub extends EventEmitter {
  public chunks: string[] = [];
  public statusCode = 200;
  public headers: Record<string, unknown> = {};
  public ended = false;

  writeHead(status: number, headers: Record<string, unknown>): void {
    this.statusCode = status;
    this.headers = headers;
  }

  write(chunk: string): boolean {
    this.chunks.push(chunk.toString());
    return true;
  }

  end(): void {
    this.ended = true;
  }
}

describe('OrchestratorStreamManager', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeAll(() => {
    process.env.NODE_ENV = 'test'; // disable cleanup interval
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('adds clients, buffers events, and respects session filters', () => {
    const manager = new OrchestratorStreamManager(10, 1000);
    const responseAll = new ResponseStub();
    const responseSession = new ResponseStub();

    manager.addClient('client-all', responseAll as unknown as Response);
    manager.addClient('client-session', responseSession as unknown as Response, 'session-1');

    manager.broadcastTaskStart('session-1', 'task-1', 'content');
    manager.broadcastTaskStart('session-2', 'task-2', 'content');

    expect(responseAll.chunks.length).toBeGreaterThan(1);
    expect(
      responseSession.chunks.some(chunk => chunk.includes('"task-1"'))
    ).toBeTruthy();
    expect(
      responseSession.chunks.some(chunk => chunk.includes('"task-2"'))
    ).toBeFalsy();

    expect(manager.getClientCount()).toBe(2);
    expect(manager.getClientCount('session-1')).toBe(2); // global + session filter
    expect(manager.getActiveSessions()).toContain('session-1');
  });

  it('removes clients on disconnect', () => {
    const manager = new OrchestratorStreamManager();
    const response = new ResponseStub();

    manager.addClient('client-remove', response as unknown as Response);
    expect(manager.getClientCount()).toBe(1);

    response.emit('close');
    expect(manager.getClientCount()).toBe(0);
    expect(response.ended).toBeTruthy();
  });

  it('handles response end failures gracefully', () => {
    const manager = new OrchestratorStreamManager();
    const response = new ResponseStub();
    const endSpy = jest.spyOn(response, 'end').mockImplementation(() => {
      throw new Error('end failure');
    });

    manager.addClient('client-error', response as unknown as Response);

    expect(() => manager.removeClient('client-error')).not.toThrow();
    expect(manager.getClientCount()).toBe(0);

    endSpy.mockRestore();
  });

  it('cleans up resources', () => {
    const manager = new OrchestratorStreamManager();
    const response = new ResponseStub();

    manager.addClient('client', response as unknown as Response);
    expect(manager.getClientCount()).toBe(1);

    const shutdownSpy = jest.fn();
    manager.on('shutdown', shutdownSpy);
    manager.cleanup();

    expect(manager.getClientCount()).toBe(0);
    expect(shutdownSpy).toHaveBeenCalled();
  });

  it('trims buffered events based on retention policy', () => {
    jest.useFakeTimers({ now: Date.now() });
    const manager = new OrchestratorStreamManager(5, 50);

    const emitEvent = (session: string, task: string) =>
      manager.broadcastTaskStart(session, task, `${task} content`);

    emitEvent('session-1', 'task-1');
    jest.advanceTimersByTime(30);
    emitEvent('session-1', 'task-2');
    jest.advanceTimersByTime(30);

    (manager as any).cleanupBuffer();

    const buffer = (manager as any).eventBuffer as Array<{ data: { taskId: string } }>;
    expect(buffer.length).toBe(1);
    expect(buffer[0].data.taskId).toBe('task-2');

    jest.useRealTimers();
  });

  it('logs write errors without crashing', () => {
    const manager = new OrchestratorStreamManager();
    const response = new ResponseStub();
    jest.spyOn(response, 'write').mockImplementation(() => {
      throw new Error('write failure');
    });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    manager.addClient('client-write-error', response as unknown as Response);
    expect(() => manager.broadcastTaskFailed('session', 'task', 'boom', 1)).not.toThrow();

    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it('broadcasts all orchestrator lifecycle events', () => {
    const manager = new OrchestratorStreamManager(50, 1000);
    const response = new ResponseStub();

    manager.addClient('client', response as unknown as Response, 'session-42');

    manager.broadcastOrchestratorStart('session-42', { mode: 'auto' });
    manager.broadcastOrchestratorStop('session-42', 'completed');
    manager.broadcastTaskStart('session-42', 'task-1', 'do something important');
    manager.broadcastTaskComplete('session-42', 'task-1', 2, 1500);
    manager.broadcastTaskFailed('session-42', 'task-2', 'boom', 1);
    manager.broadcastClaudeStart('session-42', 'task-1', 1, 'prompt content'.repeat(20));
    manager.broadcastClaudeOutput('session-42', 'task-1', 'partial output');
    manager.broadcastClaudeOutput('session-42', 'task-1', 'error output', true);
    manager.broadcastClaudeComplete('session-42', 'task-1', 0, 2500);
    manager.broadcastValidationStart('session-42', 'task-1', 1);
    manager.broadcastValidationStage('session-42', 'task-1', 'lint', 'running', 1200);
    manager.broadcastValidationComplete('session-42', 'task-1', true, 3, 3, 0, 5000);
    manager.broadcastRetryAttempt('session-42', 'task-1', 2, 'intermittent failure');
    manager.broadcastInfo('session-42', 'Informational message', { foo: 'bar' });
    manager.broadcastError('session-42', 'Something went wrong', { code: 500 });

    const serialized = response.chunks.join('');
    expect(serialized).toContain('"type":"orchestrator_start"');
    expect(serialized).toContain('"type":"claude_error"');
    expect(serialized).toContain('"type":"validation_complete"');
    expect(serialized).toContain('"message":"Informational message"');
    expect(serialized).toContain('"error":"Something went wrong"');

    expect(manager.getClientCount('session-42')).toBe(1);
    expect(manager.getClientCount('different-session')).toBe(0);
  });
});
