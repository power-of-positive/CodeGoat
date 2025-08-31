import { SettingsService } from '../src/services/settings.service';
import { AnalyticsService } from '../src/services/analytics.service';
import { ValidationStage } from '../src/types/settings.types';
import { ILogger } from '../src/logger-interface';
import * as fs from 'fs';
import * as path from 'path';

describe('Validation Analytics Integration Tests', () => {
  let settingsService: SettingsService;
  let analyticsService: AnalyticsService;
  let mockLogger: ILogger;
  let testSettingsPath: string;
  let testMetricsPath: string;
  let testSessionsPath: string;

  beforeEach(() => {
    // Generate unique test file paths for each test
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    testSettingsPath = path.join(__dirname, `test-settings-${timestamp}-${random}.json`);
    testMetricsPath = path.join(__dirname, `test-metrics-${timestamp}-${random}.json`);
    testSessionsPath = path.join(__dirname, `test-sessions-${timestamp}-${random}.json`);

    // Clean up test files if they exist
    [testSettingsPath, testMetricsPath, testSessionsPath].forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });

    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    settingsService = new SettingsService(mockLogger, testSettingsPath);
    analyticsService = new AnalyticsService(mockLogger, testSessionsPath);
  });

  afterEach(() => {
    // Clean up test files
    [testSettingsPath, testMetricsPath, testSessionsPath].forEach(file => {
      if (file && fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  });

  describe('Settings and Analytics Integration', () => {
    it('should handle validation stages through settings service', async () => {
      const testStage: ValidationStage = {
        id: 'test-stage',
        name: 'Test Stage',
        command: 'npm test',
        timeout: 30000,
        enabled: true,
        continueOnFailure: false,
        priority: 1,
      };

      // Add stage through settings
      await settingsService.addValidationStage(testStage);

      // Verify stage was added
      const stage = await settingsService.getValidationStage('test-stage');
      expect(stage).toEqual(testStage);
    });

    it('should track validation sessions in analytics', async () => {
      // Record a validation session
      const sessionId = await analyticsService.startSession('Test task', 'Integration test task');

      await analyticsService.recordValidationAttempt(sessionId, {
        attempt: 1,
        timestamp: new Date().toISOString(),
        startTime: Date.now(),
        totalTime: 1000,
        totalStages: 1,
        passed: 1,
        failed: 0,
        success: true,
        stages: [
          {
            id: 'test-stage',
            name: 'Test Stage',
            success: true,
            duration: 1000,
            attempt: 1,
          },
        ],
      });

      await analyticsService.endSession(sessionId, true);

      // Get analytics
      const analytics = await analyticsService.getAnalytics();
      expect(analytics.totalSessions).toBe(1);
      expect(analytics.successRate).toBe(100);
    });

    it('should calculate stage metrics correctly', async () => {
      const sessionId = await analyticsService.startSession(
        'Multi-stage task',
        'Test with multiple stages'
      );

      // Record validation attempt with multiple stages
      await analyticsService.recordValidationAttempt(sessionId, {
        attempt: 1,
        timestamp: new Date().toISOString(),
        startTime: Date.now(),
        totalTime: 2500,
        totalStages: 2,
        passed: 1,
        failed: 1,
        success: false,
        stages: [
          {
            id: 'lint',
            name: 'Lint',
            success: true,
            duration: 500,
            attempt: 1,
          },
          {
            id: 'test',
            name: 'Test',
            success: false,
            duration: 2000,
            attempt: 1,
          },
        ],
      });

      await analyticsService.endSession(sessionId, false);

      const analytics = await analyticsService.getAnalytics();
      expect(analytics.stageSuccessRates['lint'].rate).toBe(100);
      expect(analytics.stageSuccessRates['test'].rate).toBe(0);
    });
  });
});
