import fs from 'fs';
import path from 'path';
import os from 'os';
import { WorktreeManager } from '../../utils/worktree-manager';

const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

describe('WorktreeManager', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'worktree-manager-test-'));
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  const createManager = () => new WorktreeManager(tempDir, logger, tempDir);

  it('creates fallback worktree when repository is unavailable', async () => {
    const manager = createManager();
    const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(tempDir);
    await fs.promises.writeFile(path.join(tempDir, 'package.json'), '{}');
    await fs.promises.writeFile(path.join(tempDir, 'tsconfig.json'), '{}');
    await fs.promises.mkdir(path.join(tempDir, 'src'), { recursive: true });
    await fs.promises.writeFile(path.join(tempDir, 'src', 'index.ts'), '// index');

    const worktreePath = await manager.createWorktree({ taskId: 'task-1', workerId: 'worker-abc' });

    expect(fs.existsSync(worktreePath)).toBe(true);
    const copiedFiles = await fs.promises.readdir(worktreePath);
    expect(copiedFiles).toContain('package.json');

    cwdSpy.mockRestore();
  });

  it('removes fallback worktree via filesystem when git operations are unavailable', async () => {
    const manager = createManager();
    const worktreePath = await manager.createWorktree({ taskId: 'task-2', workerId: 'worker-xyz' });

    await manager.removeWorktree(worktreePath);

    expect(fs.existsSync(worktreePath)).toBe(false);
  });

  it('lists fallback worktrees from filesystem when not in git repository', async () => {
    const manager = createManager();
    const worktreeA = await manager.createWorktree({ taskId: 'task-3', workerId: 'worker-a' });
    const worktreeB = path.join(tempDir, 'other');
    await fs.promises.mkdir(worktreeB, { recursive: true });

    const worktrees = await manager.listWorktrees();

    expect(worktrees).toContain(worktreeA);
    expect(worktrees).not.toContain(worktreeB);
  });

  it('cleans up worktrees via list and remove operations', async () => {
    const manager = createManager();
    const keepWorktree = await manager.createWorktree({ taskId: 'task-main', workerId: 'worker-main' });
    const cwdSpy = jest.spyOn(process, 'cwd').mockReturnValue(keepWorktree);
    const staleWorktree = await manager.createWorktree({ taskId: 'task-4', workerId: 'worker-b' });

    const cleaned = await manager.cleanupWorktrees();

    expect(cleaned).toBe(1);
    expect(fs.existsSync(staleWorktree)).toBe(false);
    expect(fs.existsSync(keepWorktree)).toBe(true);

    cwdSpy.mockRestore();
  });

  it('parses git worktree list output', () => {
    const manager = createManager();
    const output = 'worktree /tmp/repo/worktree-main\nHEAD abc123\nworktree /tmp/repo/worktree-dev\n';
    const parsed = (manager as unknown as { parseWorktreeList: (o: string) => string[] }).parseWorktreeList(output);

    expect(parsed).toEqual(['/tmp/repo/worktree-main', '/tmp/repo/worktree-dev']);
    expect(manager.getBasePath()).toBe(tempDir);
  });
});
