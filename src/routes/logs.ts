import { Router, Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { ILogger } from '../logger-interface';
import { LogsService } from '../services/logs.service';
import { SettingsService } from '../services/settings.service';

interface HandlerContext {
  logsService: LogsService;
  settingsService?: SettingsService;
  logger: ILogger;
}

// Request logs handlers
async function handleGetRequestLogs(
  context: HandlerContext,
  req: ExpressRequest,
  res: ExpressResponse
): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await context.logsService.getRequestLogs({ limit, offset });
    res.json(result);
  } catch (error) {
    context.logger.error('Failed to read logs', error as Error);
    res.status(500).json({ error: 'Failed to load request logs' });
  }
}

// Chat completion logs handlers (for UI display)
async function handleGetChatCompletionLogs(
  context: HandlerContext,
  req: ExpressRequest,
  res: ExpressResponse
): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await context.logsService.getChatCompletionLogs({ limit, offset });
    res.json(result);
  } catch (error) {
    context.logger.error('Failed to read chat completion logs', error as Error);
    res.status(500).json({ error: 'Failed to load chat completion logs' });
  }
}

// Detailed log entry handlers
async function handleGetLogEntry(
  context: HandlerContext,
  req: ExpressRequest,
  res: ExpressResponse
): Promise<void> {
  try {
    const { timestamp } = req.params;
    const logEntry = await context.logsService.getLogEntry(timestamp);

    if (logEntry) {
      res.json(logEntry);
    } else {
      res.status(404).json({ error: 'Log entry not found' });
    }
  } catch (error) {
    context.logger.error('Failed to read log entry', error as Error);
    res.status(500).json({ error: 'Failed to read log entry' });
  }
}

// Error logs handlers
async function handleGetErrorLogs(
  context: HandlerContext,
  req: ExpressRequest,
  res: ExpressResponse
): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await context.logsService.getErrorLogs({ limit, offset });
    res.json(result);
  } catch (error) {
    context.logger.error('Failed to read error logs', error as Error);
    res.status(500).json({ error: 'Failed to read error logs' });
  }
}

// Logging configuration handlers
async function handleGetLoggingConfig(
  context: HandlerContext,
  req: ExpressRequest,
  res: ExpressResponse
): Promise<void> {
  try {
    const loggingSettings = await context.logsService.getLoggingSettings();
    const logsConfig = context.logsService.getConfig();

    res.json({
      settings: loggingSettings,
      config: logsConfig,
    });
  } catch (error) {
    context.logger.error('Failed to get logging configuration', error as Error);
    res.status(500).json({ error: 'Failed to get logging configuration' });
  }
}

// Update logging configuration handlers
async function handleUpdateLoggingConfig(
  context: HandlerContext,
  req: ExpressRequest,
  res: ExpressResponse
): Promise<void> {
  try {
    const { logging } = req.body;

    if (!logging) {
      res.status(400).json({ error: 'Logging configuration is required' });
      return;
    }

    // Update settings through settings service
    const updatedSettings = await context.settingsService!.updateSettings({ logging });

    // Sync the logs service configuration
    await context.logsService.syncConfigFromSettings();

    res.json({
      message: 'Logging configuration updated successfully',
      logging: updatedSettings.logging,
    });
  } catch (error) {
    context.logger.error('Failed to update logging configuration', error as Error);
    res.status(500).json({ error: 'Failed to update logging configuration' });
  }
}

// Log file validation helper
function isValidFilename(filename: string): boolean {
  return !(!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\'));
}

// Error handling helper
function handleLogFileError(error: unknown, res: ExpressResponse, logger: ILogger): void {
  const isFileNotFound = error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT';
  
  if (isFileNotFound) {
    res.status(404).json({ error: 'Log file not found' });
  } else {
    logger.error('Failed to read log file', error as Error);
    res.status(500).json({ error: 'Failed to read log file' });
  }
}

// Log file handlers
async function handleGetLogFile(
  context: HandlerContext,
  req: ExpressRequest,
  res: ExpressResponse
): Promise<void> {
  try {
    const { filename } = req.params;

    if (!isValidFilename(filename)) {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }

    const content = await context.logsService.getLogFileContent(filename);

    res.json({
      filename,
      content,
      size: content.length,
    });
  } catch (error) {
    handleLogFileError(error, res, context.logger);
  }
}

export function createLogsRoutes(logger: ILogger): Router {
  const router = Router();
  const settingsService = new SettingsService(logger);
  const logsService = new LogsService(logger, settingsService);
  
  const context: HandlerContext = {
    logsService,
    settingsService,
    logger
  };

  // Get recent request logs (all requests - for debugging)
  router.get('/requests', (req, res) => handleGetRequestLogs(context, req, res));

  // Get chat completion logs only (for UI display)
  router.get('/chat-completions', (req, res) =>
    handleGetChatCompletionLogs(context, req, res)
  );

  // Get detailed log entry
  router.get('/requests/:timestamp', (req, res) =>
    handleGetLogEntry(context, req, res)
  );

  // Get error logs
  router.get('/errors', (req, res) => handleGetErrorLogs(context, req, res));

  // Get logging configuration
  router.get('/config', (req, res) => handleGetLoggingConfig(context, req, res));

  // Update logging configuration
  router.put('/config', (req, res) =>
    handleUpdateLoggingConfig(context, req, res)
  );

  // Get specific log file
  router.get('/:filename', (req, res) => handleGetLogFile(context, req, res));

  return router;
}
