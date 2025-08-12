/**
 * Server utilities for testing
 */

/**
 * Wait for server to be ready
 */
export async function waitForServer(
  app: ReturnType<typeof import("supertest")>,
  timeoutMs: number = 30000,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await app.get("/api/health").timeout(2000);
      return;
    } catch (error) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error(`Server not ready after ${timeoutMs}ms`);
}
