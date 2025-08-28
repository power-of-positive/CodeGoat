/**
 * Tests for utils.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { findProjectRoot, PrecommitResult } from './utils';

// Mock external dependencies
jest.mock('fs');
jest.mock('path');

describe('utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findProjectRoot', () => {
    it('should find project root with package.json', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (path.join as jest.Mock).mockReturnValue('/mock/package.json');
      (path.parse as jest.Mock).mockReturnValue({
        root: '/',
        dir: '/mock',
        base: 'current',
        ext: '',
        name: 'current',
      });

      const result = findProjectRoot();

      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should throw error when package.json not found', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      (path.parse as jest.Mock).mockReturnValue({
        root: '/',
        dir: '/',
        base: 'root',
        ext: '',
        name: 'root',
      });
      (path.dirname as jest.Mock).mockReturnValue('/');

      expect(() => findProjectRoot()).toThrow('Could not find project root with package.json');
    });
  });

  describe('PrecommitResult interface', () => {
    it('should have correct structure', () => {
      const result: PrecommitResult = {
        decision: 'approve',
        feedback: 'All good',
      };

      expect(result).toHaveProperty('decision');
      expect(['approve', 'block']).toContain(result.decision);
    });
  });
});
