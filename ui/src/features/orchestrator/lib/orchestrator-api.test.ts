import { orchestratorApi } from './orchestrator-api';

jest.mock('../../../shared/lib/api-base', () => {
  const actual = jest.requireActual('../../../shared/lib/api-base');
  return {
    ...actual,
    apiRequest: jest.fn(),
  };
});

const { apiRequest } = jest.requireMock('../../../shared/lib/api-base');

describe('orchestratorApi', () => {
  const apiRequestMock = apiRequest as jest.Mock;
  const originalEnv = process.env;

  beforeEach(() => {
    apiRequestMock.mockReset();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('fetches orchestrator status and unwraps data', async () => {
    const payload = { data: { isRunning: true } };
    apiRequestMock.mockResolvedValueOnce(payload);

    const status = await orchestratorApi.getStatus();

    expect(apiRequestMock).toHaveBeenCalledWith('/orchestrator/status');
    expect(status).toEqual(payload.data);
  });

  it('starts orchestrator with optional payload', async () => {
    const request = { options: { maxRetries: 3, enableValidation: true } };
    apiRequestMock.mockResolvedValueOnce({ success: true });

    await orchestratorApi.start(request);

    expect(apiRequestMock).toHaveBeenCalledWith('/orchestrator/start', {
      method: 'POST',
      body: request,
    });
  });

  it('stops orchestrator', async () => {
    apiRequestMock.mockResolvedValueOnce({ success: true, message: 'stopped' });

    await orchestratorApi.stop();

    expect(apiRequestMock).toHaveBeenCalledWith('/orchestrator/stop', {
      method: 'POST',
    });
  });

  it('executes prompt with payload', async () => {
    const request = { prompt: 'Run once', options: { enableValidation: false } };
    apiRequestMock.mockResolvedValueOnce({ success: true, data: {} });

    await orchestratorApi.executePrompt(request);

    expect(apiRequestMock).toHaveBeenCalledWith('/orchestrator/execute', {
      method: 'POST',
      body: request,
    });
  });

  it('requests single cycle run with options wrapper', async () => {
    const options = { maxTaskRetries: 5 };
    apiRequestMock.mockResolvedValueOnce({ success: true, data: {} });

    await orchestratorApi.runCycle(options);

    expect(apiRequestMock).toHaveBeenCalledWith('/orchestrator/cycle', {
      method: 'POST',
      body: { options },
    });
  });

  it('fetches metrics with optional days query', async () => {
    const metrics = { summary: { totalValidationRuns: 1 } };
    apiRequestMock
      .mockResolvedValueOnce({ data: metrics })
      .mockResolvedValueOnce({ data: metrics });

    await orchestratorApi.getMetrics();
    expect(apiRequestMock).toHaveBeenNthCalledWith(1, '/orchestrator/metrics');

    await orchestratorApi.getMetrics(30);
    expect(apiRequestMock).toHaveBeenNthCalledWith(2, '/orchestrator/metrics?days=30');
  });

  it('fetches stream info with optional session filter', async () => {
    const streamInfo = { data: { clientCount: 2 } };
    apiRequestMock
      .mockResolvedValueOnce(streamInfo)
      .mockResolvedValueOnce(streamInfo);

    await orchestratorApi.getStreamInfo();
    expect(apiRequestMock).toHaveBeenNthCalledWith(1, '/orchestrator/stream/info');

    await orchestratorApi.getStreamInfo('session-123');
    expect(apiRequestMock).toHaveBeenNthCalledWith(
      2,
      '/orchestrator/stream/info?sessionId=session-123'
    );
  });

  it('builds stream URL using environment base path', () => {
    process.env.REACT_APP_API_BASE_URL = 'https://example.com';

    expect(orchestratorApi.getStreamUrl()).toBe('https://example.com/api/orchestrator/stream');
    expect(orchestratorApi.getStreamUrl('abc')).toBe(
      'https://example.com/api/orchestrator/stream?sessionId=abc'
    );
  });
});
