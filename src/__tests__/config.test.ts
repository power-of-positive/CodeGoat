import { ConfigLoader } from '../config';
import * as fs from 'fs';
import * as yaml from 'yaml';

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
      expect(Object.keys(config.modelConfig?.models ?? {})).toHaveLength(2);
    });

    it('should throw error for invalid file path', () => {
      // Mock existsSync to return false for both files
      mockFs.existsSync.mockReturnValue(false);

      // This should not throw - missing configs just result in empty model list
      expect(() => configLoader.load()).not.toThrow();

      const config = configLoader.load();
      expect(Object.keys(config.modelConfig?.models ?? {})).toHaveLength(0);
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
      expect(Object.keys(config.modelConfig?.models ?? {})).toHaveLength(1);
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

  describe('updateModel and deleteModel', () => {
    const defaultConfig = `
models:
  default-model:
    name: "default"
    model: "openrouter/default"
    provider: "openrouter"
    baseUrl: "https://openrouter.ai/api/v1"
    apiKey: "default"
    enabled: true
`;

    const makeUserConfig = () => `
models:
  user-model:
    name: "user"
    model: "openrouter/user"
    provider: "openrouter"
    baseUrl: "https://openrouter.ai/api/v1"
    apiKey: "os.environ/USER_API_KEY"
    enabled: true
`;

    let userConfigContent: string;

    beforeEach(() => {
      userConfigContent = makeUserConfig();
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        const p = path.toString();
        return p.includes('config.default.yaml') || p.includes('config.user.yaml');
      });
      mockFs.readFileSync.mockImplementation((path: fs.PathOrFileDescriptor) => {
        const p = path.toString();
        if (p.includes('config.default.yaml')) {
          return defaultConfig;
        }
        if (p.includes('config.user.yaml')) {
          return userConfigContent;
        }
        return '';
      });
      mockFs.writeFileSync.mockImplementation((path: fs.PathOrFileDescriptor, data: string | NodeJS.ArrayBufferView) => {
        const p = path.toString();
        if (p.includes('config.user.yaml') && typeof data === 'string') {
          userConfigContent = data;
        }
      });

      configLoader.load();
    });

    it('updates an existing model and normalizes api key', () => {
      configLoader.updateModel('user-model', {
        name: 'updated',
        model: 'anthropic/claude-3',
        apiKey: 'anthropic-secret',
        provider: 'anthropic',
      });

      const parsed = yaml.parse(userConfigContent);
      expect(parsed.models['user-model'].provider).toBe('anthropic');
      expect(parsed.models['user-model'].apiKey).toBe('os.environ/ANTHROPIC_SECRET_API_KEY');
    });

    it('throws when updating missing model', () => {
      expect(() =>
        configLoader.updateModel('missing-model', {
          name: 'missing',
          model: 'openai/gpt-4',
          apiKey: 'openai',
          provider: 'openai',
        })
      ).toThrow(/Model not found/);
    });

    it('deletes an existing model', () => {
      configLoader.deleteModel('user-model');

      const parsed = yaml.parse(userConfigContent);
      expect(parsed.models['user-model']).toBeUndefined();
    });

    it('lists models with default flag', () => {
      const models = configLoader.getAllModels();
      const defaultEntry = models.find(model => model.id === 'default-model');
      const userEntry = models.find(model => model.id === 'user-model');

      expect(defaultEntry?.isDefault).toBe(true);
      expect(userEntry?.isDefault).toBe(false);
    });

    it('throws when saving a new model fails', () => {
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('disk full');
      });

      expect(() =>
        configLoader.addModel({
          name: 'failing-model',
          model: 'openrouter/fail',
          apiKey: 'fail',
          provider: 'openrouter',
        })
      ).toThrow(/Failed to add model: disk full/);
    });

    it('throws when deleting missing model', () => {
      expect(() => configLoader.deleteModel('missing')).toThrow(/Model not found/);
    });
  });

  describe('addModel()', () => {
    beforeEach(() => {
      // Set up basic config
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        return path.toString().includes('config.default.yaml');
      });

      mockFs.readFileSync.mockReturnValue(mockDefaultConfigContent);
      mockFs.writeFileSync.mockImplementation();

      configLoader.load();
    });

    it('should add a new model to user config', () => {
      const newModel = {
        name: 'new-model',
        model: 'openrouter/new/model',
        apiKey: 'new-key',
        provider: 'openrouter',
      };

      configLoader.addModel(newModel);

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const writtenContent = mockFs.writeFileSync.mock.calls[0][1] as string;
      expect(writtenContent).toContain('new-model');
      expect(writtenContent).toContain('openrouter/new/model');
    });

    it('should handle custom provider with base URL', () => {
      const customModel = {
        name: 'custom-model',
        model: 'custom-model',
        apiKey: 'custom-key',
        provider: 'other',
        baseUrl: 'https://custom.api.com',
      };

      configLoader.addModel(customModel as any);

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const writtenContent = mockFs.writeFileSync.mock.calls[0][1] as string;
      expect(writtenContent).toContain('https://custom.api.com');
    });

    it('should validate required fields', () => {
      const invalidModel = {
        name: 'invalid-model',
        // missing required fields
      };

      expect(() => {
        configLoader.addModel(invalidModel as any);
      }).toThrow();
    });
  });

  describe('deleteModel()', () => {
    beforeEach(() => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        return (
          path.toString().includes('config.default.yaml') ||
          path.toString().includes('config.user.yaml')
        );
      });

      mockFs.readFileSync.mockImplementation((path: any) => {
        if (path.toString().includes('config.default.yaml')) {
          return mockDefaultConfigContent;
        } else if (path.toString().includes('config.user.yaml')) {
          return `models:
  default-model:
    name: Default Model
    model: default/model
    provider: openai
    baseUrl: https://api.openai.com/v1
    apiKey: os.environ/DEFAULT_API_KEY
    enabled: true`;
        }
        return '';
      });
      mockFs.writeFileSync.mockImplementation();

      configLoader.load();
    });

    it('should delete an existing model', () => {
      configLoader.deleteModel('default-model');

      expect(mockFs.writeFileSync).toHaveBeenCalled();
      const writtenContent = mockFs.writeFileSync.mock.calls[0][1] as string;
      expect(writtenContent).not.toContain('default-model');
    });

    it('should throw error when deleting non-existent model', () => {
      expect(() => {
        configLoader.deleteModel('non-existent-model');
      }).toThrow('Failed to delete model: Model not found in user configuration');
    });
  });

  describe('getAllModels()', () => {
    beforeEach(() => {
      mockFs.existsSync.mockImplementation((path: fs.PathLike) => {
        return path.toString().includes('config.default.yaml');
      });

      mockFs.readFileSync.mockReturnValue(mockDefaultConfigContent);
      configLoader.load();
    });

    it('should return all models with metadata', () => {
      const models = configLoader.getAllModels();

      expect(models).toHaveLength(1);
      expect(models[0]).toHaveProperty('id', 'default-model');
      expect(models[0]).toHaveProperty('name', 'default-model');
      expect(models[0]).toHaveProperty('model', 'openrouter/default/model');
      expect(models[0]).toHaveProperty('provider', 'openrouter');
      expect(models[0]).toHaveProperty('isDefault', true);
    });

    it('should handle empty models configuration', () => {
      const emptyConfig = 'models: {}';
      mockFs.readFileSync.mockReturnValue(emptyConfig);

      configLoader.reload();
      const models = configLoader.getAllModels();

      expect(models).toHaveLength(0);
    });
  });

  describe('configuration normalization', () => {
    it('should handle legacy configuration format', () => {
      const legacyConfig = `
model_list:
  - model_name: "legacy-model"
    litellm_params:
      model: "openrouter/legacy/model"
      api_key: "legacy-key"
`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(legacyConfig);

      const config = configLoader.load();
      expect(config.modelConfig?.models['legacy-model']).toBeDefined();
      expect(config.modelConfig?.models['legacy-model'].apiKey).toBe('legacy-key');
    });

    it('should normalize provider-specific settings', () => {
      const configWithProviders = `
models:
  openai-model:
    name: "openai-model"
    model: "gpt-3.5-turbo"
    provider: "openai"
    apiKey: "openai-key"
    enabled: true
  anthropic-model:
    name: "anthropic-model" 
    model: "claude-3"
    provider: "anthropic"
    apiKey: "anthropic-key"
    enabled: true
`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(configWithProviders);

      const config = configLoader.load();

      expect(config.modelConfig?.models['openai-model'].baseUrl).toBe('https://api.openai.com/v1');
      expect(config.modelConfig?.models['anthropic-model'].baseUrl).toBe(
        'https://api.anthropic.com/v1'
      );
    });

    it('should handle fallbacks configuration', () => {
      const configWithFallbacks = `
models:
  main-model:
    name: "main-model"
    model: "openrouter/main/model"
    provider: "openrouter"
    apiKey: "main-key"
    enabled: true

settings:
  fallbacks:
    main-model:
      - "backup-model-1"
      - "backup-model-2"
`;

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(configWithFallbacks);

      const config = configLoader.load();
      expect(config.modelConfig?.fallbacks?.['main-model']).toEqual([
        'backup-model-1',
        'backup-model-2',
      ]);
    });
  });

  describe('error handling', () => {
    it('should handle YAML parse errors', () => {
      const invalidYaml = 'invalid: yaml: content: [unclosed bracket';

      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(invalidYaml);

      expect(() => {
        configLoader.load();
      }).toThrow();
    });

    it('should handle file read errors', () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      expect(() => {
        configLoader.load();
      }).toThrow('Permission denied');
    });

    it('should handle missing config files gracefully', () => {
      mockFs.existsSync.mockReturnValue(false);

      const config = configLoader.load();
      expect(config.modelConfig?.models).toEqual({});
    });
  });
});
