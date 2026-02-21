import fs from 'fs';
import path from 'path';
import os from 'os';

describe('database configuration utilities', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let databaseConfig: typeof import('../../config/database');

  beforeEach(() => {
    jest.resetModules();
    originalEnv = { ...process.env };
    delete process.env.DATABASE_URL;
    delete process.env.KANBAN_DATABASE_URL;
    databaseConfig = require('../../config/database');
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('returns default URLs based on NODE_ENV', () => {
    process.env.NODE_ENV = 'development';
    expect(databaseConfig.getDefaultDatabaseUrl()).toBe('file:./prisma/kanban.db');

    process.env.NODE_ENV = 'production';
    expect(databaseConfig.getDefaultDatabaseUrl()).toBe('file:./prisma/kanban-prod.db');

    process.env.NODE_ENV = 'test';
    expect(databaseConfig.getDefaultDatabaseUrl()).toBe('file:./prisma/kanban-test.db');
  });

  it('selects database URL from environment variables with validation', () => {
    process.env.DATABASE_URL = 'file:./custom.db';
    expect(databaseConfig.getDatabaseUrl()).toBe('file:./custom.db');

    delete process.env.DATABASE_URL;
    process.env.KANBAN_DATABASE_URL = 'file:./legacy.db';
    expect(databaseConfig.getDatabaseUrl()).toBe('file:./legacy.db');
  });

  it('throws when database URL format is invalid', () => {
    process.env.DATABASE_URL = 'sqlite://invalid';
    expect(() => databaseConfig.getDatabaseUrl()).toThrow(/Invalid database URL format/);
  });

  it('synchronizes DATABASE_URL and KANBAN_DATABASE_URL', () => {
    process.env.KANBAN_DATABASE_URL = 'file:./legacy.db';
    databaseConfig.ensureDatabaseUrl();
    expect(process.env.DATABASE_URL).toBe('file:./legacy.db');

    delete process.env.KANBAN_DATABASE_URL;
    process.env.DATABASE_URL = 'file:./primary.db';
    databaseConfig.ensureDatabaseUrl();
    expect(process.env.KANBAN_DATABASE_URL).toBe('file:./primary.db');
  });

  it('returns Prisma datasource configuration', () => {
    process.env.DATABASE_URL = 'file:./primary.db';
    const config = databaseConfig.getPrismaDatasourceConfig();
    expect(config).toEqual({ db: { url: 'file:./primary.db' } });
  });

  it('validates database file existence for SQLite URLs', async () => {
    const tempFile = path.join(os.tmpdir(), `db-${Date.now()}.sqlite`);
    fs.writeFileSync(tempFile, '');

    expect(databaseConfig.validateDatabaseExists(`file:${tempFile}`)).toBe(true);
    expect(databaseConfig.validateDatabaseExists('file:/non-existent/db.sqlite')).toBe(false);
    expect(databaseConfig.validateDatabaseExists('postgres://example')).toBe(false);

    fs.unlinkSync(tempFile);
  });

  it('provides database environment information', () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = 'file:./primary.db';
    process.env.KANBAN_DATABASE_URL = 'file:./legacy.db';

    const info = databaseConfig.getDatabaseInfo();

    expect(info).toMatchObject({
      nodeEnv: 'development',
      databaseUrl: 'file:./primary.db',
      kanbanDatabaseUrl: 'file:./legacy.db',
    });
    expect(info.resolvedUrl).toBe('file:./primary.db');
    expect(info.defaultUrl).toBe('file:./prisma/kanban.db');
  });
});
