import request from 'supertest';
import express from 'express';
import { createSettingsRoutes } from '../../routes/settings';
import { createMockLogger } from '../../test-helpers/logger.mock';
import fs from 'fs/promises';

jest.mock('fs/promises');

describe('Settings Routes', () => {
  let app: express.Application;
  let mockLogger: ReturnType<typeof createMockLogger>;

  beforeEach(() => {
    mockLogger = createMockLogger();
    app = express();
    app.use(express.json());
    // Pass null for configLoader since settings routes don't actually use it
    app.use('/settings', createSettingsRoutes(mockLogger));
    jest.clearAllMocks();
  });

  describe('GET /settings', () => {
    it('should return default settings when no settings file exists', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue({ code: 'ENOENT' });

      const response = await request(app).get('/settings').expect(200);

      expect(response.body).toEqual(
        expect.objectContaining({
          fallback: expect.objectContaining({
            maxRetries: 3,
            retryDelay: 1000,
            enableFallbacks: true,
            fallbackOnContextLength: true,
            fallbackOnRateLimit: true,
            fallbackOnServerError: false,
          }),
          validation: expect.objectContaining({
            stages: expect.arrayContaining([
              expect.objectContaining({ id: 'lint' }),
              expect.objectContaining({ id: 'typecheck' }),
              expect.objectContaining({ id: 'test' }),
            ]),
            enableMetrics: true,
            maxAttempts: 5,
          }),
          logging: expect.any(Object),
        })
      );
    });

    it('should return existing settings from file', async () => {
      const mockSettings = {
        fallback: { maxRetries: 5, retryDelay: 2000, enableFallbacks: true },
        validation: { stages: [], enableMetrics: false, maxAttempts: 3 },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockSettings));

      const response = await request(app).get('/settings').expect(200);

      expect(response.body).toEqual(expect.objectContaining(mockSettings));
    });

    it('should handle file read errors', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('Permission denied'));

      const response = await request(app).get('/settings').expect(200);

      // Should return default settings when file read fails
      expect(response.body).toEqual(
        expect.objectContaining({
          fallback: expect.objectContaining({
            maxRetries: 3,
            retryDelay: 1000,
            enableFallbacks: true,
          }),
          validation: expect.objectContaining({
            enableMetrics: true,
            maxAttempts: 5,
          }),
          logging: expect.any(Object),
        })
      );
    });
  });

  describe('PUT /settings', () => {
    it('should update settings successfully', async () => {
      const existingSettings = { fallback: { maxRetries: 3 } };
      const newSettings = { fallback: { maxRetries: 5, enableFallbacks: false } };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existingSettings));
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app).put('/settings').send(newSettings).expect(200);

      expect(fs.writeFile).toHaveBeenCalled();
      expect(response.body).toEqual({
        message: 'Settings updated successfully',
        settings: expect.objectContaining({
          fallback: expect.objectContaining(newSettings.fallback),
        }),
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Settings saved successfully');
    });

    it('should handle invalid settings format', async () => {
      const invalidSettings = { fallback: { maxRetries: 'invalid' } }; // Invalid type

      await request(app)
        .put('/settings')
        .send(invalidSettings)
        .expect(400)
        .expect(res => {
          expect(res.body).toEqual({
            error: 'Invalid settings format',
            details: expect.any(Array),
          });
        });
    });
  });

  describe('GET /settings/fallback', () => {
    it('should return fallback settings', async () => {
      const mockSettings = {
        fallback: {
          maxRetries: 5,
          retryDelay: 2000,
          enableFallbacks: true,
          fallbackOnContextLength: true,
          fallbackOnRateLimit: false,
          fallbackOnServerError: false,
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(mockSettings));

      const response = await request(app).get('/settings/fallback').expect(200);

      expect(response.body).toEqual(mockSettings.fallback);
    }, 10000);

    it('should return default fallback settings when no fallback settings exist', async () => {
      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({}));

      const response = await request(app).get('/settings/fallback').expect(200);

      expect(response.body).toEqual({
        maxRetries: 3,
        retryDelay: 1000,
        enableFallbacks: true,
        fallbackOnContextLength: true,
        fallbackOnRateLimit: true,
        fallbackOnServerError: false,
      });
    });
  });

  describe('PUT /settings/fallback', () => {
    it('should update fallback settings', async () => {
      const existingSettings = { validation: { stages: [] } };
      const newFallbackSettings = {
        maxRetries: 3,
        retryDelay: 1500,
        enableFallbacks: true,
        fallbackOnContextLength: false,
        fallbackOnRateLimit: true,
        fallbackOnServerError: false,
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existingSettings));
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .put('/settings/fallback')
        .send(newFallbackSettings)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Fallback settings updated successfully',
        fallback: newFallbackSettings,
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Fallback settings updated', {
        settings: newFallbackSettings,
      });
    });

    it('should validate fallback settings', async () => {
      const invalidSettings = {
        maxRetries: 15, // Invalid - exceeds max of 10
        retryDelay: 50, // Invalid - below min of 100
      };

      await request(app)
        .put('/settings/fallback')
        .send(invalidSettings)
        .expect(400)
        .expect(res => {
          expect(res.body).toEqual({
            error: 'Invalid fallback settings',
            details: expect.any(Array),
          });
        });
    });
  });

  describe('POST /settings/validation/stages', () => {
    it('should add new validation stage', async () => {
      const existingSettings = {
        validation: { stages: [], enableMetrics: true, maxAttempts: 5 },
      };
      const newStage = {
        id: 'custom-lint',
        name: 'Custom Linting',
        command: 'custom-linter',
        timeout: 30000,
        enabled: true,
        continueOnFailure: false,
        priority: 0,
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existingSettings));
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .post('/settings/validation/stages')
        .send(newStage)
        .expect(201);

      expect(response.body).toEqual({
        message: 'Validation stage added successfully',
        stage: newStage,
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Validation stage added', {
        stageId: newStage.id,
      });
    });

    it('should reject duplicate stage IDs', async () => {
      const existingSettings = {
        validation: {
          stages: [{ id: 'lint', name: 'Existing Lint', command: 'lint' }],
          enableMetrics: true,
          maxAttempts: 5,
        },
      };
      const duplicateStage = {
        id: 'lint', // Duplicate ID
        name: 'New Lint',
        command: 'new-lint',
        timeout: 30000,
        enabled: true,
        continueOnFailure: false,
        priority: 0,
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existingSettings));

      await request(app)
        .post('/settings/validation/stages')
        .send(duplicateStage)
        .expect(409)
        .expect({
          error: 'Stage with this ID already exists',
        });
    });
  });

  describe('DELETE /settings/validation/stages/:id', () => {
    it('should remove validation stage', async () => {
      const existingSettings = {
        validation: {
          stages: [
            { id: 'lint', name: 'Lint' },
            { id: 'test', name: 'Test' },
          ],
          enableMetrics: true,
          maxAttempts: 5,
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existingSettings));
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app).delete('/settings/validation/stages/lint').expect(200);

      expect(response.body).toEqual({
        message: 'Validation stage removed successfully',
      });
      expect(mockLogger.info).toHaveBeenCalledWith('Validation stage removed', {
        stageId: 'lint',
      });
    });

    it('should handle removing non-existent stage', async () => {
      const existingSettings = {
        validation: {
          stages: [{ id: 'lint', name: 'Lint' }],
          enableMetrics: true,
          maxAttempts: 5,
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existingSettings));

      await request(app).delete('/settings/validation/stages/nonexistent').expect(404).expect({
        error: 'Validation stage not found',
      });
    });
  });

  describe('PUT /settings/validation/stages/:id', () => {
    it('should update validation stage', async () => {
      const existingSettings = {
        validation: {
          stages: [
            { id: 'lint', name: 'Lint', command: 'eslint .', enabled: true, priority: 0 },
            { id: 'test', name: 'Test', command: 'npm test', enabled: true, priority: 0 },
          ],
          enableMetrics: true,
          maxAttempts: 5,
        },
      };
      const updatedStage = {
        id: 'lint',
        name: 'Updated Lint',
        command: 'eslint . --fix',
        enabled: false,
        priority: 3,
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existingSettings));
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const response = await request(app)
        .put('/settings/validation/stages/lint')
        .send(updatedStage)
        .expect(200);

      expect(response.body).toEqual({
        message: 'Validation stage updated successfully',
        stage: expect.objectContaining(updatedStage),
      });
    });

    it('should handle updating non-existent stage', async () => {
      const existingSettings = {
        validation: {
          stages: [{ id: 'lint', name: 'Lint' }],
          enableMetrics: true,
          maxAttempts: 5,
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existingSettings));

      await request(app)
        .put('/settings/validation/stages/nonexistent')
        .send({ name: 'Updated Stage' })
        .expect(404)
        .expect({
          error: 'Validation stage not found',
        });
    });

    it('should handle validation errors for stage updates', async () => {
      const existingSettings = {
        validation: {
          stages: [{ id: 'lint', name: 'Lint', command: 'eslint .' }],
          enableMetrics: true,
          maxAttempts: 5,
        },
      };
      const invalidUpdate = {
        command: '', // Invalid empty command
        priority: -1, // Invalid negative priority
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existingSettings));

      await request(app)
        .put('/settings/validation/stages/lint')
        .send(invalidUpdate)
        .expect(400)
        .expect(res => {
          expect(res.body).toEqual({
            error: 'Invalid stage configuration',
            details: expect.any(Array),
          });
        });
    });
  });

  describe('GET /settings/validation/stages', () => {
    it('should get all validation stages', async () => {
      const existingSettings = {
        validation: {
          stages: [
            { id: 'lint', name: 'Lint', command: 'eslint .', enabled: true, priority: 0 },
            { id: 'test', name: 'Test', command: 'npm test', enabled: true, priority: 0 },
          ],
          enableMetrics: true,
          maxAttempts: 5,
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existingSettings));

      const response = await request(app).get('/settings/validation/stages').expect(200);

      expect(response.body.stages).toEqual(existingSettings.validation.stages);
    });

    it('should return empty array when no stages exist', async () => {
      const existingSettings = {
        validation: {
          stages: [],
          enableMetrics: true,
          maxAttempts: 5,
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existingSettings));

      const response = await request(app).get('/settings/validation/stages').expect(200);

      expect(response.body.stages).toEqual([]);
    });
  });

  describe('Error handling', () => {
    it('should handle file write errors in settings update', async () => {
      const newSettings = { fallback: { maxRetries: 5 } };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({}));
      (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Write permission denied'));

      await request(app).put('/settings').send(newSettings).expect(500).expect({
        error: 'Failed to update settings',
      });

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to update settings', expect.any(Error));
    });

    it('should handle file write errors in fallback update', async () => {
      const newFallbackSettings = { maxRetries: 5, retryDelay: 1000 };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify({}));
      (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Write permission denied'));

      await request(app).put('/settings/fallback').send(newFallbackSettings).expect(500).expect({
        error: 'Failed to update fallback settings',
      });
    });

    it('should handle file write errors in stage addition', async () => {
      const existingSettings = {
        validation: { stages: [], enableMetrics: true, maxAttempts: 5 },
      };
      const newStage = {
        id: 'custom-lint',
        name: 'Custom Linting',
        command: 'custom-linter',
        timeout: 30000,
        enabled: true,
        continueOnFailure: false,
        priority: 0,
      };

      (fs.readFile as jest.Mock).mockResolvedValue(JSON.stringify(existingSettings));
      (fs.writeFile as jest.Mock).mockRejectedValue(new Error('Write permission denied'));

      await request(app).post('/settings/validation/stages').send(newStage).expect(500).expect({
        error: 'Failed to add validation stage',
      });

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to add validation stage',
        expect.any(Error)
      );
    });

    it('should handle file read errors in fallback retrieval', async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('Read permission denied'));

      const response = await request(app).get('/settings/fallback').expect(200);

      // Should return default fallback settings even when file read fails
      expect(response.body).toEqual({
        maxRetries: 3,
        retryDelay: 1000,
        enableFallbacks: true,
        fallbackOnContextLength: true,
        fallbackOnRateLimit: true,
        fallbackOnServerError: false,
      });
    });

    it('should handle JSON parsing errors in fallback settings', async () => {
      // Mock fs.readFile to return invalid JSON for fallback settings fetch
      (fs.readFile as jest.Mock).mockRejectedValue(new SyntaxError('Unexpected token'));

      // The service now returns default fallback settings instead of throwing
      const response = await request(app).get('/settings/fallback').expect(200);

      // Should return default fallback settings directly (not wrapped in fallback property)
      expect(response.body.maxRetries).toBeDefined();
      expect(response.body.retryDelay).toBeDefined();
      expect(response.body.enableFallbacks).toBeDefined();
      // The service handles errors gracefully by returning defaults, so error is logged in loadSettings
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to load settings',
        expect.any(Error)
      );
    });

    it('should handle service errors in main settings retrieval', async () => {
      // Create a mock that will cause the settings service to throw an error
      (fs.readFile as jest.Mock).mockRejectedValue(new Error('Service error'));

      // The service now returns default settings instead of throwing
      const response = await request(app).get('/settings').expect(200);

      // Should return default settings structure
      expect(response.body.fallback).toBeDefined();
      expect(response.body.validation).toBeDefined();
      expect(response.body.logging).toBeDefined();
      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to load settings',
        expect.any(Error)
      );
    });
  });
});
