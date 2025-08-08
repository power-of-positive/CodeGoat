import { ConfigLoader } from '../config';
import fs from 'fs';
import yaml from 'yaml';

// Mock dependencies
jest.mock('fs');
jest.mock('yaml');

const mockFs = fs as jest.Mocked<typeof fs>;
const mockYaml = yaml as jest.Mocked<typeof yaml>;

describe('ConfigLoader - Extended Coverage', () => {
  let configLoader: ConfigLoader;
  const mockConfigPath = '/test/config.yaml';

  beforeEach(() => {
    jest.clearAllMocks();
    configLoader = new ConfigLoader(mockConfigPath);
  });

  describe('constructor and file paths', () => {
    it('should use default config path when not provided', () => {
      const defaultLoader = new ConfigLoader();
      expect(defaultLoader).toBeDefined();
    });

    it('should set custom config paths', () => {
      const customLoader = new ConfigLoader('/custom/config.yaml');
      expect(customLoader).toBeDefined();
    });
  });

  describe('normalizeConfig', () => {
    it('should normalize valid configuration', () => {
      const rawConfig = {
        proxy: { port: 3000, host: 'localhost' },
        routes: [],
        models: {
          'test-model': {
            name: 'Test Model',
            model: 'test/model',
            apiKey: 'test-key',
            provider: 'openai',
          },
        },
        settings: {
          logging: { level: 'info', format: 'json' },
          timeout: { request: 30000, idle: 60000 },
          retries: { attempts: 3, backoff: 'exponential' },
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('test yaml content');
      mockYaml.parse.mockReturnValue(rawConfig);

      const config = configLoader.load();
      expect(config).toBeDefined();
      expect(config.proxy).toEqual(rawConfig.proxy);
    });

    it('should handle missing models configuration', () => {
      const rawConfig = {
        proxy: { port: 3000, host: 'localhost' },
        routes: [],
        settings: {
          logging: { level: 'info', format: 'json' },
          timeout: { request: 30000, idle: 60000 },
          retries: { attempts: 3, backoff: 'exponential' },
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('test yaml content');
      mockYaml.parse.mockReturnValue(rawConfig);

      const config = configLoader.load();
      expect(config.modelConfig).toBeUndefined();
    });

    it('should apply environment variable substitution', () => {
      process.env.TEST_API_KEY = 'env-test-key';

      const rawConfig = {
        proxy: { port: 3000, host: 'localhost' },
        routes: [],
        models: {
          'env-model': {
            name: 'Env Model',
            model: 'env/model',
            apiKey: 'os.environ/TEST_API_KEY',
            provider: 'openai',
          },
        },
        settings: {
          logging: { level: 'info', format: 'json' },
          timeout: { request: 30000, idle: 60000 },
          retries: { attempts: 3, backoff: 'exponential' },
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('test yaml content');
      mockYaml.parse.mockReturnValue(rawConfig);

      configLoader.load();
      const models = configLoader.getAllModels();
      expect(models[0].apiKey).toBe('env-test-key');

      delete process.env.TEST_API_KEY;
    });
  });

  describe('convertToProxyConfig', () => {
    it('should convert routes properly', () => {
      const rawConfig = {
        proxy: { port: 3000, host: 'localhost' },
        routes: [
          {
            name: 'openai',
            match: { path: '/v1/*', method: ['GET', 'POST'] },
            target: {
              url: 'https://api.openai.com',
              headers: { forward: ['content-type'], add: { 'X-Test': 'true' } },
            },
          },
        ],
        settings: {
          logging: { level: 'info', format: 'json' },
          timeout: { request: 30000, idle: 60000 },
          retries: { attempts: 3, backoff: 'exponential' },
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('test yaml content');
      mockYaml.parse.mockReturnValue(rawConfig);

      const config = configLoader.load();
      expect(config.routes).toHaveLength(1);
      expect(config.routes[0].name).toBe('openai');
      expect(config.routes[0].streaming).toBe(false);
    });

    it('should handle routes with streaming option', () => {
      const rawConfig = {
        proxy: { port: 3000, host: 'localhost' },
        routes: [
          {
            name: 'streaming-route',
            match: { path: '/stream/*', method: 'POST' },
            target: {
              url: 'https://api.example.com',
              headers: { forward: ['*'] },
            },
            streaming: true,
          },
        ],
        settings: {
          logging: { level: 'info', format: 'json' },
          timeout: { request: 30000, idle: 60000 },
          retries: { attempts: 3, backoff: 'exponential' },
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('test yaml content');
      mockYaml.parse.mockReturnValue(rawConfig);

      const config = configLoader.load();
      expect(config.routes[0].streaming).toBe(true);
    });
  });

  describe('user config handling', () => {
    it('should merge user config with base config', () => {
      const baseConfig = {
        proxy: { port: 3000, host: 'localhost' },
        routes: [],
        models: {
          'base-model': {
            name: 'Base Model',
            model: 'base/model',
            apiKey: 'base-key',
            provider: 'openai',
          },
        },
        settings: {
          logging: { level: 'info', format: 'json' },
          timeout: { request: 30000, idle: 60000 },
          retries: { attempts: 3, backoff: 'exponential' },
        },
      };

      const userConfig = {
        models: {
          'user-model': {
            name: 'User Model',
            model: 'user/model',
            apiKey: 'user-key',
            provider: 'anthropic',
          },
        },
      };

      mockFs.existsSync
        .mockReturnValueOnce(true) // base config exists
        .mockReturnValueOnce(true); // user config exists

      mockFs.readFileSync.mockReturnValueOnce('base yaml').mockReturnValueOnce('user yaml');

      mockYaml.parse.mockReturnValueOnce(baseConfig).mockReturnValueOnce(userConfig);

      configLoader.load();
      const models = configLoader.getAllModels();

      expect(models).toHaveLength(2);
      expect(models.find(m => m.id === 'base-model')).toBeDefined();
      expect(models.find(m => m.id === 'user-model')).toBeDefined();
    });

    it('should work without user config file', () => {
      const baseConfig = {
        proxy: { port: 3000, host: 'localhost' },
        routes: [],
        settings: {
          logging: { level: 'info', format: 'json' },
          timeout: { request: 30000, idle: 60000 },
          retries: { attempts: 3, backoff: 'exponential' },
        },
      };

      mockFs.existsSync
        .mockReturnValueOnce(true) // base config exists
        .mockReturnValueOnce(false); // user config doesn't exist

      mockFs.readFileSync.mockReturnValueOnce('base yaml');
      mockYaml.parse.mockReturnValueOnce(baseConfig);

      const config = configLoader.load();
      expect(config).toBeDefined();
    });
  });

  describe('model management', () => {
    it('should update an existing model', () => {
      const baseConfig = {
        proxy: { port: 3000, host: 'localhost' },
        routes: [],
        models: {
          'test-model': {
            name: 'Test Model',
            model: 'test/model',
            apiKey: 'old-key',
            provider: 'openai',
            enabled: true,
          },
        },
        settings: {
          logging: { level: 'info', format: 'json' },
          timeout: { request: 30000, idle: 60000 },
          retries: { attempts: 3, backoff: 'exponential' },
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('test yaml');
      mockYaml.parse.mockReturnValue(baseConfig);
      mockYaml.stringify.mockReturnValue('updated yaml');

      configLoader.load();
      configLoader.updateModel('test-model', {
        name: 'Test Model',
        model: 'test/model',
        apiKey: 'new-key',
        provider: 'openai',
      });

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const writtenData = mockYaml.stringify.mock.calls[0][0];
      expect(writtenData.models['test-model'].apiKey).toBe('new-key');
      expect(writtenData.models['test-model'].enabled).toBe(false);
    });

    it('should handle model update for non-existent model', () => {
      const baseConfig = {
        proxy: { port: 3000, host: 'localhost' },
        routes: [],
        models: {},
        settings: {
          logging: { level: 'info', format: 'json' },
          timeout: { request: 30000, idle: 60000 },
          retries: { attempts: 3, backoff: 'exponential' },
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('test yaml');
      mockYaml.parse.mockReturnValue(baseConfig);

      configLoader.load();

      expect(() => {
        configLoader.updateModel('non-existent', {
          name: 'Test',
          model: 'test',
          apiKey: 'new-key',
          provider: 'openai',
        });
      }).toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle missing required fields in config', () => {
      const invalidConfig = {
        // Missing proxy configuration
        routes: [],
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid yaml');
      mockYaml.parse.mockReturnValue(invalidConfig);

      expect(() => configLoader.load()).toThrow();
    });

    it('should handle invalid route configuration', () => {
      const invalidConfig = {
        proxy: { port: 3000, host: 'localhost' },
        routes: [
          {
            // Missing required fields
            name: 'invalid-route',
          },
        ],
        settings: {
          logging: { level: 'info', format: 'json' },
          timeout: { request: 30000, idle: 60000 },
          retries: { attempts: 3, backoff: 'exponential' },
        },
      };

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid yaml');
      mockYaml.parse.mockReturnValue(invalidConfig);

      expect(() => configLoader.load()).toThrow();
    });
  });
});
