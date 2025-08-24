/**
 * Port utilities for API E2E tests
 */

import { createServer } from 'net';
import { validatePort } from './validation-utils';

/**
 * Check if a port is available
 */
export async function isPortAvailable(port: number): Promise<boolean> {
  validatePort(port);

  return new Promise(resolve => {
    const server = createServer();
    server.listen(port, () => server.close(() => resolve(true)));
    server.on('error', () => resolve(false));
  });
}

/**
 * Find an available port starting from preferred port
 */
export async function findAvailablePort(preferredPort = 3001): Promise<number> {
  for (let port = preferredPort; port <= preferredPort + 10; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports found in range ${preferredPort}-${preferredPort + 10}`);
}
