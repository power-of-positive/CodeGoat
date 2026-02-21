jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    appendFileSync: jest.fn(),
  };
});

import express from 'express';
import request from 'supertest';
import * as fs from 'fs';
import router, { __testHelpers, ClaudeWorker } from '../../routes/claude-workers';

describe('DELETE /claude-workers/:workerId', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/claude-workers', router);
    __testHelpers.clearWorkers();
    (fs.appendFileSync as unknown as jest.Mock).mockClear();
  });

  afterEach(() => {
    __testHelpers.clearWorkers();
    jest.clearAllMocks();
  });

  it('stops the worker, removes its worktree, and deletes it from the registry', async () => {
    const killMock = jest.fn();
    const removeWorktreeMock = jest.fn().mockResolvedValue(undefined);

    const mockProcess = { kill: killMock, pid: 1234 } as unknown as any;

    const worker: ClaudeWorker = {
      id: 'worker-123',
      taskId: 'task-456',
      taskContent: 'Test task for deletion',
      process: mockProcess,
      status: 'running',
      startTime: new Date(),
      logFile: '/tmp/worker.log',
      blockedCommands: 0,
      blockedCommandsList: [],
      structuredEntries: [],
      validationRuns: [],
      worktreePath: '/tmp/worktree',
      worktreeManager: {
        removeWorktree: removeWorktreeMock,
      } as unknown as any,
      validationPassed: undefined,
      validationAttempts: 0,
      maxValidationAttempts: 3,
    };

    __testHelpers.setWorker(worker);

    const response = await request(app).delete('/claude-workers/worker-123');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.workerId).toBe('worker-123');
    expect(killMock).toHaveBeenCalledWith('SIGTERM');
    expect(removeWorktreeMock).toHaveBeenCalledWith('/tmp/worktree');
    expect(__testHelpers.getWorker('worker-123')).toBeUndefined();
    expect(fs.appendFileSync).toHaveBeenCalled();
  });

  it('returns 404 when the worker is not found', async () => {
    const response = await request(app).delete('/claude-workers/missing-worker');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toBe('Worker not found');
  });
});
