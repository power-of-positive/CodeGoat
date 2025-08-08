import { ConfigLoader } from '../config';

export interface TestResult {
  modelId: string;
  status: 'healthy' | 'error' | 'untested';
  responseTime: number;
  error: string | null;
  testedAt: string;
  model: string;
}

export interface UIModelConfig {
  id: string;
  name: string;
  baseUrl: string;
  model: string;
  apiKey: string;
  provider: string;
  enabled: boolean;
  status: TestResult['status'];
  lastTested: string | null;
  responseTime: number | null;
}

export interface CreateModelRequest {
  name: string;
  baseUrl?: string;
  model: string;
  apiKey: string;
  provider: string;
  enabled?: boolean;
}

export class ModelService {
  private static testResults: Record<string, TestResult> = {};

  static createTestResult(
    modelId: string,
    model: string,
    status: TestResult['status'],
    responseTime: number,
    error: string | null = null
  ): TestResult {
    return {
      modelId,
      status,
      responseTime,
      error,
      testedAt: new Date().toISOString(),
      model,
    };
  }

  static async makeTestApiCall(model: {
    name: string;
    apiKey?: string;
  }): Promise<globalThis.Response> {
    const testPayload = {
      model: model.name,
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 1,
      temperature: 0.1,
    };

    return fetch('http://localhost:3000/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${model.apiKey || 'test-key'}`,
      },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(10000),
    });
  }

  static convertModelsToUIFormat(
    models: Array<{
      id: string;
      name: string;
      model: string;
      provider: string;
      baseUrl: string;
      apiKey: string;
      enabled: boolean;
      isDefault?: boolean;
    }>,
    testResults: Record<string, TestResult>
  ): UIModelConfig[] {
    return models.map(model => {
      const testResult = testResults[model.id];
      return {
        id: model.id,
        name: model.name,
        baseUrl: model.baseUrl,
        model: model.model,
        apiKey: '***', // Don't return actual API key
        provider: model.provider,
        enabled: model.enabled,
        status: testResult?.status || 'untested',
        lastTested: testResult?.testedAt || null,
        responseTime: testResult?.responseTime || null,
      };
    });
  }

  static async getAllModels(configLoader: ConfigLoader): Promise<UIModelConfig[]> {
    const allModels = configLoader.getAllModels();
    return this.convertModelsToUIFormat(allModels, this.testResults);
  }

  static async testModel(modelId: string, configLoader: ConfigLoader): Promise<TestResult> {
    const allModels = configLoader.getAllModels();
    const model = allModels.find(m => m.id === modelId);

    if (!model) {
      throw new Error('Model not found');
    }

    const startTime = Date.now();

    try {
      const testResponse = await this.makeTestApiCall(model);
      const responseTime = Date.now() - startTime;

      let result: TestResult;
      if (testResponse.ok) {
        result = this.createTestResult(modelId, model.model, 'healthy', responseTime);
      } else {
        const errorText = await testResponse.text();
        result = this.createTestResult(
          modelId,
          model.model,
          'error',
          responseTime,
          `HTTP ${testResponse.status}: ${errorText}`
        );
      }

      this.testResults[modelId] = result;
      return result;
    } catch (fetchError: unknown) {
      const responseTime = Date.now() - startTime;
      const error = fetchError instanceof Error ? fetchError.message : 'Connection failed';
      const result = this.createTestResult(
        modelId,
        model?.model || 'unknown',
        'error',
        responseTime,
        error
      );

      this.testResults[modelId] = result;
      return result;
    }
  }

  static createModelResponse(model: CreateModelRequest): UIModelConfig {
    const modelKey = model.name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    return {
      id: modelKey,
      name: model.name,
      baseUrl: model.baseUrl || 'https://openrouter.ai/api/v1',
      model: model.model,
      apiKey: '***', // Don't return the actual API key
      provider: model.provider,
      enabled: model.enabled !== undefined ? model.enabled : true,
      status: 'untested' as const,
      lastTested: null,
      responseTime: null,
    };
  }

  static validateModelRequest(body: CreateModelRequest): {
    isValid: boolean;
    errors?: Array<{ field: string; message: string }>;
  } {
    const { name, model, apiKey, provider } = body;
    const errors: Array<{ field: string; message: string }> = [];

    if (!name) errors.push({ field: 'name', message: 'Name is required' });
    if (!model) errors.push({ field: 'model', message: 'Model is required' });
    if (!apiKey) errors.push({ field: 'apiKey', message: 'API key is required' });
    if (!provider) errors.push({ field: 'provider', message: 'Provider is required' });

    if (errors.length > 0) {
      return { isValid: false, errors };
    }

    return { isValid: true };
  }
}
