import { LiteLLMConfigLoader } from './litellm-config';
import { ModelStatus, LiteLLMRequest, ModelConfig } from './litellm-types';

export class LiteLLMRouter {
  private configLoader: LiteLLMConfigLoader;
  private modelStatus: Map<string, ModelStatus> = new Map();
  
  constructor(configLoader: LiteLLMConfigLoader) {
    this.configLoader = configLoader;
    this.initializeModelStatus();
  }

  private initializeModelStatus(): void {
    const config = this.configLoader.getConfig();
    config.model_list.forEach(model => {
      this.modelStatus.set(model.model_name, {
        failureCount: 0,
        isAvailable: true
      });
    });
  }

  selectModel(requestedModel: string): ModelConfig | null {
    const config = this.configLoader.getConfig();
    
    // Check if requested model is available
    const modelConfig = this.configLoader.getModelConfig(requestedModel);
    if (modelConfig && this.isModelAvailable(requestedModel)) {
      return modelConfig;
    }

    // Try fallback models
    const fallbacks = this.configLoader.getFallbacks(requestedModel);
    for (const fallbackModel of fallbacks) {
      const fallbackConfig = this.configLoader.getModelConfig(fallbackModel);
      if (fallbackConfig && this.isModelAvailable(fallbackModel)) {
        console.log(`Using fallback model ${fallbackModel} for ${requestedModel}`);
        return fallbackConfig;
      }
    }

    return null;
  }

  private isModelAvailable(modelName: string): boolean {
    const status = this.modelStatus.get(modelName);
    if (!status) return false;

    const config = this.configLoader.getConfig();
    const settings = config.litellm_settings;
    
    // Check if model is in cooldown
    if (status.lastFailure && settings?.cooldown_time) {
      const cooldownMs = settings.cooldown_time * 1000;
      const timeSinceFailure = Date.now() - status.lastFailure.getTime();
      if (timeSinceFailure < cooldownMs) {
        return false;
      }
    }

    // Check if model has exceeded allowed failures
    if (settings?.allowed_fails && status.failureCount >= settings.allowed_fails) {
      return false;
    }

    return status.isAvailable;
  }

  markModelFailure(modelName: string): void {
    const status = this.modelStatus.get(modelName);
    if (status) {
      status.failureCount++;
      status.lastFailure = new Date();
      
      const config = this.configLoader.getConfig();
      if (config.litellm_settings?.allowed_fails && 
          status.failureCount >= config.litellm_settings.allowed_fails) {
        status.isAvailable = false;
        console.log(`Model ${modelName} marked as unavailable after ${status.failureCount} failures`);
      }
    }
  }

  markModelSuccess(modelName: string): void {
    const status = this.modelStatus.get(modelName);
    if (status) {
      status.failureCount = 0;
      status.lastFailure = undefined;
      status.isAvailable = true;
    }
  }

  resetModelStatus(modelName: string): void {
    const status = this.modelStatus.get(modelName);
    if (status) {
      status.failureCount = 0;
      status.lastFailure = undefined;
      status.isAvailable = true;
    }
  }

  extractProviderUrl(model: string): string {
    // Extract provider from model string (e.g., "openrouter/moonshotai/kimi-k2:free")
    if (model.startsWith('openrouter/')) {
      return 'https://openrouter.ai/api/v1';
    } else if (model.startsWith('openai/')) {
      return 'https://api.openai.com/v1';
    } else if (model.startsWith('anthropic/')) {
      return 'https://api.anthropic.com/v1';
    }
    
    // Default to OpenAI format
    return 'https://api.openai.com/v1';
  }

  transformRequestForProvider(request: LiteLLMRequest, modelConfig: ModelConfig): any {
    const provider = this.getProvider(modelConfig.litellm_params.model);
    
    // For OpenRouter, we need to adjust the model name
    if (provider === 'openrouter') {
      const modelName = modelConfig.litellm_params.model.replace('openrouter/', '');
      return {
        ...request,
        model: modelName
      };
    }
    
    return request;
  }

  private getProvider(model: string): string {
    if (model.startsWith('openrouter/')) return 'openrouter';
    if (model.startsWith('openai/')) return 'openai';
    if (model.startsWith('anthropic/')) return 'anthropic';
    return 'openai'; // default
  }
}