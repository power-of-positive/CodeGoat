import fs from 'fs';
import os from 'os';
import path from 'path';
import express from 'express';
import request from 'supertest';
import { EventEmitter } from 'events';
import * as childProcess from 'child_process';
import router, {
  __testHelpers,
  ClaudeWorker,
} from '../../routes/claude-workers';
import { logManager } from '../../utils/log-manager';

// Silence unused import warning for router (ensures module side-effects run)
void router;

const runValidationMock = jest.fn();
const cleanupMock = jest.fn();

jest.mock('../../../scripts/validate-task', () => {
  return {
    ValidationRunner: jest.fn(() => ({
      runValidation: runValidationMock,
      cleanup: cleanupMock,
    })),
  };
});

jest.mock('child_process', () => {
  const actual = jest.requireActual('child_process');
  return {
    ...actual,
    spawn: jest.fn((...args) => (actual.spawn as any)(...args)),
  };
});

jest.mock('../../services/database', () => {
  const taskStore: Record<string, any> = {};
  const findUniqueMock = jest.fn(({ where }: { where: { id: string } }) => {
    return taskStore[where.id] ?? null;
  });
  const updateMock = jest.fn(({ where, data }: { where: { id: string }; data: any }) => {
    taskStore[where.id] = { ...(taskStore[where.id] ?? {}), ...data };
    return taskStore[where.id];
  });

  return {
    __taskStore: taskStore,
    __mocks: {
      findUniqueMock,
      updateMock,
    },
    getDatabaseService: () => ({
      task: {
        findUnique: findUniqueMock,
        update: updateMock,
      },
    }),
  };
});


describe('claude-workers internal helpers', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'claude-workers-'));
    jest.clearAllMocks();
    const dbMock = jest.requireMock('../../services/database') as {
      __taskStore: Record<string, any>;
    };
    Object.keys(dbMock.__taskStore).forEach(key => delete dbMock.__taskStore[key]);
    __testHelpers.clearWorkers();
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/claude-workers', router);
    return app;
  };

  const buildWorker = (overrides: Partial<ClaudeWorker> = {}): ClaudeWorker => ({
    id: 'worker-1',
    taskId: 'task-1',
    taskContent: 'Demo task content',
    process: null,
    status: 'running',
    startTime: new Date(),
    logFile: path.join(tempDir, 'worker.log'),
    blockedCommands: 0,
    blockedCommandsList: [],
    structuredEntries: [],
    validationRuns: [],
    validationAttempts: 0,
    maxValidationAttempts: 3,
    validationPassed: undefined,
    worktreeManager: undefined,
    worktreePath: undefined,
    ...overrides,
  });

  describe('isNonCommand', () => {
    it('classifies various non-command strings correctly', () => {
      const { isNonCommand } = __testHelpers;

      expect(isNonCommand('')).toBe(true); // empty
      expect(isNonCommand('INFO: just a log')).toBe(true); // log prefix
      expect(isNonCommand('https://example.com')).toBe(true); // url
      expect(isNonCommand('./relative/path')).toBe(true); // path only
      expect(isNonCommand('2024:11:03')).toBe(true); // numeric timestamp-like
      expect(isNonCommand('2024-11-03')).toBe(false); // dash containing string treated as command candidate
      expect(isNonCommand('{"json":true}')).toBe(true); // json
      expect(isNonCommand('npm run build')).toBe(false); // real command
    });
  });

  describe('monitorCommandOutput', () => {
    function createWorker(): ClaudeWorker {
      return {
        id: 'worker-1',
        taskId: 'task-1',
        taskContent: 'demo task',
        process: null,
        status: 'running',
        startTime: new Date(),
        logFile: path.join(tempDir, 'worker.log'),
        blockedCommands: 0,
        blockedCommandsList: [],
        structuredEntries: [],
        validationRuns: [],
        validationAttempts: 0,
        maxValidationAttempts: 3,
        interceptor: {
          analyzeCommand: jest.fn(command => {
            if (command.includes('rm')) {
              return {
                allowed: false,
                reason: 'dangerous command',
                severity: 'error',
              };
            }
            return {
              allowed: true,
              reason: 'allowed',
              severity: 'info',
            };
          }),
        } as any,
      } as ClaudeWorker;
    }

    it('blocks dangerous commands and records metadata', () => {
      const worker = createWorker();
      const { monitorCommandOutput } = __testHelpers;

      const output = monitorCommandOutput(
        worker,
        'Executing command: rm -rf /\nRegular output line'
      );

      expect(output).toContain('🚫 COMMAND BLOCKED');
      expect(worker.blockedCommands).toBe(1);
      expect(worker.blockedCommandsList).toHaveLength(1);
      expect(worker.blockedCommandsList[0].command).toContain('rm -rf /');
    });

    it('passes through safe commands without blocking', () => {
      const worker = createWorker();
      const { monitorCommandOutput } = __testHelpers;

      const output = monitorCommandOutput(worker, 'Executing command: ls -la');

      expect(output).not.toContain('🚫 COMMAND BLOCKED');
      expect(worker.blockedCommands).toBe(0);
    });
  });

  describe('ensureLogDirectory', () => {
    it('creates dated log directory beneath current working directory', () => {
      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempDir);

      const { ensureLogDirectory } = __testHelpers;
      const logDir = ensureLogDirectory();

      expect(fs.existsSync(logDir)).toBe(true);
      expect(path.dirname(path.dirname(logDir))).toBe(path.join(tempDir, 'logs'));

      cwdSpy.mockRestore();
    });
  });

  describe('generateWorkerId', () => {
    it('produces unique identifiers with expected prefix', () => {
      const { generateWorkerId } = __testHelpers;
      const idA = generateWorkerId();
      const idB = generateWorkerId();

      expect(idA).toMatch(/^claude-worker-/);
      expect(idB).toMatch(/^claude-worker-/);
      expect(idA).not.toBe(idB);
    });
  });

  describe('getMaxValidationAttempts', () => {
    it('reads validation settings when present', async () => {
      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
      const settingsPath = path.join(tempDir, 'settings.json');
      await fs.promises.writeFile(
        settingsPath,
        JSON.stringify({ validation: { maxAttempts: 5 } }),
        'utf-8'
      );

      const attempts = await __testHelpers.getMaxValidationAttempts();

      expect(attempts).toBe(5);
      cwdSpy.mockRestore();
    });

    it('falls back to default when settings file is missing or invalid', async () => {
      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempDir);

      const attempts = await __testHelpers.getMaxValidationAttempts();

      expect(attempts).toBe(3);
      cwdSpy.mockRestore();
    });
  });

  describe('updateTaskStatus', () => {
    it('updates existing task with executor details when moving to in_progress', async () => {
      const dbMock = jest.requireMock('../../services/database') as {
        __taskStore: Record<string, any>;
      };
      dbMock.__taskStore['task-1'] = { id: 'task-1', status: 'pending' };

      await __testHelpers.updateTaskStatus('task-1', 'in_progress', 'worker-xyz');

      const updated = dbMock.__taskStore['task-1'];
      expect(updated.status).toBe('in_progress');
      expect(updated.executorId).toBe('worker-xyz');
      expect(updated.startTime).toBeInstanceOf(Date);
    });

    it('sets end time when task completes', async () => {
      const dbMock = jest.requireMock('../../services/database') as {
        __taskStore: Record<string, any>;
      };
      dbMock.__taskStore['task-2'] = { id: 'task-2', status: 'in_progress' };

      await __testHelpers.updateTaskStatus('task-2', 'completed');

      const updated = dbMock.__taskStore['task-2'];
      expect(updated.status).toBe('completed');
      expect(updated.endTime).toBeInstanceOf(Date);
    });

    it('gracefully returns when task is missing', async () => {
      await expect(
        __testHelpers.updateTaskStatus('missing-task', 'completed')
      ).resolves.toBeUndefined();
    });
  });

  describe('stop worker route', () => {
    it('stops a running worker and optionally cleans up worktree', async () => {
      const app = buildApp();
      const logDir = await fs.promises.mkdtemp(path.join(tempDir, 'logs-'));
      const logFile = path.join(logDir, 'worker.log');
      await fs.promises.writeFile(logFile, 'initial log');

      const worktreePath = path.join(logDir, 'worktree');
      await fs.promises.mkdir(worktreePath, { recursive: true });

      const worktreeManager = {
        removeWorktree: jest.fn().mockResolvedValue(undefined),
      };

      const worker = buildWorker({
        process: { kill: jest.fn() } as any,
        logFile,
        worktreeManager: worktreeManager as any,
        worktreePath,
      });

      worker.maxValidationAttempts = 1;

      __testHelpers.setWorker(worker);

      runValidationMock.mockResolvedValue(true);
      cleanupMock.mockResolvedValue(undefined);

      const response = await request(app)
        .post('/claude-workers/worker-1/stop?cleanupWorktree=true')
        .send();

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(worker.process?.kill).toHaveBeenCalledWith('SIGTERM');

      await new Promise(resolve => setImmediate(resolve));

      expect(worktreeManager.removeWorktree).toHaveBeenCalledWith(worktreePath);
      expect(['completed', 'stopped']).toContain(worker.status);
    });

    it('returns 404 when worker is missing', async () => {
      const app = buildApp();

      const response = await request(app).post('/claude-workers/unknown/stop').send();

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('worker log and messaging routes', () => {
    it('returns logs for an existing worker', async () => {
      const app = buildApp();
      const worker = buildWorker();
      await fs.promises.writeFile(worker.logFile, 'log content');
      __testHelpers.setWorker(worker);

      const response = await request(app).get(`/claude-workers/${worker.id}/logs`);

      expect(response.status).toBe(200);
      expect(response.body.data.logs).toContain('log content');
    });

    it('handles log read failures', async () => {
      const app = buildApp();
      const worker = buildWorker({ id: 'worker-read-failure', logFile: path.join(tempDir, 'fail.log') });
      __testHelpers.setWorker(worker);

      const readSpy = jest.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('read failure');
      });

      const response = await request(app).get(`/claude-workers/${worker.id}/logs`);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);

      readSpy.mockRestore();
    });

    it('returns 404 for unknown worker detail', async () => {
      const app = buildApp();

      const response = await request(app).get('/claude-workers/missing-worker');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('sends message to running worker and records entry', async () => {
      const app = buildApp();
      const logFile = path.join(tempDir, 'messaging.log');
      await fs.promises.writeFile(logFile, 'before');

      const stdin = { write: jest.fn() };
      const worker = buildWorker({ logFile, process: { stdin } as any, structuredEntries: [] });
      __testHelpers.setWorker(worker);

      const response = await request(app)
        .post(`/claude-workers/${worker.id}/message`)
        .send({ message: 'Hello agent' });

      expect(response.status).toBe(200);
      expect(stdin.write).toHaveBeenCalledWith('Hello agent\n');
      expect(worker.structuredEntries).toHaveLength(1);
      const updatedLog = await fs.promises.readFile(logFile, 'utf-8');
      expect(updatedLog).toContain('Hello agent');
    });

    it('rejects message when worker is not running', async () => {
      const app = buildApp();
      const worker = buildWorker({ status: 'stopped' });
      __testHelpers.setWorker(worker);

      const response = await request(app)
        .post(`/claude-workers/${worker.id}/message`)
        .send({ message: 'Should fail' });

      expect(response.status).toBe(400);
    });

    it('returns structured entries data', async () => {
      const app = buildApp();
      const worker = buildWorker({
        structuredEntries: [
          { type: 'log', content: 'Entry 1', timestamp: '2024-01-01T00:00:00.000Z' },
          { type: 'log', content: 'Entry 2', timestamp: '2024-01-01T00:01:00.000Z' },
        ],
      });
      __testHelpers.setWorker(worker);

      const response = await request(app).get(`/claude-workers/${worker.id}/entries`);

      expect(response.status).toBe(200);
      expect(response.body.data.entries).toHaveLength(2);
      expect(response.body.data.lastUpdate).toBe('2024-01-01T00:01:00.000Z');
    });

    it('returns aggregate log statistics', async () => {
      const app = buildApp();
      const stats = {
        totalLogs: 5,
        totalSize: 1024,
        oldestLog: 'old.log',
        newestLog: 'new.log',
        logsByWorker: { 'worker-1': 3 },
      };
      const statsSpy = jest.spyOn(logManager, 'getLogStats').mockResolvedValue(stats as any);

      const response = await request(app).get('/claude-workers/logs/stats');

      expect(response.status).toBe(200);
      expect(response.body.data.totalLogs).toBe(5);
      expect(statsSpy).toHaveBeenCalled();

      statsSpy.mockRestore();
    });

    it('triggers log cleanup workflow', async () => {
      const app = buildApp();
      const organizeSpy = jest.spyOn(logManager, 'organizeLogs').mockResolvedValue();
      const cleanupSpy = jest.spyOn(logManager, 'cleanupLogs').mockResolvedValue({
        deletedFiles: 2,
        deletedSize: 2048,
        emptyFilesDeleted: 1,
      });

      const response = await request(app)
        .post('/claude-workers/logs/cleanup')
        .send({ olderThanDays: 7 });

      expect(response.status).toBe(200);
      expect(organizeSpy).toHaveBeenCalled();
      expect(cleanupSpy).toHaveBeenCalled();

      organizeSpy.mockRestore();
      cleanupSpy.mockRestore();
    });

    it('handles follow-up prompts for running worker', async () => {
      const app = buildApp();
      const logFile = path.join(tempDir, 'follow-up.log');
      await fs.promises.writeFile(logFile, 'initial');

      const stdin = { write: jest.fn() };
      const worker = buildWorker({ status: 'running', process: { stdin } as any, logFile });
      __testHelpers.setWorker(worker);

      const response = await request(app)
        .post(`/claude-workers/${worker.id}/follow-up`)
        .send({ prompt: 'Please continue.' });

      expect(response.status).toBe(200);
      expect(stdin.write).toHaveBeenCalledWith('Please continue.\n');
    });

    it('returns 404 for enhanced logs when worker missing', async () => {
      const app = buildApp();

      await request(app).get('/claude-workers/missing/enhanced-logs').expect(404);
    });
  });

  describe('worker status routes', () => {
    it('returns aggregate worker status information', async () => {
      const app = buildApp();
      const running = buildWorker({ id: 'worker-running', status: 'running', blockedCommands: 2 });
      const completed = buildWorker({ id: 'worker-complete', status: 'completed', blockedCommands: 0 });
      __testHelpers.setWorker(running);
      __testHelpers.setWorker(completed);

      const response = await request(app).get('/claude-workers/status').expect(200);

      expect(response.body.data.totalCount).toBe(2);
      expect(response.body.data.activeCount).toBe(1);
      expect(response.body.data.totalBlockedCommands).toBe(2);
    });

    it('returns detailed worker information', async () => {
      const app = buildApp();
      const worker = buildWorker({
        id: 'worker-details',
        status: 'completed',
        validationRuns: [
          {
            id: 'run-1',
            timestamp: new Date(),
            stages: [],
            overallStatus: 'passed',
            command: 'npm test',
            success: true,
            duration: 1200,
          },
        ],
        validationPassed: true,
        structuredEntries: [{ type: 'log', content: 'entry' }],
      } as any);

      __testHelpers.setWorker(worker);

      const response = await request(app).get(`/claude-workers/${worker.id}`).expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('worker-details');
      expect(response.body.data.validationHistory).toHaveLength(1);
    });
  });

  describe('enhanced logs streaming', () => {
    it('streams structured entries and completion events', async () => {
      jest.useFakeTimers();
      try {
        const worker = buildWorker({
          structuredEntries: [
            { type: 'SystemMessage', content: 'Initial entry', metadata: { source: 'test' } },
          ],
        });
        __testHelpers.setWorker(worker);

        const layer = (router as any).stack.find(
          (l: any) => l.route?.path === '/:workerId/enhanced-logs' && l.route?.methods?.get
        );
        expect(layer).toBeDefined();
        const handler = layer.route.stack[0].handle;

        const req = new EventEmitter() as unknown as express.Request;
        (req as any).params = { workerId: worker.id };

        const writes: string[] = [];
        const res = {
          writeHead: jest.fn(),
          write: jest.fn((chunk: string) => {
            writes.push(chunk);
          }),
          end: jest.fn(),
        } as unknown as import('http').ServerResponse;

        handler(req, res);

        expect(res.writeHead).toHaveBeenCalled();
        expect(writes.some(chunk => chunk.includes('json_patch'))).toBe(true);

        worker.status = 'completed';
        jest.advanceTimersByTime(1000);

        expect(writes.some(chunk => chunk.includes('finished'))).toBe(true);

        req.emit('close');
      } finally {
        jest.runOnlyPendingTimers();
        jest.clearAllTimers();
        jest.useRealTimers();
      }
    });
  });

  describe('cleanup worktrees route', () => {
    it('removes worktree directories for completed workers', async () => {
      const app = buildApp();
      const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(path.join(tempDir, 'repo'));
      await fs.promises.mkdir(path.join(tempDir, 'repo'), { recursive: true });

      const worker = buildWorker({
        id: 'claude-worker-abc123',
        status: 'completed',
        taskId: 'task-42',
      });
      __testHelpers.setWorker(worker);

      const suffix = worker.id.split('-').pop();
      const worktreeBase = path.join(path.dirname(process.cwd()), 'claude-worktrees');
      const targetDir = path.join(worktreeBase, `worktree-${worker.taskId}-${suffix}`);
      await fs.promises.mkdir(targetDir, { recursive: true });

      const response = await request(app).post('/claude-workers/cleanup-worktrees').send();

      expect(response.status).toBe(200);
      expect(fs.existsSync(targetDir)).toBe(false);

      cwdSpy.mockRestore();
    });
  });

  describe('delete worker route', () => {
    it('stops process, cleans worktree, and removes worker', async () => {
      const app = buildApp();
      const logFile = path.join(tempDir, 'delete.log');
      await fs.promises.writeFile(logFile, 'initial');

      const removeWorktree = jest.fn().mockResolvedValue(undefined);
      const killFn = jest.fn();
      const worker = buildWorker({
        id: 'worker-delete',
        process: { kill: killFn } as any,
        status: 'running',
        logFile,
        worktreeManager: { removeWorktree } as any,
        worktreePath: path.join(tempDir, 'worktree-delete'),
      });
      await fs.promises.mkdir(worker.worktreePath!, { recursive: true });
      __testHelpers.setWorker(worker);

      const response = await request(app).delete(`/claude-workers/${worker.id}`).send();

      expect(response.status).toBe(200);
      expect(killFn).toHaveBeenCalledWith('SIGTERM');
      expect(removeWorktree).toHaveBeenCalledWith(worker.worktreePath);
      expect(__testHelpers.getWorker(worker.id)).toBeUndefined();
    });
  });

  describe('maintenance routes', () => {
    it('stops all running workers', async () => {
      const app = buildApp();
      const running = buildWorker({
        id: 'worker-running',
        status: 'running',
        process: { kill: jest.fn() } as any,
      });
      const completed = buildWorker({ id: 'worker-completed', status: 'completed', process: null });
      __testHelpers.setWorker(running);
      __testHelpers.setWorker(completed);

      const response = await request(app).post('/claude-workers/stop-all').send();

      expect(response.status).toBe(200);
      expect(response.body.data.stoppedCount).toBe(1);
      expect((running.process as any).kill).toHaveBeenCalledWith('SIGTERM');
      expect(running.status).toBe('stopped');
      expect(completed.status).toBe('completed');
    });

    it('clears completed workers from memory', async () => {
      const app = buildApp();
      const running = buildWorker({ id: 'worker-running', status: 'running' });
      const completed = buildWorker({ id: 'worker-completed', status: 'completed' });
      __testHelpers.setWorker(running);
      __testHelpers.setWorker(completed);

      const response = await request(app).post('/claude-workers/clear').send();

      expect(response.status).toBe(200);
      expect(response.body.data.clearedCount).toBe(1);
      expect(__testHelpers.getWorker('worker-completed')).toBeUndefined();
      expect(__testHelpers.getWorker('worker-running')).toBeDefined();
    });
  });

  describe('log maintenance routes', () => {
    it('handles cleanup errors gracefully', async () => {
      const app = buildApp();
      const organizeSpy = jest.spyOn(logManager, 'organizeLogs').mockResolvedValue();
      const cleanupSpy = jest
        .spyOn(logManager, 'cleanupLogs')
        .mockRejectedValue(new Error('cleanup fail'));

      const response = await request(app).post('/claude-workers/logs/cleanup').send({});

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);

      organizeSpy.mockRestore();
      cleanupSpy.mockRestore();
    });

    it('handles log stats errors gracefully', async () => {
      const app = buildApp();
      const statsSpy = jest.spyOn(logManager, 'getLogStats').mockRejectedValue(new Error('stats fail'));

      const response = await request(app).get('/claude-workers/logs/stats');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);

      statsSpy.mockRestore();
    });
  });

  describe('runValidationChecks', () => {
    function createWorker(overrides: Partial<ClaudeWorker> = {}): ClaudeWorker {
      const logFile = path.join(tempDir, 'worker.log');
      fs.writeFileSync(logFile, 'initial log');
      return {
        id: 'worker-validation',
        taskId: 'task-123',
        taskContent: 'demo task',
        process: null,
        status: 'running',
        startTime: new Date(),
        logFile,
        blockedCommands: 0,
        blockedCommandsList: [],
        structuredEntries: [],
        validationRuns: [],
        validationAttempts: 0,
        maxValidationAttempts: 3,
        validationPassed: undefined,
        worktreePath: tempDir,
        ...overrides,
      } as ClaudeWorker;
    }

    it('marks validation success and writes to log', async () => {
      runValidationMock.mockResolvedValueOnce(true);
      cleanupMock.mockResolvedValueOnce(undefined);

      const worker = createWorker();
      const result = await __testHelpers.runValidationChecks(worker);

      expect(result.success).toBe(true);
      expect(worker.validationRuns).toHaveLength(1);
      expect(worker.validationPassed).toBe(true);
      const logContents = await fs.promises.readFile(worker.logFile, 'utf-8');
      expect(logContents).toContain('✅ Validation passed');
    });

    it('returns detailed failure information when validations fail', async () => {
      runValidationMock.mockResolvedValueOnce(false);
      cleanupMock.mockResolvedValueOnce(undefined);

      const worker = createWorker();
      const result = await __testHelpers.runValidationChecks(worker);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Validation failed on');
      expect(worker.validationPassed).toBe(false);
      const logContents = await fs.promises.readFile(worker.logFile, 'utf-8');
      expect(logContents).toContain('❌ Validation failed');
    });

    it('handles validation errors gracefully', async () => {
      runValidationMock.mockRejectedValueOnce(new Error('runner explode'));
      cleanupMock.mockResolvedValueOnce(undefined);

      const worker = createWorker();
      const result = await __testHelpers.runValidationChecks(worker);

      expect(result.success).toBe(false);
      expect(result.message).toContain('runner explode');
      expect(worker.validationPassed).toBe(false);
      const logContents = await fs.promises.readFile(worker.logFile, 'utf-8');
      expect(logContents).toContain('❌ Validation error');
    });
  });

  describe('mapValidationRunToResponse', () => {
    it('maps validation run into API-friendly structure', () => {
      const run = {
        id: 'validation-1',
        timestamp: new Date('2024-01-01T00:00:00.000Z'),
        stages: [
          {
            name: 'lint',
            command: 'npm run lint',
            status: 'passed' as const,
            duration: 250,
            output: 'ok',
            error: undefined,
          },
          {
            name: 'test',
            command: 'npm test',
            status: 'failed' as const,
            duration: 400,
            output: 'fail',
            error: 'tests failed',
          },
        ],
        overallStatus: 'failed' as const,
        metricsFile: 'metrics.json',
      };

      const mapped = (__testHelpers as any).mapValidationRunToResponse(run);

      expect(mapped.id).toBe('validation-1');
      expect(mapped.duration).toBe(650);
      expect(mapped.stages[0].success).toBe(true);
      expect(mapped.stages[1].success).toBe(false);
      expect(mapped.metricsFile).toBe('metrics.json');
      expect(mapped.overallStatus).toBe('failed');
    });
  });

  describe('restartWorkerWithFeedback', () => {
    it('terminates existing process and spawns new one with feedback prompt', async () => {
      const logFile = path.join(tempDir, 'restart.log');
      await fs.promises.writeFile(logFile, 'initial');

      const killFn = jest.fn();
      const worker = buildWorker({
        process: { kill: killFn, killed: false } as any,
        logFile,
        validationAttempts: 0,
        maxValidationAttempts: 3,
        worktreePath: tempDir,
      });

      const mockSpawned = new EventEmitter() as unknown as childProcess.ChildProcess;
      (mockSpawned as any).pid = 12345;
      (childProcess.spawn as jest.Mock).mockReturnValue(mockSpawned);

      (__testHelpers as any).restartWorkerWithFeedback(worker, 'Fix failing tests');
      mockSpawned.emit('close', 0);

      expect(killFn).toHaveBeenCalledWith('SIGTERM');
      expect(childProcess.spawn).toHaveBeenCalled();
      expect(worker.status).toBe('running');
      expect(worker.validationAttempts).toBe(1);
      const logOutput = await fs.promises.readFile(logFile, 'utf-8');
      expect(logOutput).toContain('VALIDATION FEEDBACK');

      (childProcess.spawn as jest.Mock).mockReset();
    });
  });
});
