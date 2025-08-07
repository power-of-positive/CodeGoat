export interface ProxyConfig {
  proxy: {
    port: number;
    host: string;
  };
  routes: Route[];
  settings: {
    logging: {
      level: string;
      format: string;
    };
    timeout: {
      request: number;
      idle: number;
    };
    retries: {
      attempts: number;
      backoff: string;
    };
  };
  modelConfig?: ModelConfig;
}

export interface ModelConfigItem {
  name: string;
  model: string;
  provider: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
}

export interface ModelConfig {
  models: Record<string, ModelConfigItem>;
  settings?: {
    enablePreCallChecks?: boolean;
    cooldownTime?: number;
    retries?: number;
    allowedFails?: number;
  };
  fallbacks?: Record<string, string[]>;
}

export interface Route {
  name: string;
  match: {
    path: string;
    method: string | string[];
  };
  target: {
    url: string;
    rewritePath?: boolean;
    headers: {
      forward: string[];
      remove?: string[];
      add?: Record<string, string>;
    };
  };
  streaming: boolean;
}

export interface ProxyRequest {
  path: string;
  method: string;
  headers: Record<string, string | string[]>;
  body?: unknown;
  query?: Record<string, string>;
}
