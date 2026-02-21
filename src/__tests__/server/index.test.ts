import path from 'path';
import express from 'express';
import request from 'supertest';

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  middleware: () => (_req: express.Request, _res: express.Response, next: express.NextFunction) =>
    next(),
};

const logCleanerMock = {
  cleanLogs: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../../logger-singleton', () => ({
  getLogger: jest.fn(() => mockLogger),
}));

jest.mock('../../utils/log-cleaner', () => ({
  LogCleaner: jest.fn(() => logCleanerMock),
}));

const logManagerMock = {
  scheduleCleanup: jest.fn(() => Symbol('interval')),
  cleanup: jest.fn(),
};

jest.mock('../../utils/log-manager', () => ({
  logManager: logManagerMock,
}));

const createStubRouter = (name: string) => {
  const router = express.Router();
  router.get(`/test-${name}`, (_req, res) => res.json({ route: name }));
  return router;
};

jest.mock('../../routes/settings', () => ({
  createSettingsRoutes: jest.fn(() => createStubRouter('settings')),
}));
jest.mock('../../routes/analytics', () => ({
  createAnalyticsRoutes: jest.fn(() => createStubRouter('analytics')),
}));
jest.mock('../../routes/tasks', () => ({
  createTasksRoutes: jest.fn(() => createStubRouter('tasks')),
}));
jest.mock('../../routes/permissions', () => ({
  createPermissionRoutes: jest.fn(() => createStubRouter('permissions')),
}));
jest.mock('../../routes/e2e', () => ({
  createE2ERoutes: jest.fn(() => createStubRouter('e2e')),
}));
jest.mock('../../routes/validation-runs', () => ({
  createValidationRunRoutes: jest.fn(() => createStubRouter('validation-runs')),
}));
jest.mock('../../routes/orchestrator', () => ({
  createOrchestratorRoutes: jest.fn(() => createStubRouter('orchestrator')),
}));
jest.mock('../../routes/backup', () => ({
  createBackupRoutes: jest.fn(() => createStubRouter('backup')),
}));

jest.mock('../../routes/bdd-scenarios', () => createStubRouter('bdd'));
jest.mock('../../routes/claude-workers', () => createStubRouter('workers'));
jest.mock('../../routes/validation-stage-configs', () => createStubRouter('validation-stage-configs'));

const prismaMock = { $disconnect: jest.fn() };
jest.mock('../../services/database', () => ({
  createDatabaseService: jest.fn(() => prismaMock),
  getDatabaseService: jest.fn(() => prismaMock),
}));

const orchestratorCleanup = jest.fn();
jest.mock('../../utils/orchestrator-stream', () => ({
  orchestratorStreamManager: {
    cleanup: orchestratorCleanup,
  },
}));

describe('server bootstrap (index.ts)', () => {
  const ORIGINAL_ENV = process.env.NODE_ENV;
  let app: express.Application;
  let cleanupIntervals: () => Promise<void>;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env.NODE_ENV = ORIGINAL_ENV;
  });

  beforeEach(() => {
    jest.resetModules();
    const serverModule = require('../../index');
    app = serverModule.default;
    cleanupIntervals = serverModule.cleanupIntervals;
  });

  it('responds to health checks', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('routes API requests through mounted routers', async () => {
    const response = await request(app).get('/api/settings/test-settings');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'settings' });
  });

  it('returns 404 JSON for unknown API routes', async () => {
    const response = await request(app).get('/api/unknown-route');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });

  it('serves frontend application for non-API routes', async () => {
    const responseProto = (app as unknown as { response?: express.Response }).response;
    if (!responseProto) {
      throw new Error('Expected Express response prototype to be defined');
    }
    const sendFileSpy = jest
      .spyOn(responseProto, 'sendFile')
      .mockImplementation(function (this: express.Response) {
        this.send('served index.html');
        return this;
      });

    const response = await request(app).get('/some/client/route');
    expect(response.status).toBe(200);
    expect(response.text).toContain('served index.html');

    sendFileSpy.mockRestore();
  });

  it('cleans up intervals and orchestrator resources', async () => {
    await cleanupIntervals();
    expect(orchestratorCleanup).toHaveBeenCalled();
    expect(prismaMock.$disconnect).toHaveBeenCalled();
    expect(logManagerMock.cleanup).not.toHaveBeenCalled();
  });
});
