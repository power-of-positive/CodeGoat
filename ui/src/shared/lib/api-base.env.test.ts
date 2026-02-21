
describe('API base URL resolution', () => {
  const originalWindow = global.window;
  const originalEnv = process.env;
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    (global.fetch as unknown) = fetchMock;
    fetchMock.mockReset();
    if (originalWindow) {
      Object.assign(window, originalWindow);
    }
    delete (window as any).electronAPI;
  });

  afterEach(() => {
    process.env = originalEnv;
    if (originalWindow) {
      global.window = originalWindow;
    }
    global.fetch = originalFetch;
    fetchMock.mockReset();
  });

  it('prefers Electron API base when available', async () => {
    (window as any).electronAPI = { apiBase: 'electron://ipc' };

    const { apiRequest } = await import('./api-base');

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await apiRequest('/health');

    expect(fetchMock).toHaveBeenCalledWith(
      'electron://ipc/health',
      expect.objectContaining({ headers: expect.any(Object) })
    );
  });

  it('falls back to process env when Electron base is missing', async () => {
    delete (window as any).electronAPI;
    process.env = { ...originalEnv, API_BASE_URL: 'https://api.local' };

    const { apiRequest } = await import('./api-base');

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });

    await apiRequest('/status');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.local/status',
      expect.objectContaining({ headers: expect.any(Object) })
    );
  });
});
