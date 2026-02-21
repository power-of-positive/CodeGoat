import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import router, { __testHelpers, ClaudeWorker } from '../../routes/claude-workers';

describe('Claude workers routes - status and maintenance', () => {
  const app = express().use('/claude-workers', router);

  const baseWorker: Omit<ClaudeWorker, 'status' | 'process'> = {
    id: 'worker-1',
    taskId: 'task-1',
    taskContent: 'Test task content',
    startTime: new Date(),
    endTime: undefined,
    logFile: path.join(os.tmpdir(), 'claude-worker.log'),
    blockedCommands: 0,
    blockedCommandsList: [],
    structuredEntries: [],
    validationRuns: [],
    validationAttempts: 0,
    maxValidationAttempts: 3,
    worktreePath: undefined,
    worktreeManager: undefined,
    validationPassed: undefined,
    devServerBackend: undefined,
    devServerFrontend: undefined,
    devServerBackendPort: undefined,
    devServerFrontendPort: undefined,
    pid: 1234,
    interceptor: undefined,
  };

  beforeEach(() => {
    __testHelpers.clearWorkers();
    if (!fs.existsSync(baseWorker.logFile)) {
      fs.writeFileSync(baseWorker.logFile, '', { flag: 'w' });
    }
  });

  afterAll(() => {
    __testHelpers.clearWorkers();
    if (fs.existsSync(baseWorker.logFile)) {
      fs.unlinkSync(baseWorker.logFile);
    }
  });

  const createWorker = (overrides: Partial<ClaudeWorker> = {}): ClaudeWorker => {
    return {
      ...baseWorker,
      status: 'running',
      process: { kill: jest.fn() } as any,
      ...overrides,
    } as ClaudeWorker;
  };

  it('returns aggregated worker status information', async () => {
    const workerA = createWorker({ id: 'worker-A', taskId: 'task-A' });
    const workerB = createWorker({ id: 'worker-B', taskId: 'task-B', status: 'completed' });
    __testHelpers.setWorker(workerA);
    __testHelpers.setWorker(workerB);

    const response = await request(app).get('/claude-workers/status');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.totalCount).toBe(2);
    expect(response.body.data.activeCount).toBe(1);
  });

  it('returns detailed worker information including validation history', async () => {
    const validationRun = {
      id: 'validation-1',
      timestamp: new Date(),
      stages: [
        {
          name: 'lint',
          command: 'npm run lint',
          status: 'passed' as const,
          duration: 1200,
        },
      ],
      overallStatus: 'passed' as const,
      metricsFile: 'metrics.json',
    };

    const worker = createWorker({
      validationRuns: [validationRun],
      status: 'completed',
      validationPassed: true,
    });

    __testHelpers.setWorker(worker);

    const response = await request(app).get(`/claude-workers/${worker.id}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.validationHistory).toHaveLength(1);
    expect(response.body.data.lastValidationRun.overallStatus).toBe('passed');
  });

  it('clears completed workers from memory', async () => {
    const running = createWorker({ id: 'worker-running', status: 'running' });
    const completed = createWorker({ id: 'worker-completed', status: 'completed' });
    __testHelpers.setWorker(running);
    __testHelpers.setWorker(completed);

    const response = await request(app).post('/claude-workers/clear');

    expect(response.status).toBe(200);
    expect(response.body.data.clearedCount).toBe(1);
    expect(__testHelpers.getWorker('worker-completed')).toBeUndefined();
    expect(__testHelpers.getWorker('worker-running')).toBeDefined();
  });

  it('stops all running workers', async () => {
    const processMock = { kill: jest.fn() };
    const worker = createWorker({ id: 'worker-stop', process: processMock as any, status: 'running' });
    __testHelpers.setWorker(worker);

    const response = await request(app).post('/claude-workers/stop-all');

    expect(response.status).toBe(200);
    expect(response.body.data.stoppedCount).toBe(1);
    expect(processMock.kill).toHaveBeenCalledWith('SIGTERM');
  });
});
