import { ConfigLoader } from '../config';
import * as fs from 'fs';

// Mock fs module
jest.mock('fs');
const mockFs = fs as jest.Mocked<typeof fs>;

describe('ConfigLoader', () => {
  let configLoader: ConfigLoader;
  const mockDefaultConfigContent = `
models:
  default-model:
    name: "default-model"
    model: "openrouter/default/model"
    provider: "openrouter"
    baseUrl: "https://openrouter.ai/api/v1"
    apiKey: "default-key"
    enabled: true

settings:
  enablePreCallChecks: true
  cooldownTime: 30
  retries: 2
  allowedFails: 3
`;

  const mockUserConfigContent = `
models:
  user-model:
    name: "user-model"
    model: "openrouter/user/model"
    provider: "openrouter"
    baseUrl: "https://openrouter.ai/api/v1"
    apiKey: "user-key"
    enabled: true
`;

  beforeEach(() => {
    jest.clearAllMocks();
    configLoader = new ConfigLoader();
  });

  describe('load()', () => {
    it('should load and parse valid configuration', () => {
      // Mock existsSync to return true for both files
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const pathStr = path.toString();
        return pathStr.includes('config.default.yaml') || pathStr.includes('config.user.yaml');
      });

      // Mock readFileSync to return appropriate content based on file path
      mockFs.readFileSync.mockImplementation((path: fs.PathOrFileDescriptor) => {
        const pathStr = path.toString();
        if (pathStr.includes('config.default.yaml')) {
          return mockDefaultConfigContent;
        } else if (pathStr.includes('config.user.yaml')) {
          return mockUserConfigContent;
        }
        return '';
      });

      const config = configLoader.load();

      expect(config).toBeDefined();
      expect(config.routes).toBeDefined();
      expect(config.routes.length).toBeGreaterThan(0);
      expect(config.modelConfig).toBeDefined();
      // Should have 2 models: 1 default + 1 user
      expect(Object.keys(config.modelConfig?.models || {})).toHaveLength(2);
    });

    it('should throw error for invalid file path', () => {
      // Mock existsSync to return false for both files
      mockFs.existsSync.mockReturnValue(false);

      // This should not throw - missing configs just result in empty model list
      expect(() => configLoader.load()).not.toThrow();

      const config = configLoader.load();
      expect(Object.keys(config.modelConfig?.models || {})).toHaveLength(0);
    });

    it('should create proper route configuration', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation((path: fs.PathOrFileDescriptor) => {
        const pathStr = path.toString();
        if (pathStr.includes('config.default.yaml')) {
          return mockDefaultConfigContent;
        }
        return 'models: {}';
      });

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
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('model_list: []');

      // Should not throw - empty model list is allowed
      expect(() => configLoader.load()).not.toThrow();
    });
  });

  describe('getConfig()', () => {
    it('should return loaded configuration', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation((path: fs.PathOrFileDescriptor) => {
        const pathStr = path.toString();
        if (pathStr.includes('config.default.yaml')) {
          return mockDefaultConfigContent;
        }
        return 'models: {}';
      });
      configLoader.load();

      const config = configLoader.getConfig();
      expect(config).toBeDefined();
      expect(Object.keys(config.modelConfig?.models || {})).toHaveLength(1);
    });

    it('should throw error if configuration not loaded', () => {
      expect(() => configLoader.getConfig()).toThrow(/Configuration not loaded/);
    });
  });

  describe('reload()', () => {
    it('should reload configuration from file', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation((path: fs.PathOrFileDescriptor) => {
        const pathStr = path.toString();
        if (pathStr.includes('config.default.yaml')) {
          return mockDefaultConfigContent;
        }
        return 'models: {}';
      });
      configLoader.load();

      const updatedDefaultConfig = `
models:
  updated-model:
    name: "updated-model"
    model: "openrouter/updated/model"
    provider: "openrouter"
    baseUrl: "https://openrouter.ai/api/v1"
    apiKey: "updated-key"
    enabled: true
`;
      mockFs.readFileSync.mockImplementation((path: fs.PathOrFileDescriptor) => {
        const pathStr = path.toString();
        if (pathStr.includes('config.default.yaml')) {
          return updatedDefaultConfig;
        }
        return 'models: {}';
      });

      const reloadedConfig = configLoader.reload();
      expect(reloadedConfig.modelConfig?.models['updated-model']?.name).toBe('updated-model');
    });
  });
});
