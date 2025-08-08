import { jest } from '@jest/globals';
import fs from 'fs';

type MockFsReturn = jest.Mocked<typeof fs>;

export const createMockFs = (): MockFsReturn => {
  const mockFs = fs as jest.Mocked<typeof fs>;

  // Common implementations with proper typing
  mockFs.existsSync.mockImplementation(() => true);
  mockFs.readFileSync.mockImplementation(
    (() => 'mock file content') as unknown as typeof fs.readFileSync
  );
  mockFs.writeFileSync.mockImplementation(() => undefined);
  mockFs.mkdirSync.mockImplementation(() => undefined);
  mockFs.readdirSync.mockImplementation(() => []);
  mockFs.statSync.mockImplementation((() => ({
    isDirectory: (): boolean => false,
    isFile: (): boolean => true,
    mtime: new Date(),
    size: 1024,
  })) as unknown as typeof fs.statSync);

  return mockFs;
};
