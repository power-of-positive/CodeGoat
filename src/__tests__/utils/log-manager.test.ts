import fs from 'fs';
import path from 'path';
import os from 'os';
import { LogManager } from '../../utils/log-manager';

describe('LogManager', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'log-manager-'));
  });

  afterEach(async () => {
    jest.useRealTimers();
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  it('organizes logs into dated folders', async () => {
    const manager = new LogManager(tempDir, 7, 10 * 1024 * 1024);
    const logPath = path.join(tempDir, 'app.log');
    const otherPath = path.join(tempDir, 'notes.md');
    await fs.promises.writeFile(logPath, 'log data');
    await fs.promises.writeFile(otherPath, 'not a log');

    await manager.organizeLogs();

    const subdirs = await fs.promises.readdir(tempDir);
    const datedDir = subdirs.find(name => /^\d{4}-\d{2}-\d{2}$/.test(name));
    expect(datedDir).toBeDefined();

    const movedLogs = await fs.promises.readdir(path.join(tempDir, datedDir!));
    expect(movedLogs).toContain('app.log');
    expect(subdirs).toContain('notes.md');
  });

  it('cleans up old, empty, and problematic logs', async () => {
    const manager = new LogManager(tempDir, 1, 10 * 1024 * 1024);
    const oldLog = path.join(tempDir, 'old.log');
    const emptyLog = path.join(tempDir, 'empty.log');
    const problematicLog = path.join(tempDir, 'app-123.log');

    await fs.promises.writeFile(oldLog, 'old');
    await fs.promises.writeFile(emptyLog, '');
    await fs.promises.writeFile(problematicLog, 'short');
    const pastDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    await fs.promises.utimes(oldLog, pastDate, pastDate);

    const stats = await manager.cleanupLogs();

    expect(stats.deletedFiles).toBeGreaterThanOrEqual(1);
    expect(stats.emptyFilesDeleted).toBeGreaterThanOrEqual(1);
    const remaining = await fs.promises.readdir(tempDir);
    expect(remaining).not.toContain('old.log');
    expect(remaining).not.toContain('empty.log');
    expect(remaining).not.toContain('app-123.log');
  });

  it('schedules recurring cleanup and clears interval', async () => {
    jest.useFakeTimers();
    const manager = new LogManager(tempDir, 7, 10 * 1024 * 1024);
    const organizeSpy = jest.spyOn(manager, 'organizeLogs').mockResolvedValue();
    const cleanupSpy = jest.spyOn(manager, 'cleanupLogs').mockResolvedValue({
      deletedFiles: 0,
      deletedSize: 0,
      emptyFilesDeleted: 0,
    });

    const interval = manager.scheduleCleanup(1 / 3600); // every second
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    await Promise.resolve();

    expect(organizeSpy).toHaveBeenCalled();
    expect(cleanupSpy).toHaveBeenCalled();

    clearInterval(interval);
  });

  it('provides aggregate statistics for existing logs', async () => {
    const manager = new LogManager(tempDir, 7, 10 * 1024 * 1024);
    const nestedDir = path.join(tempDir, 'nested');
    await fs.promises.mkdir(nestedDir, { recursive: true });

    const files: Array<{ file: string; contents: string | Buffer }> = [
      { file: path.join(tempDir, 'root.log'), contents: 'root data' },
      { file: path.join(nestedDir, 'nested.log'), contents: 'nested data' },
      { file: path.join(tempDir, 'app123.log'), contents: 'short' },
      { file: path.join(tempDir, 'empty.log'), contents: '' },
      { file: path.join(tempDir, 'readme.txt'), contents: 'txt content' },
    ];

    for (const { file, contents } of files) {
      await fs.promises.writeFile(file, contents);
    }

    const stats = await manager.getLogStats();

    expect(stats.totalFiles).toBe(5);
    expect(stats.emptyFiles).toBeGreaterThanOrEqual(1);
    expect(stats.appLogFiles).toBeGreaterThanOrEqual(1);
    expect(stats.newestFile).not.toBeNull();
    expect(stats.oldestFile).not.toBeNull();
  });
});
