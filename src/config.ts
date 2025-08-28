import * as fs from 'fs';
import * as yaml from 'yaml';
import * as path from 'path';
import { ProxyConfig, ModelConfig, ModelConfigItem } from './types';

export class ConfigLoader {
  private config: ProxyConfig | null = null;
  private defaultConfigPath: string;
  private userConfigPath: string;

  // Constants for configuration
  private static readonly DEFAULT_PORT = 3001;
  private static readonly DECIMAL_BASE = 10;
  private static readonly REQUEST_TIMEOUT_MS = 30000; // 30 seconds
  private static readonly IDLE_TIMEOUT_MS = 120000; // 2 minutes  
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly DEFAULT_HOST = '0.0.0.0';
  private static readonly DEFAULT_PROVIDER = 'openrouter';
  private static readonly MODEL_PREFIX_FALLBACK = 'model-';
  private static readonly MODEL_NAME_FALLBACK_PREFIX = 'Model ';

  constructor(configPath?: string) {
    const baseDir = process.cwd();
    this.defaultConfigPath = path.join(baseDir, 'config.default.yaml');
    this.userConfigPath = configPath ?? path.join(baseDir, 'config.user.yaml');
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
      let defaultConfig: ModelConfig = { models: {} };
      let userConfig: ModelConfig = { models: {} };

      // Load default config if it exists
      if (fs.existsSync(this.defaultConfigPath)) {
        const defaultContent = fs.readFileSync(this.defaultConfigPath, 'utf8');
        const parsedDefault = yaml.parse(defaultContent);
        defaultConfig = this.normalizeConfig(parsedDefault);
      }

      // Load user config if it exists
      if (fs.existsSync(this.userConfigPath)) {
        const userContent = fs.readFileSync(this.userConfigPath, 'utf8');
        const parsedUser = yaml.parse(userContent);
        userConfig = this.normalizeConfig(parsedUser);
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

  private normalizeConfig(config: Record<string, unknown>): ModelConfig {
    if ('model_list' in config && Array.isArray(config.model_list)) {
      return this.normalizeLegacyConfig(config);
    }
    return this.normalizeModernConfig(config);
  }

  /**
   * Convert a single legacy model config to ModelConfigItem
   */
  private convertLegacyModel(model: Record<string, unknown>, index: number): [string, ModelConfigItem] {
    const modelName = model.model_name as string | undefined;
    const modelKey = modelName?.replace(/[^a-zA-Z0-9-_]/g, '-') ?? `${ConfigLoader.MODEL_PREFIX_FALLBACK}${index}`;
    const litellmParams = (model.litellm_params as { model?: string; api_key?: string }) ?? {};
    
    const provider = this.extractProvider(litellmParams.model ?? '') ?? ConfigLoader.DEFAULT_PROVIDER;
    
    const modelConfigItem: ModelConfigItem = {
      name: (model.model_name as string) ?? `${ConfigLoader.MODEL_NAME_FALLBACK_PREFIX}${index + 1}`,
      model: litellmParams.model ?? '',
      provider,
      baseUrl: this.getProviderBaseUrl(provider),
      apiKey: litellmParams.api_key ?? '',
      enabled: true,
    };
    
    return [modelKey, modelConfigItem];
  }

  private normalizeLegacyConfig(config: Record<string, unknown>): ModelConfig {
    const models: Record<string, ModelConfigItem> = {};
    (config.model_list as Record<string, unknown>[]).forEach(
      (model: Record<string, unknown>, index: number) => {
        const [modelKey, modelConfigItem] = this.convertLegacyModel(model, index);
        models[modelKey] = modelConfigItem;
      }
    );

    return {
      models,
      settings: this.extractLegacySettings(config),
      fallbacks: this.normalizeFallbacks(
        (config.litellm_settings as { fallbacks?: unknown[] })?.fallbacks ?? []
      ),
    };
  }

  private extractLegacySettings(config: Record<string, unknown>): ModelConfig['settings'] {
    return {
      enablePreCallChecks: (config.router_settings as { enable_pre_call_checks?: boolean })
        ?.enable_pre_call_checks,
      cooldownTime: (config.litellm_settings as { cooldown_time?: number })?.cooldown_time,
      retries: (config.litellm_settings as { num_retries?: number })?.num_retries,
      allowedFails: (config.litellm_settings as { allowed_fails?: number })?.allowed_fails,
    };
  }

  private normalizeModernConfig(config: Record<string, unknown>): ModelConfig {
    const normalizedConfig = config as unknown as ModelConfig;
    if (normalizedConfig.models) {
      Object.entries(normalizedConfig.models).forEach(([key, model]) => {
        if (!model.baseUrl) {
          normalizedConfig.models[key] = {
            ...model,
            baseUrl: this.getProviderBaseUrl(model.provider),
          };
        }
      });
    }

    // Handle fallbacks in settings
    if (config.settings && (config.settings as { fallbacks?: unknown }).fallbacks) {
      normalizedConfig.fallbacks = (
        config.settings as { fallbacks: Record<string, string[]> }
      ).fallbacks;
    }

    return normalizedConfig;
  }

  private extractProvider(model: string): string {
    if (!model) {
      return ConfigLoader.DEFAULT_PROVIDER;
    }
    if (model.startsWith('openrouter/')) {
      return 'openrouter';
    }
    if (model.startsWith('openai/')) {
      return 'openai';
    }
    if (model.startsWith('anthropic/')) {
      return 'anthropic';
    }
    return 'other';
  }

  private getProviderBaseUrl(provider: string): string {
    const map = {
      openrouter: 'https://openrouter.ai/api/v1',
      openai: 'https://api.openai.com/v1',
      anthropic: 'https://api.anthropic.com/v1',
    };
    return map[provider as keyof typeof map] || '';
  }

  private normalizeFallbacks(fallbacks: unknown): Record<string, string[]> {
    if (!fallbacks || !Array.isArray(fallbacks)) {
      return {};
    }
    const normalized: Record<string, string[]> = {};
    (fallbacks as Record<string, string[]>[]).forEach((fallbackGroup: Record<string, string[]>) => {
      Object.keys(fallbackGroup).forEach((primaryModel: string) => {
        const modelKey = primaryModel.replace(/[^a-zA-Z0-9-_]/g, '-');
        normalized[modelKey] = fallbackGroup[primaryModel].map((model: string) =>
          model.replace(/[^a-zA-Z0-9-_]/g, '-')
        );
      });
    });
    return normalized;
  }

  private mergeConfigs(defaultConfig: ModelConfig, userConfig: ModelConfig): ModelConfig {
    return {
      models: { ...defaultConfig.models, ...userConfig.models },
      settings: { ...defaultConfig.settings, ...userConfig.settings },
      fallbacks: userConfig.fallbacks ?? defaultConfig.fallbacks ?? {},
    };
  }

  private convertToProxyConfig(modelConfig: ModelConfig): ProxyConfig {
    return {
      proxy: { port: parseInt(process.env.PORT ?? ConfigLoader.DEFAULT_PORT.toString(), ConfigLoader.DECIMAL_BASE), host: ConfigLoader.DEFAULT_HOST },
      routes: this.createDefaultRoutes(),
      settings: {
        logging: { level: 'info', format: 'json' },
        timeout: { request: ConfigLoader.REQUEST_TIMEOUT_MS, idle: ConfigLoader.IDLE_TIMEOUT_MS },
        retries: { attempts: ConfigLoader.MAX_RETRY_ATTEMPTS, backoff: 'exponential' },
      },
      modelConfig,
    };
  }

  private createDefaultRoutes(): ProxyConfig['routes'] {
    return [
      {
        name: 'Models List',
        match: { path: '/v1/models', method: 'GET' },
        target: { url: 'internal://models', headers: { forward: ['*'] } },
        streaming: false,
      },
      {
        name: 'Models List (Legacy)',
        match: { path: '/models', method: 'GET' },
        target: { url: 'internal://models', headers: { forward: ['*'] } },
        streaming: false,
      },
      {
        name: 'Models List (Double Slash)',
        match: { path: '//models', method: 'GET' },
        target: { url: 'internal://models', headers: { forward: ['*'] } },
        streaming: false,
      },
      {
        name: 'Chat Completions',
        match: { path: '/v1/chat/completions', method: 'POST' },
        target: { url: 'proxy://chat/completions', headers: { forward: ['*'] } },
        streaming: true,
      },
      {
        name: 'Chat Completions (Legacy)',
        match: { path: '/chat/completions', method: 'POST' },
        target: { url: 'proxy://chat/completions', headers: { forward: ['*'] } },
        streaming: true,
      },
      {
        name: 'Health Check',
        match: { path: '/health', method: 'GET' },
        target: { url: 'internal://health', headers: { forward: [] } },
        streaming: false,
      },
    ];
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
  addModel(modelData: {
    name: string;
    model: string;
    apiKey: string;
    provider: string;
    baseUrl?: string;
  }): void {
    try {
      const userConfig = this.loadUserConfig();
      const modelKey = modelData.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();

      userConfig.models[modelKey] = this.createModelConfigItem(modelData);
      this.saveUserConfig(userConfig);
      this.load();
    } catch (error) {
      throw new Error(
        `Failed to add model: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  updateModel(
    modelId: string,
    modelData: { name: string; model: string; apiKey: string; provider: string }
  ): void {
    try {
      const userConfig = this.loadUserConfig();

      if (!userConfig.models?.[modelId]) {
        throw new Error('Model not found in user configuration');
      }

      userConfig.models[modelId] = this.createModelConfigItem(modelData);
      this.saveUserConfig(userConfig);
      this.load();
    } catch (error) {
      throw new Error(
        `Failed to update model: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  deleteModel(modelId: string): void {
    try {
      const userConfig = this.loadUserConfig();

      if (!userConfig.models?.[modelId]) {
        throw new Error('Model not found in user configuration');
      }

      delete userConfig.models[modelId];
      this.saveUserConfig(userConfig);
      this.load();
    } catch (error) {
      throw new Error(
        `Failed to delete model: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  getAllModels(): Array<{
    id: string;
    name: string;
    model: string;
    provider: string;
    baseUrl: string;
    apiKey: string;
    enabled: boolean;
    isDefault: boolean;
  }> {
    const config = this.getConfig();
    if (!config.modelConfig?.models) {
      return [];
    }

    return Object.entries(config.modelConfig.models).map(([id, model]) => ({
      id,
      name: model.name,
      model: model.model,
      provider: model.provider,
      baseUrl: model.baseUrl,
      apiKey: model.apiKey,
      enabled: model.enabled,
      isDefault: this.isDefaultModel(id),
    }));
  }

  private isDefaultModel(modelId: string): boolean {
    if (!fs.existsSync(this.defaultConfigPath)) {
      return false;
    }

    const defaultContent = fs.readFileSync(this.defaultConfigPath, 'utf8');
    const defaultConfig = this.normalizeConfig(yaml.parse(defaultContent));

    return Object.keys(defaultConfig.models || {}).includes(modelId);
  }

  private loadUserConfig(): ModelConfig {
    let userConfig: ModelConfig = { models: {} };
    if (fs.existsSync(this.userConfigPath)) {
      const userContent = fs.readFileSync(this.userConfigPath, 'utf8');
      userConfig = this.normalizeConfig(yaml.parse(userContent));
    }
    if (!userConfig.models) {
      userConfig.models = {};
    }
    return userConfig;
  }

  private saveUserConfig(userConfig: ModelConfig): void {
    fs.writeFileSync(
      this.userConfigPath,
      yaml.stringify(userConfig, { indent: 2, lineWidth: 0 }),
      'utf8'
    );
  }

  private createModelConfigItem(modelData: {
    name: string;
    model: string;
    apiKey: string;
    provider: string;
    baseUrl?: string;
  }): ModelConfigItem {
    return {
      name: modelData.name,
      model: modelData.model,
      provider: modelData.provider,
      baseUrl: modelData.baseUrl ?? this.getProviderBaseUrl(modelData.provider),
      apiKey: modelData.apiKey.startsWith('os.environ/')
        ? modelData.apiKey
        : `os.environ/${modelData.apiKey.toUpperCase().replace(/[^A-Z0-9_]/g, '_')}_API_KEY`,
      enabled: true,
    };
  }
}
