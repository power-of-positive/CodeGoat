/**
 * Tests for format-utils.ts
 */

import { restageFiles } from './format-utils';
import * as commandUtils from '../utils/command-utils';

jest.mock('../utils/command-utils');

describe('format-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('restageFiles', () => {
    it('should return success result when no files to re-stage', () => {
      const result = restageFiles('/mock/project', []);

      expect(result.success).toBe(true);
      expect(result.output).toBe('No files to re-stage');
      expect((commandUtils.execCommand as jest.Mock)).not.toHaveBeenCalled();
    });

    it('should execute git add command for single file', () => {
      const mockResult = { success: true, output: 'File staged successfully' };
      (commandUtils.execCommand as jest.Mock).mockReturnValue(mockResult);

      const result = restageFiles('/mock/project', ['test.ts']);

      expect((commandUtils.execCommand as jest.Mock)).toHaveBeenCalledWith(
        'git add "test.ts"',
        '/mock/project'
      );
      expect(result).toEqual(mockResult);
    });

    it('should execute git add command for multiple files', () => {
      const mockResult = { success: true, output: 'Files staged successfully' };
      (commandUtils.execCommand as jest.Mock).mockReturnValue(mockResult);

      const result = restageFiles('/mock/project', ['test1.ts', 'test2.js', 'test3.tsx']);

      expect((commandUtils.execCommand as jest.Mock)).toHaveBeenCalledWith(
        'git add "test1.ts" "test2.js" "test3.tsx"',
        '/mock/project'
      );
      expect(result).toEqual(mockResult);
    });

    it('should properly quote file names with spaces', () => {
      const mockResult = { success: true, output: 'Files staged successfully' };
      (commandUtils.execCommand as jest.Mock).mockReturnValue(mockResult);

      const result = restageFiles('/mock/project', ['file with spaces.ts', 'normal-file.js']);

      expect((commandUtils.execCommand as jest.Mock)).toHaveBeenCalledWith(
        'git add "file with spaces.ts" "normal-file.js"',
        '/mock/project'
      );
      expect(result).toEqual(mockResult);
    });

    it('should handle command execution failure', () => {
      const mockResult = { success: false, output: 'Git add failed' };
      (commandUtils.execCommand as jest.Mock).mockReturnValue(mockResult);

      const result = restageFiles('/mock/project', ['test.ts']);

      expect(result).toEqual(mockResult);
    });
  });
});
