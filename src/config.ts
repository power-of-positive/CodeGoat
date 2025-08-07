import * as fs from 'fs';
import * as yaml from 'yaml';
import * as path from 'path';
import { ProxyConfig, ModelConfig } from './types';

export class ConfigLoader {
  private config: ProxyConfig | null = null;
  private defaultConfigPath: string;
  private userConfigPath: string;

  constructor(configPath?: string) {
    const baseDir = process.cwd();
    this.defaultConfigPath = path.join(baseDir, 'config.default.yaml');
    this.userConfigPath = configPath || path.join(baseDir, 'config.user.yaml');

    // Fallback to original config.yaml if user doesn't specify
    if (
      !configPath &&
      fs.existsSync(path.join(baseDir, 'config.yaml')) &&
      !fs.existsSync(this.userConfigPath)
    ) {
      this.userConfigPath = path.join(baseDir, 'config.yaml');
    }
  }

  load(): ProxyConfig {
    try {
      let defaultConfig: ModelConfig = { model_list: [] };
      let userConfig: ModelConfig = { model_list: [] };

      // Load default config if it exists
      if (fs.existsSync(this.defaultConfigPath)) {
        const defaultContent = fs.readFileSync(this.defaultConfigPath, 'utf8');
        defaultConfig = yaml.parse(defaultContent) as ModelConfig;
      }

      // Load user config if it exists
      if (fs.existsSync(this.userConfigPath)) {
        const userContent = fs.readFileSync(this.userConfigPath, 'utf8');
        userConfig = yaml.parse(userContent) as ModelConfig;
      }

      // Merge configs: user config overrides default config
      const mergedConfig = this.mergeConfigs(defaultConfig, userConfig);

      this.config = this.convertToProxyConfig(mergedConfig);
      this.validateConfig();
      return this.config;
    } catch (error) {
      throw new Error(
        `Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private mergeConfigs(defaultConfig: ModelConfig, userConfig: ModelConfig): ModelConfig {
    // Deep merge logic: user config overrides default config
    const merged: ModelConfig = {
      model_list: [...(defaultConfig.model_list || []), ...(userConfig.model_list || [])],
      router_settings: {
        ...defaultConfig.router_settings,
        ...userConfig.router_settings,
      },
      litellm_settings: {
        ...defaultConfig.litellm_settings,
        ...userConfig.litellm_settings,
        fallbacks:
          userConfig.litellm_settings?.fallbacks || defaultConfig.litellm_settings?.fallbacks,
      },
      general_settings: {
        ...defaultConfig.general_settings,
        ...userConfig.general_settings,
      },
    };

    return merged;
  }

  private convertToProxyConfig(modelConfig: ModelConfig): ProxyConfig {
    const routes = [
      {
        name: 'Models List',
        match: { path: '/v1/models', method: 'GET' },
        target: {
          url: 'internal://models',
          headers: { forward: ['*'] },
        },
        streaming: false,
      },
      {
        name: 'Models List (Legacy)',
        match: { path: '/models', method: 'GET' },
        target: {
          url: 'internal://models',
          headers: { forward: ['*'] },
        },
        streaming: false,
      },
      {
        name: 'Models List (Double Slash)',
        match: { path: '//models', method: 'GET' },
        target: {
          url: 'internal://models',
          headers: { forward: ['*'] },
        },
        streaming: false,
      },
      {
        name: 'Chat Completions',
        match: { path: '/v1/chat/completions', method: 'POST' },
        target: {
          url: 'proxy://chat/completions',
          headers: { forward: ['*'] },
        },
        streaming: true,
      },
      {
        name: 'Chat Completions (Legacy)',
        match: { path: '/chat/completions', method: 'POST' },
        target: {
          url: 'proxy://chat/completions',
          headers: { forward: ['*'] },
        },
        streaming: true,
      },
      {
        name: 'Health Check',
        match: { path: '/health', method: 'GET' },
        target: {
          url: 'internal://health',
          headers: { forward: [] },
        },
        streaming: false,
      },
    ];

    return {
      proxy: { port: 3000, host: '0.0.0.0' },
      routes,
      settings: {
        logging: { level: 'info', format: 'json' },
        timeout: { request: 30000, idle: 120000 },
        retries: { attempts: 3, backoff: 'exponential' },
      },
      modelConfig,
    };
  }

  private validateConfig(): void {
    if (!this.config) {
      throw new Error('Configuration is empty');
    }

    if (!this.config.proxy || typeof this.config.proxy.port !== 'number') {
      throw new Error('Invalid proxy configuration: port is required');
    }

    if (!Array.isArray(this.config.routes) || this.config.routes.length === 0) {
      throw new Error('No routes defined in configuration');
    }

    this.config.routes.forEach((route, index) => {
      if (!route.name || !route.match || !route.target) {
        throw new Error(`Invalid route configuration at index ${index}`);
      }

      if (!route.match.path || !route.match.method) {
        throw new Error(`Route ${route.name}: path and method are required`);
      }

      if (!route.target.url) {
        throw new Error(`Route ${route.name}: target URL is required`);
      }
    });
  }

  getConfig(): ProxyConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return this.config;
  }

  reload(): ProxyConfig {
    return this.load();
  }

  // Methods for modifying the config file
  addModel(modelData: { name: string; model: string; apiKey: string; provider: string }): void {
    try {
      let userConfig: ModelConfig = { model_list: [] };

      // Load existing user config if it exists
      if (fs.existsSync(this.userConfigPath)) {
        const userContent = fs.readFileSync(this.userConfigPath, 'utf8');
        userConfig = (yaml.parse(userContent) as ModelConfig) || { model_list: [] };
      }

      // Ensure model_list exists
      if (!userConfig.model_list) {
        userConfig.model_list = [];
      }

      // Create new model entry
      const newModel = {
        model_name: modelData.name,
        litellm_params: {
          model: modelData.model,
          api_key: modelData.apiKey.startsWith('os.environ/')
            ? modelData.apiKey
            : `os.environ/${modelData.apiKey.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}_API_KEY`,
        },
      };

      // Add to model list
      userConfig.model_list.push(newModel);

      // Write back to user config file
      const yamlString = yaml.stringify(userConfig, {
        indent: 2,
        lineWidth: 0, // Prevent line wrapping
      });
      fs.writeFileSync(this.userConfigPath, yamlString, 'utf8');

      // Reload config
      this.load();
    } catch (error) {
      throw new Error(
        `Failed to add model: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  updateModel(
    modelIndex: number,
    modelData: {
      name: string;
      model: string;
      apiKey: string;
      provider: string;
    }
  ): void {
    try {
      // Check if this is a default model or user model
      const { userModelIndex } = this.getModelLocation(modelIndex);

      if (userModelIndex === -1) {
        throw new Error('Cannot update default models. Please create a new model instead.');
      }

      let userConfig: ModelConfig = { model_list: [] };

      // Load existing user config
      if (fs.existsSync(this.userConfigPath)) {
        const userContent = fs.readFileSync(this.userConfigPath, 'utf8');
        userConfig = (yaml.parse(userContent) as ModelConfig) || { model_list: [] };
      }

      if (!userConfig.model_list || !userConfig.model_list[userModelIndex]) {
        throw new Error('Model not found in user configuration');
      }

      // Update model entry
      userConfig.model_list[userModelIndex] = {
        model_name: modelData.name,
        litellm_params: {
          model: modelData.model,
          api_key: modelData.apiKey.startsWith('os.environ/')
            ? modelData.apiKey
            : `os.environ/${modelData.apiKey.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}_API_KEY`,
        },
      };

      // Write back to user config file
      const yamlString = yaml.stringify(userConfig, {
        indent: 2,
        lineWidth: 0,
      });
      fs.writeFileSync(this.userConfigPath, yamlString, 'utf8');

      // Reload config
      this.load();
    } catch (error) {
      throw new Error(
        `Failed to update model: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  deleteModel(modelIndex: number): void {
    try {
      // Check if this is a default model or user model
      const { userModelIndex } = this.getModelLocation(modelIndex);

      if (userModelIndex === -1) {
        throw new Error('Cannot delete default models');
      }

      let userConfig: ModelConfig = { model_list: [] };

      // Load existing user config
      if (fs.existsSync(this.userConfigPath)) {
        const userContent = fs.readFileSync(this.userConfigPath, 'utf8');
        userConfig = (yaml.parse(userContent) as ModelConfig) || { model_list: [] };
      }

      if (!userConfig.model_list || !userConfig.model_list[userModelIndex]) {
        throw new Error('Model not found in user configuration');
      }

      // Remove model from user config
      userConfig.model_list.splice(userModelIndex, 1);

      // Write back to user config file
      const yamlString = yaml.stringify(userConfig, {
        indent: 2,
        lineWidth: 0,
      });
      fs.writeFileSync(this.userConfigPath, yamlString, 'utf8');

      // Reload config
      this.load();
    } catch (error) {
      throw new Error(
        `Failed to delete model: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  private getModelLocation(globalIndex: number): {
    defaultModelsCount: number;
    userModelIndex: number;
  } {
    let defaultModelsCount = 0;

    // Count default models
    if (fs.existsSync(this.defaultConfigPath)) {
      const defaultContent = fs.readFileSync(this.defaultConfigPath, 'utf8');
      const defaultConfig = yaml.parse(defaultContent) as ModelConfig;
      defaultModelsCount = defaultConfig.model_list?.length || 0;
    }

    // Calculate user model index
    const userModelIndex = globalIndex - defaultModelsCount;

    return {
      defaultModelsCount,
      userModelIndex: userModelIndex >= 0 ? userModelIndex : -1,
    };
  }
}
