/**
 * UI component analysis tests for playwright-coverage.ts
 */

import * as fs from 'fs';
import { isUiComponentFile } from './playwright-coverage';

jest.mock('fs', () => ({ existsSync: jest.fn(), readFileSync: jest.fn() }));

describe('playwright-coverage UI analysis', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('export default Component;');
  });

  describe('isUiComponentFile - detailed component analysis', () => {
    it('should identify UI components by content analysis', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue(
        'export function Component() { return <div>test</div>; }'
      );

      expect(isUiComponentFile('frontend/src/components/Component.tsx')).toBe(true);
    });

    it('should detect React components and reject non-UI files', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      // Test various React component patterns - use frontend paths
      (fs.readFileSync as jest.Mock).mockReturnValue('export const Modal = () => <div>Modal</div>;');
      expect(isUiComponentFile('frontend/src/components/Modal.tsx')).toBe(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('const Input: React.FC = () => <input />;');
      expect(isUiComponentFile('frontend/src/pages/Input.tsx')).toBe(true);

      // Test non-UI files
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      expect(isUiComponentFile('utils.ts')).toBe(false);
      expect(isUiComponentFile('config.json')).toBe(false);

      // Test tsx without JSX - file outside frontend should still check content
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockReturnValue('console.error("no components");');
      expect(isUiComponentFile('other/utils.tsx')).toBe(false);
    });

    it('should handle file read errors gracefully', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readFileSync as jest.Mock).mockImplementation(() => {
        throw new Error('Read error');
      });

      expect(isUiComponentFile('other/Component.tsx')).toBe(false);
    });
  });
});
