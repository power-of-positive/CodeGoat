import type { RequestHandler } from 'express';

describe('server bootstrap', () => {
  const originalEnv = { ...process.env };

  const noopMiddleware = () => ((req, _res, next) => next()) as RequestHandler;

  const registerCommonMocks = (options?: {
    listenMock?: jest.Mock;
    cleanLogsMock?: jest.Mock;
    scheduleCleanupMock?: jest.Mock;
    getDatabaseServiceMock?: jest.Mock;
  }) => {
    const listenMock =
      options?.listenMock ||
      jest.fn((_port: number, _host: string, callback: () => void) => {
        callback();
        return serverMock;
      });
    const serverMock = { timeout: 0, close: jest.fn() } as any;

    jest.doMock('http', () => ({
      createServer: jest.fn(() => ({ listen: listenMock })),
    }));

    const cleanLogsMock = options?.cleanLogsMock || jest.fn().mockResolvedValue(undefined);
    jest.doMock('../utils/log-cleaner', () => ({
      LogCleaner: jest.fn(() => ({ cleanLogs: cleanLogsMock })),
    }));

    const scheduleCleanupMock = options?.scheduleCleanupMock || jest.fn().mockReturnValue('cleanup-handle');
    jest.doMock('../utils/log-manager', () => ({
      logManager: { scheduleCleanup: scheduleCleanupMock },
    }));

    const orchestratorCleanupMock = jest.fn();
    jest.doMock('../utils/orchestrator-stream', () => ({
      orchestratorStreamManager: { cleanup: orchestratorCleanupMock },
    }));

    jest.doMock('../logger-singleton', () => ({
      getLogger: jest.fn(() => ({
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        middleware: jest.fn(() => (req: any, _res: any, next: any) => next()),
      })),
    }));

    const getDatabaseServiceMock =
      options?.getDatabaseServiceMock || jest.fn(() => ({ $disconnect: jest.fn() }));
    jest.doMock('../services/database', () => ({
      createDatabaseService: jest.fn(),
      getDatabaseService: getDatabaseServiceMock,
    }));

    jest.doMock('../middleware/error-handler', () => ({
      createErrorHandler: jest.fn(() => (_req: any, _res: any, next: any) => next()),
    }));

    const routeMocks = {
      '../routes/settings': 'createSettingsRoutes',
      '../routes/analytics': 'createAnalyticsRoutes',
      '../routes/tasks': 'createTasksRoutes',
      '../routes/permissions': 'createPermissionRoutes',
      '../routes/e2e': 'createE2ERoutes',
      '../routes/validation-runs': 'createValidationRunRoutes',
      '../routes/orchestrator': 'createOrchestratorRoutes',
      '../routes/backup': 'createBackupRoutes',
    } as const;

    for (const [modulePath, exportName] of Object.entries(routeMocks)) {
      jest.doMock(modulePath, () => ({ [exportName]: jest.fn(() => noopMiddleware()) }));
    }

    jest.doMock('../routes/bdd-scenarios', () => ({ __esModule: true, default: noopMiddleware() }));
    jest.doMock('../routes/claude-workers', () => ({ __esModule: true, default: noopMiddleware() }));
    jest.doMock('../routes/validation-stage-configs', () => ({ __esModule: true, default: noopMiddleware() }));

    return { listenMock, serverMock, cleanLogsMock, scheduleCleanupMock, orchestratorCleanupMock, getDatabaseServiceMock };
  };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
    jest.useRealTimers();
  });

  it('starts server and schedules maintenance outside test environment', async () => {
    jest.useFakeTimers({ doNotFake: ['nextTick'] });

    const clearIntervalSpy = jest.spyOn(global, 'clearInterval').mockImplementation(() => undefined as any);
    const setIntervalSpy = jest
      .spyOn(global, 'setInterval')
      .mockImplementation((fn: (...args: any[]) => void) => 'interval' as unknown as NodeJS.Timeout);

    const mocks = registerCommonMocks();

    process.env.NODE_ENV = 'development';
    process.env.PORT = '4100';
    process.env.HOST = '127.0.0.1';

    const { cleanupIntervals } = await import('../index');

    expect(mocks.listenMock).toHaveBeenCalledWith(4100, '127.0.0.1', expect.any(Function));
    expect(mocks.cleanLogsMock).toHaveBeenCalled();
    expect(mocks.scheduleCleanupMock).toHaveBeenCalledWith(24);
    expect(setIntervalSpy).toHaveBeenCalled();

    await cleanupIntervals();

    expect(clearIntervalSpy).toHaveBeenCalledWith('cleanup-handle');
    expect(mocks.orchestratorCleanupMock).toHaveBeenCalled();
  });

  it('disconnects database when cleaning up in test environment', async () => {
    const disconnectMock = jest.fn();
    registerCommonMocks({ getDatabaseServiceMock: jest.fn(() => ({ $disconnect: disconnectMock })) });

    process.env.NODE_ENV = 'test';
    const { cleanupIntervals } = await import('../index');

    await cleanupIntervals();

    expect(disconnectMock).toHaveBeenCalled();
  });
});
