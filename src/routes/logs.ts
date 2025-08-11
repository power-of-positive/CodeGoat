import { Router, Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { ILogger } from '../logger-interface';
import { LogsService } from '../services/logs.service';
import { SettingsService } from '../services/settings.service';

// Request logs handlers
async function handleGetRequestLogs(
  logsService: LogsService,
  req: ExpressRequest,
  res: ExpressResponse,
  logger: ILogger
): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await logsService.getRequestLogs({ limit, offset });
    res.json(result);
  } catch (error) {
    logger.error('Failed to read logs', error as Error);
    res.status(500).json({ error: 'Failed to load request logs' });
  }
}

// Detailed log entry handlers
async function handleGetLogEntry(
  logsService: LogsService,
  req: ExpressRequest,
  res: ExpressResponse,
  logger: ILogger
): Promise<void> {
  try {
    const { timestamp } = req.params;
    const logEntry = await logsService.getLogEntry(timestamp);

    if (logEntry) {
      res.json(logEntry);
    } else {
      res.status(404).json({ error: 'Log entry not found' });
    }
  } catch (error) {
    logger.error('Failed to read log entry', error as Error);
    res.status(500).json({ error: 'Failed to read log entry' });
  }
}

// Error logs handlers
async function handleGetErrorLogs(
  logsService: LogsService,
  req: ExpressRequest,
  res: ExpressResponse,
  logger: ILogger
): Promise<void> {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await logsService.getErrorLogs({ limit, offset });
    res.json(result);
  } catch (error) {
    logger.error('Failed to read error logs', error as Error);
    res.status(500).json({ error: 'Failed to read error logs' });
  }
}

// Logging configuration handlers
async function handleGetLoggingConfig(
  logsService: LogsService,
  req: ExpressRequest,
  res: ExpressResponse,
  logger: ILogger
): Promise<void> {
  try {
    const loggingSettings = await logsService.getLoggingSettings();
    const logsConfig = logsService.getConfig();

    res.json({
      settings: loggingSettings,
      config: logsConfig,
    });
  } catch (error) {
    logger.error('Failed to get logging configuration', error as Error);
    res.status(500).json({ error: 'Failed to get logging configuration' });
  }
}

// Update logging configuration handlers
async function handleUpdateLoggingConfig(
  settingsService: SettingsService,
  logsService: LogsService,
  req: ExpressRequest,
  res: ExpressResponse,
  logger: ILogger
): Promise<void> {
  try {
    const { logging } = req.body;

    if (!logging) {
      res.status(400).json({ error: 'Logging configuration is required' });
      return;
    }

    // Update settings through settings service
    const updatedSettings = await settingsService.updateSettings({ logging });

    // Sync the logs service configuration
    await logsService.syncConfigFromSettings();

    res.json({
      message: 'Logging configuration updated successfully',
      logging: updatedSettings.logging,
    });
  } catch (error) {
    logger.error('Failed to update logging configuration', error as Error);
    res.status(500).json({ error: 'Failed to update logging configuration' });
  }
}

// Log file handlers
async function handleGetLogFile(
  logsService: LogsService,
  req: ExpressRequest,
  res: ExpressResponse,
  logger: ILogger
): Promise<void> {
  try {
    const { filename } = req.params;

    // Validate filename to prevent path traversal
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      res.status(400).json({ error: 'Invalid filename' });
      return;
    }

    const content = await logsService.getLogFileContent(filename);

    res.json({
      filename,
      content,
      size: content.length,
    });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      res.status(404).json({ error: 'Log file not found' });
    } else {
      logger.error('Failed to read log file', error as Error);
      res.status(500).json({ error: 'Failed to read log file' });
    }
  }
}

export function createLogsRoutes(logger: ILogger): Router {
  const router = Router();
  const settingsService = new SettingsService(logger);
  const logsService = new LogsService(logger, settingsService);

  // Get recent request logs
  router.get('/requests', (req, res) => handleGetRequestLogs(logsService, req, res, logger));

  // Get detailed log entry
  router.get('/requests/:timestamp', (req, res) =>
    handleGetLogEntry(logsService, req, res, logger)
  );

  // Get error logs
  router.get('/errors', (req, res) => handleGetErrorLogs(logsService, req, res, logger));

  // Get logging configuration
  router.get('/config', (req, res) => handleGetLoggingConfig(logsService, req, res, logger));

  // Update logging configuration
  router.put('/config', (req, res) =>
    handleUpdateLoggingConfig(settingsService, logsService, req, res, logger)
  );

  // Get specific log file
  router.get('/:filename', (req, res) => handleGetLogFile(logsService, req, res, logger));

  return router;
}
