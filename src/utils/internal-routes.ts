/**
 * Internal route handlers for health checks and model listings
 */

import { Request, Response } from 'express';
import { ModelConfig } from '../types';

export class InternalRoutes {
  constructor(private config: ModelConfig) {}

  handleHealthCheck(_req: Request, res: Response): void {
    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      models: Object.keys(this.config.models || {}).length,
    });
  }

  handleModelsList(_req: Request, res: Response): void {
    if (!this.config.models) {
      res.json({ object: 'list', data: [] });
      return;
    }

    const models = Object.entries(this.config.models)
      .filter(([_, model]) => model.enabled)
      .map(([_id, model]) => ({
        id: model.name,
        object: 'model',
        created: Date.now(),
        owned_by: 'proxy-server',
      }));

    res.json({ object: 'list', data: models });
  }
}
