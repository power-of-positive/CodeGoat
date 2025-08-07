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

export interface ModelConfig {
  model_list: Array<{
    model_name: string;
    litellm_params: {
      model: string;
      api_key: string;
    };
  }>;
  router_settings?: {
    enable_pre_call_checks?: boolean;
  };
  litellm_settings?: {
    cooldown_time?: number;
    num_retries?: number;
    allowed_fails?: number;
    fallbacks?: any[];
  };
  general_settings?: {
    master_key?: string;
    database_url?: string;
    store_model_in_db?: boolean;
    store_prompts_in_spend_logs?: boolean;
  };
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
  body?: any;
  query?: Record<string, string>;
}