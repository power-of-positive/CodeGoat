import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { EventEmitter } from 'events';
import * as childProcess from 'child_process';
import router, { __testHelpers, ClaudeWorker } from '../../routes/claude-workers';
import { CommandInterceptor } from '../../utils/command-interceptor';
import { WorktreeManager } from '../../utils/worktree-manager';
import { ClaudeLogProcessor } from '../../utils/claude-log-processor';

jest.mock('child_process', () => {
  const actual = jest.requireActual('child_process');
  return {
    ...actual,
    spawn: jest.fn((...args: Parameters<typeof actual.spawn>) =>
      (actual.spawn as typeof actual.spawn)(...args)
    ),
    exec: jest.fn((...args: Parameters<typeof actual.exec>) =>
      (actual.exec as typeof actual.exec)(...args)
    ),
    execSync: jest.fn((...args: Parameters<typeof actual.execSync>) =>
      (actual.execSync as typeof actual.execSync)(...args)
    ),
  };
});

const actualChildProcess = jest.requireActual<typeof import('child_process')>('child_process');
const defaultSpawnImpl = (
  ...args: Parameters<typeof actualChildProcess.spawn>
): ReturnType<typeof actualChildProcess.spawn> =>
  (actualChildProcess.spawn as typeof actualChildProcess.spawn)(...args);
const defaultExecImpl = (
  ...args: Parameters<typeof actualChildProcess.exec>
): ReturnType<typeof actualChildProcess.exec> =>
  (actualChildProcess.exec as typeof actualChildProcess.exec)(...args);
const defaultExecSyncImpl = (
  ...args: Parameters<typeof actualChildProcess.execSync>
): ReturnType<typeof actualChildProcess.execSync> =>
  (actualChildProcess.execSync as typeof actualChildProcess.execSync)(...args);

const spawnMockGlobal = childProcess.spawn as jest.MockedFunction<typeof childProcess.spawn>;
const execMockGlobal = childProcess.exec as jest.MockedFunction<typeof childProcess.exec>;
const execSyncMockGlobal =
  childProcess.execSync as jest.MockedFunction<typeof childProcess.execSync>;

const runValidationMock = jest.fn();
const cleanupMock = jest.fn();

jest.mock('../../../scripts/validate-task', () => ({
  ValidationRunner: jest.fn(() => ({
    runValidation: runValidationMock,
    cleanup: cleanupMock,
  })),
}));

jest.mock('../../services/database', () => {
  const taskStore: Record<string, any> = {};
  const findUniqueMock = jest.fn(({ where }: { where: { id: string } }) => taskStore[where.id] ?? null);
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

class MockSpawnProcess extends EventEmitter {
  public stdout = new EventEmitter();
  public stderr = new EventEmitter();
  public stdin = {
    write: jest.fn(),
    end: jest.fn(),
  };
  public killed = false;

  constructor(public pid: number) {
    super();
  }

  kill = jest.fn((signal?: NodeJS.Signals) => {
    this.killed = true;
    return true;
  });
}

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/claude-workers', router);
  return app;
};

const flushAsync = async () => {
  await Promise.resolve();
  await new Promise(resolve => setImmediate(resolve));
};

let tempDirs: string[] = [];

const createTempDir = async (prefix = 'claude-advanced-') => {
  const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
};

const createWorker = async (
  options: {
    id?: string;
    status?: ClaudeWorker['status'];
    worktreePath?: string;
    overrides?: Partial<ClaudeWorker>;
  } = {}
): Promise<ClaudeWorker> => {
  const id = options.id ?? `worker-${Date.now()}`;
  const logDir = await createTempDir(`logs-${id}-`);
  const logFile = path.join(logDir, `${id}.log`);
  await fs.promises.writeFile(logFile, '', { encoding: 'utf-8' });

  const worker: ClaudeWorker = {
    id,
    taskId: options.overrides?.taskId ?? `task-${id}`,
    taskContent:
      options.overrides?.taskContent ?? 'Implement feature end-to-end with comprehensive coverage',
    process: null,
    status: options.status ?? 'running',
    startTime: new Date(),
    logFile,
    blockedCommands: 0,
    blockedCommandsList: [],
    structuredEntries: [],
    validationRuns: [],
    validationAttempts: 0,
    maxValidationAttempts: 3,
    worktreeManager: options.overrides?.worktreeManager,
    worktreePath: options.worktreePath,
    validationPassed: options.overrides?.validationPassed,
    devServerBackend: options.overrides?.devServerBackend,
    devServerFrontend: options.overrides?.devServerFrontend,
    devServerBackendPort: options.overrides?.devServerBackendPort,
    devServerFrontendPort: options.overrides?.devServerFrontendPort,
    interceptor: options.overrides?.interceptor,
    claudeLogProcessor: options.overrides?.claudeLogProcessor,
    pid: options.overrides?.pid,
  };

  return { ...worker, ...options.overrides };
};

let commandInterceptorSpy: jest.SpyInstance;
let logProcessorSpy: jest.SpyInstance;
let createWorktreeSpy: jest.SpyInstance;
let removeWorktreeSpy: jest.SpyInstance;
let commandInterceptorMock: { analyzeCommand: jest.Mock };

beforeEach(async () => {
  tempDirs = [];
  __testHelpers.clearWorkers();
  runValidationMock.mockReset();
  cleanupMock.mockReset();
  spawnMockGlobal.mockReset();
  execMockGlobal.mockReset();
  execSyncMockGlobal.mockReset();
  spawnMockGlobal.mockImplementation(defaultSpawnImpl);
  execMockGlobal.mockImplementation(defaultExecImpl);
  execSyncMockGlobal.mockImplementation(defaultExecSyncImpl);

  commandInterceptorMock = {
    analyzeCommand: jest.fn(() => ({
      allowed: true,
      reason: 'Command permitted',
      severity: 'info',
    })),
  };

  commandInterceptorSpy = jest
    .spyOn(CommandInterceptor, 'createDefault')
    .mockResolvedValue(commandInterceptorMock as never);

  logProcessorSpy = jest
    .spyOn(ClaudeLogProcessor.prototype, 'toNormalizedEntries')
    .mockReturnValue([
      {
        entry_type: { type: 'assistant_message' },
        content: 'Normalized output entry',
        metadata: { origin: 'test' },
      },
    ]);

  const defaultWorktreeBase = await createTempDir('default-worktree-');
  const defaultWorktreePath = path.join(defaultWorktreeBase, 'worktree-default');
  await fs.promises.mkdir(defaultWorktreePath, { recursive: true });

  createWorktreeSpy = jest
    .spyOn(WorktreeManager.prototype, 'createWorktree')
    .mockResolvedValue(defaultWorktreePath);

  removeWorktreeSpy = jest.spyOn(WorktreeManager.prototype, 'removeWorktree').mockResolvedValue();
});

afterEach(async () => {
  jest.useRealTimers();
  for (const dir of tempDirs) {
    await fs.promises.rm(dir, { recursive: true, force: true });
  }
  tempDirs = [];
  __testHelpers.clearWorkers();
  spawnMockGlobal.mockReset();
  execMockGlobal.mockReset();
  execSyncMockGlobal.mockReset();
  spawnMockGlobal.mockImplementation(defaultSpawnImpl);
  execMockGlobal.mockImplementation(defaultExecImpl);
  execSyncMockGlobal.mockImplementation(defaultExecSyncImpl);
  commandInterceptorSpy?.mockRestore();
  logProcessorSpy?.mockRestore();
  createWorktreeSpy?.mockRestore();
  removeWorktreeSpy?.mockRestore();
  jest.restoreAllMocks();
});

describe('Claude workers advanced routes', () => {
  it('starts worker, streams output, and handles completion with validation', async () => {
    const app = buildApp();
    const worktreeRoot = await createTempDir('worktree-start-');
    const worktreePath = path.join(worktreeRoot, 'worktree-run');
    await fs.promises.mkdir(worktreePath, { recursive: true });

    createWorktreeSpy.mockResolvedValueOnce(worktreePath);
    removeWorktreeSpy.mockRejectedValueOnce(new Error('cleanup fail'));
    const originalSetTimeout = global.setTimeout;
    let validationResolve: () => void;
    const validationCompleted = new Promise<void>(resolve => {
      validationResolve = resolve;
    });
    runValidationMock.mockImplementationOnce(async () => {
      validationResolve();
      return true;
    });
    cleanupMock.mockResolvedValueOnce(undefined);

    const mockProcess = new MockSpawnProcess(4321);
    const spawnMock = childProcess.spawn as jest.MockedFunction<typeof childProcess.spawn>;
    spawnMock.mockImplementation(
      (command: string, args: ReadonlyArray<string>, options?: childProcess.SpawnOptions) =>
        mockProcess as unknown as childProcess.ChildProcess
    );

    try {
      const response = await request(app)
        .post('/claude-workers/start')
        .send({ taskId: 'task-start', taskContent: 'Implement start flow with validation' })
        .expect(200);

      const workerId: string = response.body.data.id;
      const worker = __testHelpers.getWorker(workerId);
      expect(worker).toBeDefined();
      expect(commandInterceptorSpy).toHaveBeenCalledWith(expect.any(Object), worktreePath);
      expect(spawnMock).toHaveBeenCalledWith(
        'npx',
        expect.any(Array),
        expect.objectContaining({ cwd: worktreePath })
      );

      const originalSetTimeout = global.setTimeout;
      const scheduled: Array<() => void> = [];
      (global as typeof globalThis).setTimeout = ((fn: (...args: unknown[]) => unknown) => {
        scheduled.push(() => {
          try {
            fn();
          } catch (error) {
            // Surface unexpected errors during timer execution
            throw error;
          }
        });
        return 0 as unknown as NodeJS.Timeout;
      }) as unknown as typeof setTimeout;

      mockProcess.stdout.emit(
        'data',
        Buffer.from('{"type":"result","subtype":"success"}\nplain output line')
      );

      // Execute any scheduled timers (e.g., auto-stop handler)
      for (const runTimer of scheduled.splice(0)) {
        runTimer();
      }

      mockProcess.stderr.emit('data', Buffer.from('stderr output'));
      mockProcess.stdout.emit('end');
      mockProcess.stderr.emit('end');

      await flushAsync();

      mockProcess.emit('close', 0);
      await validationCompleted;
      await flushAsync();
      await flushAsync();

      expect(runValidationMock).toHaveBeenCalledTimes(1);
      const updatedWorker = __testHelpers.getWorker(workerId);
      expect(updatedWorker?.status).toBe('completed');
      expect(updatedWorker?.validationPassed).toBe(true);
      expect(
        updatedWorker?.structuredEntries.some(entry => entry.type === 'assistant_message')
      ).toBe(true);
      expect(removeWorktreeSpy).toHaveBeenCalledWith(worktreePath);
    } finally {
      (global as typeof globalThis).setTimeout = originalSetTimeout;
      spawnMock.mockReset();
      spawnMock.mockImplementation(defaultSpawnImpl);
    }
  });

  it('cleans up worktree after worker completion success path', async () => {
    const app = buildApp();
    const worktreeRoot = await createTempDir('worktree-cleanup-');
    const worktreePath = path.join(worktreeRoot, 'worktree');
    await fs.promises.mkdir(worktreePath, { recursive: true });

    createWorktreeSpy.mockResolvedValueOnce(worktreePath);
    removeWorktreeSpy.mockResolvedValueOnce(undefined);
    runValidationMock.mockResolvedValueOnce(true);
    cleanupMock.mockResolvedValueOnce(undefined);

    const mockProcess = new MockSpawnProcess(2222);
    const spawnMock = childProcess.spawn as jest.MockedFunction<typeof childProcess.spawn>;
    spawnMock.mockImplementation(
      (command: string, args: ReadonlyArray<string>, options?: childProcess.SpawnOptions) =>
        mockProcess as unknown as childProcess.ChildProcess
    );

    const response = await request(app)
      .post('/claude-workers/start')
      .send({ taskId: 'task-cleanup', taskContent: 'Verify cleanup' })
      .expect(200);
    const workerId = response.body.data.id as string;

    mockProcess.emit('close', 0);
    await flushAsync();
    await flushAsync();

    expect(removeWorktreeSpy).toHaveBeenCalledWith(worktreePath);
    const worker = __testHelpers.getWorker(workerId);
    expect(worker?.status).toBe('completed');

    spawnMock.mockReset();
    spawnMock.mockImplementation(defaultSpawnImpl);
  });

  it('handles worktree cleanup failures after completion', async () => {
    const app = buildApp();
    const worktreeRoot = await createTempDir('worktree-cleanup-fail-');
    const worktreePath = path.join(worktreeRoot, 'worktree');
    await fs.promises.mkdir(worktreePath, { recursive: true });

    createWorktreeSpy.mockResolvedValueOnce(worktreePath);
    removeWorktreeSpy.mockRejectedValueOnce(new Error('cleanup error'));
    runValidationMock.mockResolvedValueOnce(true);
    cleanupMock.mockResolvedValueOnce(undefined);

    const mockProcess = new MockSpawnProcess(3333);
    const spawnMock = childProcess.spawn as jest.MockedFunction<typeof childProcess.spawn>;
    spawnMock.mockImplementation(
      (command: string, args: ReadonlyArray<string>, options?: childProcess.SpawnOptions) =>
        mockProcess as unknown as childProcess.ChildProcess
    );

    await request(app)
      .post('/claude-workers/start')
      .send({ taskId: 'task-cleanup-failure', taskContent: 'Verify cleanup failure' })
      .expect(200);

    mockProcess.emit('close', 0);
    await flushAsync();
    await flushAsync();

    expect(removeWorktreeSpy).toHaveBeenCalledWith(worktreePath);

    spawnMock.mockReset();
    spawnMock.mockImplementation(defaultSpawnImpl);
  });

  it('starts backend and frontend dev servers for a worker', async () => {
    const app = buildApp();
    const worktreeRoot = await createTempDir('worktree-dev-');
    const worktreePath = path.join(worktreeRoot, 'worktree-dev');
    const uiPath = path.join(worktreePath, 'ui');
    await fs.promises.mkdir(uiPath, { recursive: true });

    const worker = await createWorker({
      id: 'worker-dev',
      worktreePath,
      overrides: { status: 'running' },
    });
    __testHelpers.setWorker(worker);

    const backendProcess = new MockSpawnProcess(1111);
    const frontendProcess = new MockSpawnProcess(2222);

    const spawnMock = childProcess.spawn as jest.MockedFunction<typeof childProcess.spawn>;
    spawnMock.mockImplementation(
      (command: string, args: ReadonlyArray<string>, options?: childProcess.SpawnOptions) => {
        if (options?.cwd === worktreePath) {
          return backendProcess as unknown as childProcess.ChildProcess;
        }
        if (options?.cwd === uiPath) {
          return frontendProcess as unknown as childProcess.ChildProcess;
        }
        throw new Error(`Unexpected cwd ${options?.cwd}`);
      }
    );

    try {
      const response = await request(app)
        .post(`/claude-workers/${worker.id}/start-dev-server`)
        .send({ type: 'both' })
        .expect(200);

      expect(response.body.data.servers).toHaveLength(2);
      const serverTypes = response.body.data.servers.map((server: any) => server.type).sort();
      expect(serverTypes).toEqual(['backend', 'frontend']);

    const updatedWorker = __testHelpers.getWorker(worker.id);
    expect(updatedWorker?.devServerBackend).toBe(backendProcess);
    expect(updatedWorker?.devServerFrontend).toBe(frontendProcess);

    backendProcess.stdout.emit('data', Buffer.from('backend stdout'));
    backendProcess.stderr.emit('data', Buffer.from('backend stderr'));
    backendProcess.emit('exit', 0);
    frontendProcess.stdout.emit('data', Buffer.from('frontend stdout'));
    frontendProcess.stderr.emit('data', Buffer.from('frontend stderr'));
    frontendProcess.emit('exit', 0);
    } finally {
      spawnMock.mockReset();
      spawnMock.mockImplementation(defaultSpawnImpl);
    }
  });

  it('stops running dev servers and clears state', async () => {
    const app = buildApp();
    const worker = await createWorker({ id: 'worker-stop', overrides: { status: 'running' } });

    const backendProcess = new MockSpawnProcess(3333);
    const frontendProcess = new MockSpawnProcess(4444);

    backendProcess.kill.mockImplementation(() => {
      backendProcess.emit('exit', 0);
      return true;
    });
    frontendProcess.kill.mockImplementation(() => {
      frontendProcess.emit('exit', 0);
      return true;
    });

    worker.devServerBackend = backendProcess as never;
    worker.devServerFrontend = frontendProcess as never;
    worker.devServerBackendPort = 3007;
    worker.devServerFrontendPort = 5179;

    __testHelpers.setWorker(worker);

    const response = await request(app)
      .post(`/claude-workers/${worker.id}/stop-dev-server`)
      .send({ type: 'both' })
      .expect(200);

    expect(response.body.data.stopped.sort()).toEqual(['backend', 'frontend']);
    expect(backendProcess.kill).toHaveBeenCalledWith('SIGTERM');
    expect(frontendProcess.kill).toHaveBeenCalledWith('SIGTERM');

    const updatedWorker = __testHelpers.getWorker(worker.id);
    expect(updatedWorker?.devServerBackend).toBeUndefined();
    expect(updatedWorker?.devServerFrontend).toBeUndefined();
  });

  it('returns 400 when stopping dev servers if none are running', async () => {
    const app = buildApp();
    const worker = await createWorker({ id: 'worker-stop-missing' });
    worker.devServerBackend = undefined;
    worker.devServerFrontend = undefined;
    __testHelpers.setWorker(worker);

    await request(app)
      .post(`/claude-workers/${worker.id}/stop-dev-server`)
      .send({ type: 'backend' })
      .expect(400);
  });

  it('reports current dev server status for a worker', async () => {
    const app = buildApp();
    const worker = await createWorker({ id: 'worker-status' });
    const backendProcess = new MockSpawnProcess(5555);
    worker.devServerBackend = backendProcess as never;
    worker.devServerBackendPort = 3010;
    __testHelpers.setWorker(worker);

    const response = await request(app)
      .get(`/claude-workers/${worker.id}/dev-server-status`)
      .expect(200);

    expect(response.body.data.status.backend.running).toBe(true);
    expect(response.body.data.status.backend.port).toBe(3010);
    expect(response.body.data.status.frontend.running).toBe(false);
  });

  it('opens worktree in VSCode when command succeeds', async () => {
    const app = buildApp();
    const worktreeRoot = await createTempDir('vscode-open-');
    const worktreePath = path.join(worktreeRoot, 'worktree');
    await fs.promises.mkdir(worktreePath, { recursive: true });

    const worker = await createWorker({
      id: 'worker-vscode',
      worktreePath,
      overrides: { status: 'completed' },
    });
    __testHelpers.setWorker(worker);

    const execMock = childProcess.exec as jest.MockedFunction<typeof childProcess.exec>;
    execMock.mockImplementation(
      (
        command: string,
        options:
          | childProcess.ExecOptions
          | childProcess.ExecOptionsWithStringEncoding
          | childProcess.ExecOptionsWithBufferEncoding
          | null
          | undefined,
        callback?: (
          error: childProcess.ExecException | null,
          stdout: string | Buffer,
          stderr: string | Buffer
        ) => void
      ) => {
        callback?.(null, '', '');
        return {} as childProcess.ChildProcess;
      }
    );

    try {
      await request(app).post(`/claude-workers/${worker.id}/open-vscode`).expect(200);

      expect(execMock).toHaveBeenCalled();
      const [commandArg, optionsArg] = execMock.mock.calls[0];
      expect(commandArg).toContain('code');
      expect((optionsArg as childProcess.ExecOptions).timeout).toBeDefined();
    } finally {
      execMock.mockReset();
      execMock.mockImplementation(defaultExecImpl);
    }
  });

  it('returns detailed error when VSCode CLI is missing', async () => {
    const app = buildApp();
    const worktreeRoot = await createTempDir('vscode-missing-');
    const worktreePath = path.join(worktreeRoot, 'worktree');
    await fs.promises.mkdir(worktreePath, { recursive: true });

    const worker = await createWorker({
      id: 'worker-vscode-missing',
      worktreePath,
      overrides: { status: 'completed' },
    });
    __testHelpers.setWorker(worker);

    const execMock = childProcess.exec as jest.MockedFunction<typeof childProcess.exec>;
    execMock.mockImplementation(
      (
        command: string,
        options:
          | childProcess.ExecOptions
          | childProcess.ExecOptionsWithStringEncoding
          | childProcess.ExecOptionsWithBufferEncoding
          | null
          | undefined,
        callback?: (
          error: childProcess.ExecException | null,
          stdout: string | Buffer,
          stderr: string | Buffer
        ) => void
      ) => {
        const error = new Error('command not found: code') as childProcess.ExecException;
        callback?.(error, '', '');
        return {} as childProcess.ChildProcess;
      }
    );

    try {
      const response = await request(app)
        .post(`/claude-workers/${worker.id}/open-vscode`)
        .expect(500);

      expect(response.body.error).toContain('VSCode command line tools not installed');
    } finally {
      execMock.mockReset();
      execMock.mockImplementation(defaultExecImpl);
    }
  });

  it('merges worktree changes into main branch', async () => {
    const app = buildApp();
    const worktreeRoot = await createTempDir('merge-worktree-success-');
    const worktreePath = path.join(worktreeRoot, 'worktree');
    await fs.promises.mkdir(worktreePath, { recursive: true });

    const removeWorktree = jest.fn().mockResolvedValue(undefined);
    const worker = await createWorker({
      id: 'worker-merge-worktree',
      worktreePath,
      overrides: {
        worktreeManager: { removeWorktree } as unknown as WorktreeManager,
        validationPassed: true,
      },
    });
    __testHelpers.setWorker(worker);

    execMockGlobal.mockImplementation(
      (
        command: string,
        options:
          | childProcess.ExecOptions
          | childProcess.ExecOptionsWithStringEncoding
          | childProcess.ExecOptionsWithBufferEncoding
          | null
          | undefined,
        callback?: (
          error: childProcess.ExecException | null,
          stdout: string | Buffer,
          stderr: string | Buffer
        ) => void
      ) => {
        const cb = typeof options === 'function' ? options : callback;
        if (command === 'git status --porcelain') {
          cb?.(null, { stdout: 'M src/index.ts\n' } as unknown as string, '' as unknown as string);
        } else if (command === 'git branch --show-current') {
          cb?.(null, { stdout: 'feature/test-branch\n' } as unknown as string, '' as unknown as string);
        } else {
          cb?.(null, '' as unknown as string, '' as unknown as string);
        }
        return {} as childProcess.ChildProcess;
      }
    );

    const response = await request(app)
      .post(`/claude-workers/${worker.id}/merge-worktree`)
      .send({ commitMessage: 'Merge worktree changes' })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.hasChanges).toBe(true);
    expect(removeWorktree).toHaveBeenCalledWith(worktreePath);
  });

  it('handles worker process errors by cleaning up resources', async () => {
    const app = buildApp();
    const worktreeRoot = await createTempDir('worker-error-');
    const worktreePath = path.join(worktreeRoot, 'worktree');
    await fs.promises.mkdir(worktreePath, { recursive: true });

    createWorktreeSpy.mockResolvedValueOnce(worktreePath);
    removeWorktreeSpy.mockResolvedValueOnce(undefined);

    const mockProcess = new MockSpawnProcess(9999);
    const spawnMock = childProcess.spawn as jest.MockedFunction<typeof childProcess.spawn>;
    spawnMock.mockImplementation(
      (command: string, args: ReadonlyArray<string>, options?: childProcess.SpawnOptions) =>
        mockProcess as unknown as childProcess.ChildProcess
    );

    const startResponse = await request(app)
      .post('/claude-workers/start')
      .send({ taskId: 'task-error', taskContent: 'Trigger error' })
      .expect(200);
    const workerId = startResponse.body.data.id as string;

    mockProcess.emit('error', new Error('simulated failure'));
    await flushAsync();

    expect(removeWorktreeSpy).toHaveBeenCalled();
    const activeWorker = (__testHelpers as any).getWorker(workerId);
    expect(activeWorker?.status ?? 'failed').toBe('failed');

    spawnMock.mockReset();
    spawnMock.mockImplementation(defaultSpawnImpl);
  });

  it('reports cleanup failures during worker error handling', async () => {
    const app = buildApp();
    const worktreeRoot = await createTempDir('worker-error-failure-');
    const worktreePath = path.join(worktreeRoot, 'worktree');
    await fs.promises.mkdir(worktreePath, { recursive: true });

    createWorktreeSpy.mockResolvedValueOnce(worktreePath);
    removeWorktreeSpy.mockRejectedValueOnce(new Error('cleanup error'));
    runValidationMock.mockResolvedValueOnce(true);
    cleanupMock.mockResolvedValueOnce(undefined);

    const mockProcess = new MockSpawnProcess(3333);
    const spawnMock = childProcess.spawn as jest.MockedFunction<typeof childProcess.spawn>;
    spawnMock.mockImplementation(
      (command: string, args: ReadonlyArray<string>, options?: childProcess.SpawnOptions) =>
        mockProcess as unknown as childProcess.ChildProcess
    );

    await request(app)
      .post('/claude-workers/start')
      .send({ taskId: 'task-error-cleanup', taskContent: 'Trigger cleanup failure' })
      .expect(200);

    mockProcess.emit('error', new Error('simulated failure'));
    await flushAsync();

    expect(removeWorktreeSpy).toHaveBeenCalled();

    spawnMock.mockReset();
    spawnMock.mockImplementation(defaultSpawnImpl);
  });

  it('streams enhanced logs including raw log fallback', async () => {
    const worker = await createWorker({
      id: 'worker-enhanced',
      overrides: {
        structuredEntries: [],
      },
    });

    const logFile = worker.logFile;
    await fs.promises.writeFile(logFile, 'STDOUT: Hello\nSTDERR: Oops\n', 'utf-8');
    __testHelpers.setWorker(worker);

    const layer = (router as any).stack.find((l: any) => l.route?.path === '/:workerId/enhanced-logs');
    expect(layer).toBeDefined();
    const handler = layer.route.stack[0].handle as (req: any, res: any) => void;

    const req = new EventEmitter() as unknown as express.Request;
    (req as any).params = { workerId: worker.id };

    const written: string[] = [];
    const res = {
      writeHead: jest.fn(),
      write: jest.fn((chunk: string) => {
        written.push(chunk);
      }),
      end: jest.fn(),
    } as unknown as express.Response;

    const intervals: Array<() => void> = [];
    const originalSetInterval = global.setInterval;
    const originalClearInterval = global.clearInterval;
    (global as typeof globalThis).setInterval = ((fn: () => void) => {
      intervals.push(fn);
      return intervals.length as unknown as NodeJS.Timer;
    }) as unknown as typeof setInterval;
    const cleared: Array<number> = [];
    (global as typeof globalThis).clearInterval = ((id: NodeJS.Timer) => {
      cleared.push(Number(id));
    }) as unknown as typeof clearInterval;

    try {
      handler(req, res);
      intervals.forEach(fn => fn());

      expect(res.writeHead).toHaveBeenCalled();
      expect(written.some(chunk => chunk.includes('json_patch'))).toBe(true);

      worker.status = 'completed';
      intervals.forEach(fn => fn());
      expect(written.some(chunk => chunk.includes('event: finished'))).toBe(true);
      expect(res.end).toHaveBeenCalled();
    } finally {
      (global as typeof globalThis).setInterval = originalSetInterval;
      (global as typeof globalThis).clearInterval = originalClearInterval;
      req.emit('close');
    }
  });

  it('exposes validation run history and details', async () => {
    const app = buildApp();
    const metricsDir = await createTempDir('validation-runs-');
    const metricsFile = path.join(metricsDir, 'run.json');
    await fs.promises.writeFile(metricsFile, JSON.stringify({ coverage: 99 }), 'utf-8');

    const worker = await createWorker({
      id: 'worker-validation-history',
      overrides: {
        validationRuns: [
          {
            id: 'run-1',
            timestamp: new Date(),
            stages: [],
            overallStatus: 'passed',
            metricsFile,
          },
        ],
      } as Partial<ClaudeWorker>,
    });
    __testHelpers.setWorker(worker);

    const listResponse = await request(app)
      .get(`/claude-workers/${worker.id}/validation-runs`)
      .expect(200);
    expect(listResponse.body.data.totalRuns).toBe(1);

    const detailResponse = await request(app)
      .get(`/claude-workers/${worker.id}/validation-runs/run-1`)
      .expect(200);
    expect(detailResponse.body.data.metrics.coverage).toBe(99);

    await request(app)
      .get(`/claude-workers/${worker.id}/validation-runs/missing`)
      .expect(404);
  });

  it('merges worktree changes and records structured entry', async () => {
    const app = buildApp();
    const worktreeRoot = await createTempDir('merge-worktree-');
    const worktreePath = path.join(worktreeRoot, 'worktree');
    await fs.promises.mkdir(worktreePath, { recursive: true });

    const worker = await createWorker({
      id: 'worker-merge',
      worktreePath,
      overrides: {
        worktreeManager: new WorktreeManager(),
        structuredEntries: [],
        taskContent: 'Finish merge feature implementation',
      },
    });
    __testHelpers.setWorker(worker);

    const execSyncMock = childProcess.execSync as jest.MockedFunction<typeof childProcess.execSync>;
    execSyncMock.mockImplementation((command: string, options?: childProcess.ExecSyncOptions) => {
      if (command === 'git status --porcelain') {
        return 'M src/index.ts\n';
      }
      if (command === 'git rev-parse HEAD') {
        return 'abcdef1234567890\n';
      }
      if (command === 'git branch --show-current') {
        return 'feature/test-branch\n';
      }
      return '';
    });

    try {
      await request(app)
        .post(`/claude-workers/${worker.id}/merge`)
        .send({ commitMessage: 'Custom commit message' })
        .expect(200);

      expect(execSyncMock).toHaveBeenCalledWith('git add -A', { cwd: worktreePath });
      expect(worker.structuredEntries.some(entry => entry.type === 'merge')).toBe(true);
    } finally {
      execSyncMock.mockReset();
      execSyncMock.mockImplementation(defaultExecSyncImpl);
    }
  });

  it('returns 400 when merging with no pending changes', async () => {
    const app = buildApp();
    const worktreeRoot = await createTempDir('merge-nochanges-');
    const worktreePath = path.join(worktreeRoot, 'worktree');
    await fs.promises.mkdir(worktreePath, { recursive: true });

    const worker = await createWorker({
      id: 'worker-merge-empty',
      worktreePath,
      overrides: {
        worktreeManager: new WorktreeManager(),
      },
    });
    __testHelpers.setWorker(worker);

    const execSyncMock = childProcess.execSync as jest.MockedFunction<typeof childProcess.execSync>;
    execSyncMock.mockImplementation((command: string) => {
      if (command === 'git status --porcelain') {
        return '   ';
      }
      return '';
    });

    try {
      await request(app)
        .post(`/claude-workers/${worker.id}/merge`)
        .send({})
        .expect(400);
    } finally {
      execSyncMock.mockReset();
      execSyncMock.mockImplementation(defaultExecSyncImpl);
    }
  });

  it('generates commit message summary from worktree changes', async () => {
    const app = buildApp();
    const worktreeRoot = await createTempDir('commit-message-');
    const worktreePath = path.join(worktreeRoot, 'worktree');
    await fs.promises.mkdir(worktreePath, { recursive: true });

    const worker = await createWorker({
      id: 'worker-commit-message',
      worktreePath,
      overrides: {
        worktreeManager: new WorktreeManager(),
        taskContent: 'Implement analytics aggregation service',
      },
    });
    __testHelpers.setWorker(worker);

    const execSyncMock = childProcess.execSync as jest.MockedFunction<typeof childProcess.execSync>;
    execSyncMock.mockImplementation((command: string) => {
      if (command === 'git status --porcelain') {
        return 'M src/service.ts\nA ui/components/Chart.tsx\n';
      }
      if (command === 'git diff --stat') {
        return ' src/service.ts | 10 +++++-----\n ui/components/Chart.tsx | 42 ++++++++++++++++++++++++++++++++\n 2 files changed, 52 insertions(+), 10 deletions(-)\n';
      }
      if (command === 'git diff') {
        return 'diff --git a/src/service.ts b/src/service.ts\n';
      }
      return '';
    });

    try {
      const response = await request(app)
        .get(`/claude-workers/${worker.id}/generate-commit-message`)
        .expect(200);

      expect(response.body.data.commitMessage).toContain('Modified 2 files');
      expect(response.body.data.summary.filesChanged).toBe(2);
    } finally {
      execSyncMock.mockReset();
      execSyncMock.mockImplementation(defaultExecSyncImpl);
    }
  });

  it('returns git diff details for worker worktree', async () => {
    const app = buildApp();
    const worktreeRoot = await createTempDir('diff-route-');
    const worktreePath = path.join(worktreeRoot, 'worktree');
    await fs.promises.mkdir(worktreePath, { recursive: true });

    const worker = await createWorker({
      id: 'worker-diff',
      worktreePath,
      overrides: {
        worktreeManager: new WorktreeManager(),
      },
    });
    __testHelpers.setWorker(worker);

    const execSyncMock = childProcess.execSync as jest.MockedFunction<typeof childProcess.execSync>;
    execSyncMock.mockImplementation((command: string) => {
      if (command === 'git diff HEAD') {
        return 'diff content';
      }
      if (command === 'git diff --stat HEAD') {
        return 'stat content';
      }
      if (command === 'git diff --name-status HEAD') {
        return 'M\tsrc/example.ts\n';
      }
      return '';
    });

    try {
      const response = await request(app)
        .get(`/claude-workers/${worker.id}/diff`)
        .expect(200);

      expect(response.body.data.diff).toBe('diff content');
      expect(response.body.data.changedFiles[0].path).toBe('src/example.ts');
    } finally {
      execSyncMock.mockReset();
      execSyncMock.mockImplementation(defaultExecSyncImpl);
    }
  });

  it('returns validation run details including metrics', async () => {
    const app = buildApp();
    const metricsDir = await createTempDir('validation-metrics-');
    const metricsFile = path.join(metricsDir, 'metrics.json');
    await fs.promises.writeFile(metricsFile, JSON.stringify({ coverage: 98 }), 'utf-8');

    const worker = await createWorker({
      id: 'worker-validation-details',
      overrides: {
        validationRuns: [
          {
            id: 'run-1',
            timestamp: new Date(),
            stages: [],
            overallStatus: 'passed',
            metricsFile,
          },
        ],
      } as Partial<ClaudeWorker>,
    });
    __testHelpers.setWorker(worker);

    const response = await request(app)
      .get(`/claude-workers/${worker.id}/validation-runs/run-1`)
      .expect(200);

    expect(response.body.data.metrics.coverage).toBe(98);
  });

  it('exposes blocked command history for worker', async () => {
    const app = buildApp();
    const worker = await createWorker({
      id: 'worker-blocked',
      overrides: {
        blockedCommands: 2,
        blockedCommandsList: [
          { timestamp: new Date().toISOString(), command: 'rm -rf /', reason: 'denied' },
        ],
      } as Partial<ClaudeWorker>,
    });
    __testHelpers.setWorker(worker);

    const response = await request(app)
      .get(`/claude-workers/${worker.id}/blocked-commands`)
      .expect(200);

    expect(response.body.data.blockedCommands).toBe(2);
    expect(response.body.data.blockedCommandsList).toHaveLength(1);
  });

  it('cleans up worktrees for completed workers', async () => {
    const app = buildApp();
    const repoRoot = await createTempDir('repo-root-');
    const projectRoot = path.join(repoRoot, 'project');
    await fs.promises.mkdir(projectRoot, { recursive: true });

    const cleanupTarget = path.join(repoRoot, 'claude-worktrees');
    await fs.promises.mkdir(cleanupTarget, { recursive: true });

    const worker = await createWorker({
      id: 'worker-clean',
      overrides: { status: 'completed', taskId: 'task-clean' },
    });
    __testHelpers.setWorker(worker);

    const suffix = worker.id.split('-').pop();
    const worktreePath = path.join(cleanupTarget, `worktree-${worker.taskId}-${suffix}`);
    await fs.promises.mkdir(worktreePath, { recursive: true });

    const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(projectRoot);

    const response = await request(app).post('/claude-workers/cleanup-worktrees').expect(200);

    expect(response.body.data.cleanedCount).toBe(1);
    expect(fs.existsSync(worktreePath)).toBe(false);

    cwdSpy.mockRestore();
  });
});
