/**
 * Handles validation and model lookup for chat completion requests
 */

import { Response } from 'express';
import { ModelConfig } from '../types';

export class ChatRequestValidator {
  constructor(private config: ModelConfig) {}

  /**
   * Validates that the chat request has a required model parameter
   * @param requestedModel - The model name from the request
   * @param res - Express response object
   * @returns true if validation failed (error was sent), false if validation passed
   */
  validateChatRequest(requestedModel: string, res: Response): boolean {
    if (!requestedModel) {
      res.status(400).json({
        error: { message: 'Model parameter is required', type: 'invalid_request_error' },
      });
      return true;
    }
    return false;
  }

  /**
   * Finds the model configuration entry for the requested model
   * @param requestedModel - The model name to find
   * @param res - Express response object
   * @returns Model entry tuple [id, config] or null if not found
   */
  findModelEntry(requestedModel: string, res: Response): [string, unknown] | null {
    const modelEntry = Object.entries(this.config.models || {}).find(
      ([_, model]) => {
        const modelConfig = model as { name: string; enabled: boolean };
        return modelConfig.name === requestedModel && modelConfig.enabled;
      }
    );

    if (!modelEntry) {
      res.status(400).json({
        error: { message: `Model ${requestedModel} not found`, type: 'invalid_request_error' },
      });
      return null;
    }
    return modelEntry as [string, unknown];
  }
}