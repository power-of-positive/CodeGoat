import request from "supertest";

/**
 * Minimal Supertest client for migration confidence tests
 * Reduces boilerplate while maintaining full API coverage
 */
export class TestApiBase {
  protected app: ReturnType<typeof request>;

  constructor(baseUrl: string) {
    this.app = request(baseUrl.replace(/\/$/, ""));
  }

  // HTTP methods with migration confidence error handling
  private handleResponse<T>(res: any): T {
    // Check both HTTP status and success field for migration confidence
    if (res.status >= 400 || res.body?.success === false) {
      throw new Error(res.body?.message || `HTTP ${res.status}`);
    }
    return res.body?.data || res.body;
  }

  async get<T>(endpoint: string): Promise<T> {
    const res = await this.app.get(endpoint);
    return this.handleResponse<T>(res);
  }

  async post<T>(endpoint: string, data?: object): Promise<T> {
    const res = await this.app.post(endpoint).send(data);
    return this.handleResponse<T>(res);
  }

  async put<T>(endpoint: string, data: object): Promise<T> {
    const res = await this.app.put(endpoint).send(data);
    return this.handleResponse<T>(res);
  }

  async delete(endpoint: string): Promise<void> {
    const res = await this.app.delete(endpoint);
    this.handleResponse(res);
  }

  // For error testing - expect specific status codes
  async expectError(
    endpoint: string,
    method: string,
    data?: object,
    expectedStatus = 400,
  ) {
    const req =
      method === "POST"
        ? this.app.post(endpoint).send(data)
        : this.app.get(endpoint);
    await req.expect(expectedStatus);
  }

  // Simple polling for async operations
  async waitFor<T>(
    checkFn: () => Promise<T | null>,
    timeoutMs = 5000,
  ): Promise<T> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const result = await checkFn();
      if (result !== null) return result;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Timeout after ${timeoutMs}ms`);
  }

  // Wait for server to be ready
  async waitForServer(timeoutMs = 10000): Promise<void> {
    await this.waitFor(async () => {
      try {
        await this.app.get("/api/health").expect(200);
        return true;
      } catch {
        return null;
      }
    }, timeoutMs);
  }
}
