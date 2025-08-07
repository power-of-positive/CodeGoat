import * as fs from 'fs';
import * as yaml from 'yaml';
import * as path from 'path';
import { ProxyConfig, ModelConfig } from './types';

export class ConfigLoader {
  private config: ProxyConfig | null = null;
  private configPath: string;

  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'config.yaml');
  }

  load(): ProxyConfig {
    try {
      const fileContent = fs.readFileSync(this.configPath, 'utf8');
      const modelConfig = yaml.parse(fileContent) as ModelConfig;
      this.config = this.convertToProxyConfig(modelConfig);
      this.validateConfig();
      return this.config;
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private convertToProxyConfig(modelConfig: ModelConfig): ProxyConfig {
    const routes = [
      {
        name: "Models List",
        match: { path: "/v1/models", method: "GET" },
        target: { 
          url: "internal://models",
          headers: { forward: ["*"] }
        },
        streaming: false
      },
      {
        name: "Models List (Legacy)",
        match: { path: "/models", method: "GET" },
        target: { 
          url: "internal://models",
          headers: { forward: ["*"] }
        },
        streaming: false
      },
      {
        name: "Models List (Double Slash)",
        match: { path: "//models", method: "GET" },
        target: { 
          url: "internal://models",
          headers: { forward: ["*"] }
        },
        streaming: false
      },
      {
        name: "Chat Completions", 
        match: { path: "/v1/chat/completions", method: "POST" },
        target: {
          url: "proxy://chat/completions",
          headers: { forward: ["*"] }
        },
        streaming: true
      },
      {
        name: "Chat Completions (Legacy)",
        match: { path: "/chat/completions", method: "POST" },
        target: {
          url: "proxy://chat/completions",
          headers: { forward: ["*"] }
        },
        streaming: true
      },
      {
        name: "Health Check",
        match: { path: "/health", method: "GET" },
        target: {
          url: "internal://health", 
          headers: { forward: [] }
        },
        streaming: false
      }
    ];

    return {
      proxy: { port: 3000, host: "0.0.0.0" },
      routes,
      settings: {
        logging: { level: "info", format: "json" },
        timeout: { request: 30000, idle: 120000 },
        retries: { attempts: 3, backoff: "exponential" }
      },
      modelConfig
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
}