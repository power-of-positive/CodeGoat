interface OpenRouterEndpoint {
  name?: string;
  provider?: string;
  context_length?: number;
  max_tokens?: number;
  uptime_30m?: number;
  pricing?: Record<string, string>;
  moderated?: boolean;
}

interface OpenRouterResponse {
  data?: {
    endpoints?: OpenRouterEndpoint[];
  };
}

export interface OpenRouterStats {
  modelSlug: string;
  endpoints: Array<{
    provider?: string;
    contextLength?: number;
    maxTokens?: number;
    uptime: number | null;
    pricing?: Record<string, string>;
    moderated: boolean;
  }>;
  averageUptime: number | null;
  providerCount: number;
  hasUptimeData: boolean;
}

export class OpenRouterService {
  private static readonly API_BASE_URL = 'https://openrouter.ai/api/v1';
  private static readonly TIMEOUT_MS = 10000;

  static cleanModelSlug(modelSlug: string): string {
    // Format: "openrouter/author/model-name" -> "author/model-name"
    return modelSlug.replace('openrouter/', '');
  }

  static async fetchModelEndpoints(cleanSlug: string): Promise<OpenRouterResponse> {
    const response = await fetch(`${this.API_BASE_URL}/models/${cleanSlug}/endpoints`, {
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(this.TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    return response.json() as Promise<OpenRouterResponse>;
  }

  static processEndpointsData(endpoints: OpenRouterEndpoint[], cleanSlug: string): OpenRouterStats {
    const hasUptimeData = endpoints.some(
      (ep: OpenRouterEndpoint) => ep.uptime_30m !== null && ep.uptime_30m !== undefined
    );

    const processedEndpoints = endpoints.map((endpoint: OpenRouterEndpoint) => ({
      provider: endpoint.name || endpoint.provider,
      contextLength: endpoint.context_length,
      maxTokens: endpoint.max_tokens,
      uptime:
        endpoint.uptime_30m !== null && endpoint.uptime_30m !== undefined
          ? endpoint.uptime_30m
          : null,
      pricing: endpoint.pricing,
      moderated: endpoint.moderated || false,
    }));

    const averageUptime = hasUptimeData
      ? endpoints.reduce((sum: number, ep: OpenRouterEndpoint) => sum + (ep.uptime_30m || 0), 0) /
        endpoints.length
      : null;

    return {
      modelSlug: cleanSlug,
      endpoints: processedEndpoints,
      averageUptime,
      providerCount: endpoints.length,
      hasUptimeData,
    };
  }

  static async getModelStats(modelSlug: string): Promise<OpenRouterStats> {
    const cleanSlug = this.cleanModelSlug(modelSlug);
    const openRouterData = await this.fetchModelEndpoints(cleanSlug);
    const endpoints = openRouterData.data?.endpoints || [];

    return this.processEndpointsData(endpoints, cleanSlug);
  }
}
