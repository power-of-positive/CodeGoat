import { jest } from '@jest/globals';

interface MockConfigLoader {
  load: jest.MockedFunction<() => unknown>;
  getConfig: jest.MockedFunction<() => unknown>;
  reload: jest.MockedFunction<() => unknown>;
  addModel: jest.MockedFunction<(modelData: unknown) => unknown>;
  updateModel: jest.MockedFunction<(id: string, modelData: unknown) => unknown>;
  deleteModel: jest.MockedFunction<(id: string) => unknown>;
  getAllModels: jest.MockedFunction<() => unknown[]>;
}

interface MockModelConfig {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  provider: string;
  enabled: boolean;
  isDefault: boolean;
}

interface MockProxyConfig {
  proxy: { host: string; port: number };
  routes: unknown[];
  settings: {
    logging: { level: string; format: string };
    timeout: { request: number; idle: number };
    retries: { attempts: number; backoff: string };
  };
  modelConfig: { models: Record<string, unknown> };
}

export const createMockConfigLoader = (): MockConfigLoader => ({
  load: jest.fn(),
  getConfig: jest.fn(),
  reload: jest.fn(),
  addModel: jest.fn(),
  updateModel: jest.fn(),
  deleteModel: jest.fn(),
  getAllModels: jest.fn(),
});

export const createMockModels = (): MockModelConfig[] => [
  {
    id: 'test-model-1',
    name: 'Test Model 1',
    baseUrl: 'https://api.example.com/v1',
    model: 'test-model-1',
    apiKey: 'test-key-1',
    provider: 'openai',
    enabled: true,
    isDefault: true,
  },
  {
    id: 'test-model-2',
    name: 'Test Model 2',
    baseUrl: 'https://api.example.com/v1',
    model: 'test-model-2',
    apiKey: 'test-key-2',
    provider: 'openrouter',
    enabled: false,
    isDefault: false,
  },
];

export const createMockConfig = (): MockProxyConfig => ({
  proxy: {
    host: 'localhost',
    port: 3000,
  },
  routes: [],
  settings: {
    logging: { level: 'info', format: 'json' },
    timeout: { request: 30000, idle: 60000 },
    retries: { attempts: 3, backoff: 'exponential' },
  },
  modelConfig: {
    models: {},
  },
});
