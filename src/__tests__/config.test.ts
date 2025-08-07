import { ConfigLoader } from '../config';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ConfigLoader', () => {
  let configLoader: ConfigLoader;
  const mockConfigContent = `
model_list:
  - model_name: test-model
    litellm_params:
      model: openrouter/test/model
      api_key: test-key

router_settings:
  enable_pre_call_checks: true

litellm_settings:
  cooldown_time: 30
  num_retries: 2
  allowed_fails: 3
`;

  beforeEach(() => {
    jest.clearAllMocks();
    configLoader = new ConfigLoader();
  });

  describe('load()', () => {
    it('should load and parse valid configuration', () => {
      mockFs.readFileSync.mockReturnValue(mockConfigContent);

      const config = configLoader.load();

      expect(config).toBeDefined();
      expect(config.routes).toBeDefined();
      expect(config.routes.length).toBeGreaterThan(0);
      expect(config.modelConfig).toBeDefined();
      expect(config.modelConfig?.model_list).toHaveLength(1);
    });

    it('should throw error for invalid file path', () => {
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      expect(() => configLoader.load()).toThrow(/Failed to load configuration/);
    });

    it('should create proper route configuration', () => {
      mockFs.readFileSync.mockReturnValue(mockConfigContent);

      const config = configLoader.load();
      const routes = config.routes;

      // Check for required routes
      const modelsRoute = routes.find(r => r.match.path === '/v1/models');
      const legacyModelsRoute = routes.find(r => r.match.path === '/models');
      const chatRoute = routes.find(r => r.match.path === '/v1/chat/completions');
      const legacyChatRoute = routes.find(r => r.match.path === '/chat/completions');

      expect(modelsRoute).toBeDefined();
      expect(legacyModelsRoute).toBeDefined();
      expect(chatRoute).toBeDefined();
      expect(legacyChatRoute).toBeDefined();

      expect(modelsRoute?.target.url).toBe('internal://models');
      expect(chatRoute?.target.url).toBe('proxy://chat/completions');
    });

    it('should validate required configuration fields', () => {
      const invalidConfig = `
model_list: []
`;
      mockFs.readFileSync.mockReturnValue(invalidConfig);

      // Should not throw - empty model list is allowed
      expect(() => configLoader.load()).not.toThrow();
    });
  });

  describe('getConfig()', () => {
    it('should return loaded configuration', () => {
      mockFs.readFileSync.mockReturnValue(mockConfigContent);
      configLoader.load();

      const config = configLoader.getConfig();
      expect(config).toBeDefined();
      expect(config.modelConfig?.model_list).toHaveLength(1);
    });

    it('should throw error if configuration not loaded', () => {
      expect(() => configLoader.getConfig()).toThrow(/Configuration not loaded/);
    });
  });

  describe('reload()', () => {
    it('should reload configuration from file', () => {
      mockFs.readFileSync.mockReturnValue(mockConfigContent);
      configLoader.load();

      const updatedConfig = `
model_list:
  - model_name: updated-model
    litellm_params:
      model: openrouter/updated/model
      api_key: updated-key
`;
      mockFs.readFileSync.mockReturnValue(updatedConfig);

      const reloadedConfig = configLoader.reload();
      expect(reloadedConfig.modelConfig?.model_list[0].model_name).toBe('updated-model');
    });
  });
});
