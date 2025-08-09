import { Request, Response } from 'express';
import { Route, ModelConfig } from './types';
import { ProxyHandler } from './proxy';
import { SettingsService } from './services/settings.service';
import { WinstonLogger } from './logger-winston';
import { ILogger } from './logger-interface';
import { InternalRoutes } from './utils/internal-routes';
import { ProxyRoutes } from './utils/proxy-routes';

export class ConfigurableProxyHandler extends ProxyHandler {
  private settingsService: SettingsService;
  private internalRoutes: InternalRoutes;
  private proxyRoutes: ProxyRoutes;
  protected logger!: ILogger;

  constructor(private config: ModelConfig) {
    // Create a logger instance
    const logger = new WinstonLogger({
      level: 'info',
      logsDir: './logs',
      enableConsole: true,
      enableFile: true,
      maxFiles: '10',
      maxSize: '10485760',
    });
    super(logger);
    this.settingsService = new SettingsService(logger);
    this.internalRoutes = new InternalRoutes(config);
    this.proxyRoutes = new ProxyRoutes(config, this.settingsService, logger);
  }

  async handleRequest(
    req: Request,
    res: Response,
    route: Route,
    rewrittenPath: string
  ): Promise<void> {
    if (route.target.url.startsWith('internal://')) {
      return this.handleInternalRoute(req, res, route);
    }

    if (route.target.url.startsWith('proxy://')) {
      return this.handleProxyRoute(req, res, route, rewrittenPath);
    }

    return super.handleRequest(req, res, route, rewrittenPath);
  }

  private async handleInternalRoute(req: Request, res: Response, route: Route): Promise<void> {
    const endpoint = route.target.url.replace('internal://', '');

    switch (endpoint) {
      case 'health':
        this.internalRoutes.handleHealthCheck(req, res);
        return;
      case 'models':
        this.internalRoutes.handleModelsList(req, res);
        return;
      default:
        res.status(404).json({ error: 'Internal endpoint not found' });
    }
  }

  private async handleProxyRoute(
    req: Request,
    res: Response,
    route: Route,
    _rewrittenPath: string
  ): Promise<void> {
    const endpoint = route.target.url.replace('proxy://', '');

    switch (endpoint) {
      case 'chat/completions':
        await this.proxyRoutes.handleChatCompletions(req, res);
        return;
      default:
        res.status(404).json({ error: 'Proxy endpoint not found' });
    }
  }
}
