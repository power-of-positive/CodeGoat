/**
 * Tests for port-utils.ts
 */

import * as net from 'net';
import { isPortAvailable, findAvailablePort } from './port-utils';

jest.mock('net');

describe('port-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isPortAvailable', () => {
    it('should return true when port is available', async () => {
      const mockServer = {
        listen: jest.fn((port, callback) => {
          expect(port).toBe(3001);
          callback();
        }),
        close: jest.fn(callback => callback()),
        on: jest.fn(),
      };
      (net.createServer as jest.Mock).mockReturnValue(mockServer as unknown as net.Server);

      const result = await isPortAvailable(3001);

      expect(result).toBe(true);
      expect(mockServer.listen).toHaveBeenCalledWith(3001, expect.any(Function));
      expect(mockServer.close).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should return false when port is not available', async () => {
      const mockServer = {
        listen: jest.fn(port => {
          expect(port).toBe(3001);
          // Don't call callback() for error case
          const error = new Error('EADDRINUSE');
          (error as unknown as { code: string }).code = 'EADDRINUSE';
          setTimeout(() => {
            mockServer.on.mock.calls.find(([event]) => event === 'error')?.[1](error);
          }, 0);
        }),
        close: jest.fn(callback => callback()),
        on: jest.fn(),
      };
      (net.createServer as jest.Mock).mockReturnValue(mockServer as unknown as net.Server);

      const result = await isPortAvailable(3001);

      expect(result).toBe(false);
      expect(mockServer.listen).toHaveBeenCalledWith(3001, expect.any(Function));
    });

    it('should return false for other server errors', async () => {
      const mockServer = {
        listen: jest.fn(port => {
          expect(port).toBe(3001);
          // Don't call callback() for error case
          const error = new Error('Other error');
          setTimeout(() => {
            mockServer.on.mock.calls.find(([event]) => event === 'error')?.[1](error);
          }, 0);
        }),
        close: jest.fn(callback => callback()),
        on: jest.fn(),
      };
      (net.createServer as jest.Mock).mockReturnValue(mockServer as unknown as net.Server);

      const result = await isPortAvailable(3001);

      expect(result).toBe(false);
    });
  });

  describe('findAvailablePort', () => {
    it('should return the starting port if available', async () => {
      const mockServer = {
        listen: jest.fn((port, callback) => {
          expect(port).toBe(3001);
          callback();
        }),
        close: jest.fn(callback => callback()),
        on: jest.fn(),
      };
      (net.createServer as jest.Mock).mockReturnValue(mockServer as unknown as net.Server);

      const result = await findAvailablePort(3001);

      expect(result).toBe(3001);
    });

    it('should find next available port when starting port is taken', async () => {
      let callCount = 0;
      const mockServer = {
        listen: jest.fn((_port, callback) => {
          callCount++;
          if (callCount === 1) {
            // First port (3001) is taken
            const error = new Error('EADDRINUSE');
            (error as unknown as { code: string }).code = 'EADDRINUSE';
            setTimeout(() => {
              mockServer.on.mock.calls.find(([event]) => event === 'error')?.[1](error);
            }, 0);
          } else {
            // Second port (3002) is available
            callback();
          }
        }),
        close: jest.fn(callback => callback()),
        on: jest.fn(),
      };
      (net.createServer as jest.Mock).mockReturnValue(mockServer as unknown as net.Server);

      const result = await findAvailablePort(3001);

      expect(result).toBe(3002);
      expect(mockServer.listen).toHaveBeenCalledTimes(2);
    });

    it('should check multiple ports until one is available', async () => {
      let callCount = 0;

      (net.createServer as jest.Mock).mockImplementation(() => {
        callCount++;
        const mockServer = {
          listen: jest.fn((_port, callback) => {
            if (callCount <= 3) {
              // First 3 ports are taken
              const error = new Error('EADDRINUSE');
              (error as unknown as { code: string }).code = 'EADDRINUSE';
              setTimeout(() => {
                mockServer.on.mock.calls.find(([event]) => event === 'error')?.[1](error);
              }, 0);
            } else {
              // Fourth port is available
              callback();
            }
          }),
          close: jest.fn(callback => callback()),
          on: jest.fn(),
        };
        return mockServer as unknown as net.Server;
      });

      const result = await findAvailablePort(3001);

      expect(result).toBe(3004);
      expect(net.createServer).toHaveBeenCalledTimes(4);
    });

    it('should throw error when max attempts reached', async () => {
      (net.createServer as jest.Mock).mockImplementation(() => {
        const mockServer = {
          listen: jest.fn(port => {
            // Port should be in the expected range
            expect(port).toBeGreaterThanOrEqual(3001);
            expect(port).toBeLessThanOrEqual(3011);
            // Don't call callback() for error case
            const error = new Error('EADDRINUSE');
            (error as unknown as { code: string }).code = 'EADDRINUSE';
            setTimeout(() => {
              mockServer.on.mock.calls.find(([event]) => event === 'error')?.[1](error);
            }, 0);
          }),
          close: jest.fn(callback => callback()),
          on: jest.fn(),
        };
        return mockServer as unknown as net.Server;
      });

      await expect(findAvailablePort(3001)).rejects.toThrow(
        'No available ports found in range 3001-3011'
      );
      expect(net.createServer).toHaveBeenCalledTimes(11);
    });

    it('should use default port 3001 when no preferred port provided', async () => {
      const mockServer = {
        listen: jest.fn((port, callback) => {
          expect(port).toBe(3001);
          callback();
        }),
        close: jest.fn(callback => callback()),
        on: jest.fn(),
      };
      (net.createServer as jest.Mock).mockReturnValue(mockServer as unknown as net.Server);

      const result = await findAvailablePort(); // No parameter passed

      expect(result).toBe(3001);
    });
  });
});
