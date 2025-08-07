import * as fs from 'fs';
import * as yaml from 'yaml';
import * as path from 'path';
import { LiteLLMConfig, ModelConfig } from './litellm-types';

export class LiteLLMConfigLoader {
  private config: LiteLLMConfig | null = null;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'config.yaml');
  }

  load(): LiteLLMConfig {
    try {
      const fileContent = fs.readFileSync(this.configPath, 'utf8');
      const rawConfig = yaml.parse(fileContent);
      this.config = this.processConfig(rawConfig);
      this.validateConfig();
      return this.config;
    } catch (error) {
      throw new Error(`Failed to load LiteLLM configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private processConfig(rawConfig: any): LiteLLMConfig {
    // Process environment variables in the config
    const processedConfig = JSON.parse(
      JSON.stringify(rawConfig, (key, value) => {
        if (typeof value === 'string' && value.startsWith('os.environ/')) {
          const envVar = value.replace('os.environ/', '');
          return process.env[envVar] || value;
        }
        return value;
      })
    );

    return processedConfig as LiteLLMConfig;
  }

  private validateConfig(): void {
    if (!this.config) {
      throw new Error('Configuration is empty');
    }

    if (!Array.isArray(this.config.model_list) || this.config.model_list.length === 0) {
      throw new Error('No models defined in configuration');
    }

    this.config.model_list.forEach((model, index) => {
      if (!model.model_name || !model.litellm_params) {
        throw new Error(`Invalid model configuration at index ${index}`);
      }
      
      if (!model.litellm_params.model || !model.litellm_params.api_key) {
        throw new Error(`Model ${model.model_name}: model and api_key are required`);
      }
    });
  }

  getConfig(): LiteLLMConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call load() first.');
    }
    return this.config;
  }

  getModelConfig(modelName: string): ModelConfig | undefined {
    return this.config?.model_list.find(m => m.model_name === modelName);
  }

  getFallbacks(modelName: string): string[] {
    if (!this.config?.litellm_settings?.fallbacks) {
      return [];
    }

    for (const fallbackConfig of this.config.litellm_settings.fallbacks) {
      if (fallbackConfig[modelName]) {
        return fallbackConfig[modelName];
      }
    }

    return [];
  }

  reload(): LiteLLMConfig {
    return this.load();
  }
}