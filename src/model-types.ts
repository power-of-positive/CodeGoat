export interface LiteLLMConfig {
  model_list: ModelConfig[];
  router_settings?: {
    enable_pre_call_checks?: boolean;
  };
  litellm_settings?: {
    cooldown_time?: number;
    num_retries?: number;
    allowed_fails?: number;
    fallbacks?: FallbackConfig[];
  };
  general_settings?: {
    master_key?: string;
    database_url?: string;
    store_model_in_db?: boolean;
    store_prompts_in_spend_logs?: boolean;
  };
}

export interface ModelConfig {
  model_name: string;
  litellm_params: {
    model: string;
    api_key: string;
    api_base?: string;
    custom_llm_provider?: string;
  };
}

export interface FallbackConfig {
  [key: string]: string[];
}

export interface LiteLLMRequest {
  model: string;
  messages: Message[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  [key: string]: any;
}

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ModelStatus {
  lastFailure?: Date;
  failureCount: number;
  isAvailable: boolean;
}