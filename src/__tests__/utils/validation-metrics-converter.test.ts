import { ValidationMetricsConverter } from '../../utils/validation-metrics-converter';

describe('ValidationMetricsConverter', () => {
  describe('convertToSessions', () => {
    it('should convert validation metrics to sessions', () => {
      const metrics = [
        {
          timestamp: '2023-10-01T10:00:00Z',
          totalTime: 1000,
          totalStages: 3,
          success: true,
          passed: 3,
          failed: 0,
          stages: [
            { id: 'lint', name: 'Lint', success: true, duration: 200 },
            { id: 'test', name: 'Test', success: true, duration: 500 },
            { id: 'build', name: 'Build', success: true, duration: 300 }
          ]
        },
        {
          timestamp: '2023-10-01T09:00:00Z',
          totalTime: 800,
          totalStages: 2,
          success: false,
          passed: 1,
          failed: 1,
          stages: [
            { id: 'lint', name: 'Lint', success: true, duration: 300 },
            { id: 'test', name: 'Test', success: false, duration: 500 }
          ]
        }
      ];

      const sessions = ValidationMetricsConverter.convertToSessions(metrics, 10);

      expect(sessions).toHaveLength(2);
      
      // Check first session (most recent)
      const firstSession = sessions[0];
      expect(firstSession.sessionId).toMatch(/^validation_\d+_0$/);
      expect(firstSession.startTime).toBe(new Date('2023-10-01T10:00:00Z').getTime());
      expect(firstSession.totalDuration).toBe(1000);
      expect(firstSession.userPrompt).toBe('Validation Run');
      expect(firstSession.taskDescription).toBe('Validation pipeline execution (Success)');
      expect(firstSession.finalSuccess).toBe(true);
      expect(firstSession.totalValidationTime).toBe(1000);
      expect(firstSession.averageStageTime).toBe(1000 / 3);
      
      expect(firstSession.attempts).toHaveLength(1);
      expect(firstSession.attempts[0].totalStages).toBe(3);
      expect(firstSession.attempts[0].passed).toBe(3);
      expect(firstSession.attempts[0].failed).toBe(0);
      expect(firstSession.attempts[0].success).toBe(true);
      expect(firstSession.attempts[0].stages).toHaveLength(3);
      
      // Check second session
      const secondSession = sessions[1];
      expect(secondSession.taskDescription).toBe('Validation pipeline execution (Failed)');
      expect(secondSession.finalSuccess).toBe(false);
      expect(secondSession.attempts[0].passed).toBe(1);
      expect(secondSession.attempts[0].failed).toBe(1);
    });

    it('should handle empty metrics array', () => {
      const sessions = ValidationMetricsConverter.convertToSessions([], 10);
      expect(sessions).toHaveLength(0);
    });

    it('should limit results to specified limit', () => {
      const metrics = Array.from({ length: 10 }, (_, i) => ({
        timestamp: `2023-10-01T${String(i).padStart(2, '0')}:00:00Z`,
        totalTime: 1000,
        totalStages: 1,
        success: true
      }));

      const sessions = ValidationMetricsConverter.convertToSessions(metrics, 3);
      expect(sessions).toHaveLength(3);
    });

    it('should handle metrics with missing fields', () => {
      const metrics = [
        {
          timestamp: '2023-10-01T10:00:00Z'
          // Missing other fields
        },
        {
          timestamp: '2023-10-01T09:00:00Z',
          totalTime: null,
          totalStages: undefined,
          success: false, // Boolean false
          stages: 'not-an-array' // Wrong type
        }
      ];

      const sessions = ValidationMetricsConverter.convertToSessions(metrics, 10);
      
      expect(sessions).toHaveLength(2);
      
      // First session with missing fields
      expect(sessions[0].totalDuration).toBe(0);
      expect(sessions[0].finalSuccess).toBe(false);
      expect(sessions[0].averageStageTime).toBe(0);
      expect(sessions[0].attempts[0].totalStages).toBe(0);
      expect(sessions[0].attempts[0].passed).toBe(0);
      expect(sessions[0].attempts[0].failed).toBe(0);
      expect(sessions[0].attempts[0].stages).toHaveLength(0);
      
      // Second session with wrong types
      expect(sessions[1].totalDuration).toBe(0);
      expect(sessions[1].finalSuccess).toBe(false);
      expect(sessions[1].attempts[0].stages).toHaveLength(0);
    });

    it('should handle stages with missing fields', () => {
      const metrics = [
        {
          timestamp: '2023-10-01T10:00:00Z',
          totalTime: 1000,
          totalStages: 2,
          success: true,
          stages: [
            { id: 'lint', success: true, duration: 200 }, // Missing name
            { name: 'Test', success: false }, // Missing id and duration
            {} // Completely empty stage
          ]
        }
      ];

      const sessions = ValidationMetricsConverter.convertToSessions(metrics, 10);
      const stages = sessions[0].attempts[0].stages;
      
      expect(stages).toHaveLength(3);
      
      // First stage
      expect(stages[0].id).toBe('lint');
      expect(stages[0].name).toBe('lint'); // Falls back to id
      expect(stages[0].success).toBe(true);
      expect(stages[0].duration).toBe(200);
      
      // Second stage
      expect(stages[1].id).toBe('unknown'); // Default fallback
      expect(stages[1].name).toBe('Test');
      expect(stages[1].success).toBe(false);
      expect(stages[1].duration).toBe(0);
      
      // Third stage (empty)
      expect(stages[2].id).toBe('unknown');
      expect(stages[2].name).toBe('Unknown Stage');
      expect(stages[2].success).toBe(false);
      expect(stages[2].duration).toBe(0);
    });
  });

  describe('calculateAnalytics', () => {
    it('should return empty analytics for empty metrics', () => {
      const analytics = ValidationMetricsConverter.calculateAnalytics([]);
      
      expect(analytics).toEqual({
        totalSessions: 0,
        successRate: 0,
        averageTimeToSuccess: 0,
        averageAttemptsToSuccess: 0,
        mostFailedStage: 'none',
        stageSuccessRates: {},
        averageStageTime: {},
        dailyStats: {},
      });
    });

    it('should calculate analytics from validation metrics', () => {
      const metrics = [
        {
          timestamp: '2023-10-01T10:00:00Z',
          totalTime: 1000,
          success: true,
          stages: [
            { id: 'lint', success: true, duration: 400 },
            { id: 'test', success: true, duration: 600 }
          ]
        },
        {
          timestamp: '2023-10-01T11:00:00Z',
          totalTime: 1500,
          success: true,
          stages: [
            { id: 'lint', success: true, duration: 500 },
            { id: 'test', success: false, duration: 1000 }
          ]
        },
        {
          timestamp: '2023-10-01T12:00:00Z',
          totalTime: 800,
          success: false,
          stages: [
            { id: 'lint', success: false, duration: 300 },
            { id: 'test', success: false, duration: 500 }
          ]
        }
      ];

      const analytics = ValidationMetricsConverter.calculateAnalytics(metrics);
      
      expect(analytics.totalSessions).toBe(3);
      expect(analytics.successRate).toBe((2 / 3) * 100); // 2 successful out of 3
      expect(analytics.averageTimeToSuccess).toBe((1000 + 1500) / 2); // Average of successful attempts
      expect(analytics.averageAttemptsToSuccess).toBe(1); // Always 1 for validation metrics
      
      // Stage success rates
      expect(analytics.stageSuccessRates).toEqual({
        lint: { attempts: 3, successes: 2, rate: (2 / 3) * 100 },
        test: { attempts: 3, successes: 1, rate: (1 / 3) * 100 }
      });
      
      // Most failed stage should be 'test' with lower success rate
      expect(analytics.mostFailedStage).toBe('test');
      
      // Average stage time
      expect(analytics.averageStageTime).toEqual({
        lint: Math.round((400 + 500 + 300) / 3), // 400ms average
        test: Math.round((600 + 1000 + 500) / 3) // 700ms average
      });
      
      // Daily stats
      expect(analytics.dailyStats).toEqual({
        '2023-10-01': {
          sessions: 3,
          successes: 2,
          totalTime: 3300
        }
      });
    });

    it('should handle metrics without stages', () => {
      const metrics = [
        {
          timestamp: '2023-10-01T10:00:00Z',
          totalTime: 1000,
          success: true
          // No stages
        },
        {
          timestamp: '2023-10-01T11:00:00Z',
          totalTime: 500,
          success: false,
          stages: null // Null stages
        }
      ];

      const analytics = ValidationMetricsConverter.calculateAnalytics(metrics);
      
      expect(analytics.totalSessions).toBe(2);
      expect(analytics.successRate).toBe(50);
      expect(analytics.stageSuccessRates).toEqual({});
      expect(analytics.mostFailedStage).toBe('none');
    });

    it('should handle invalid timestamps', () => {
      const metrics = [
        {
          timestamp: 'invalid-date',
          totalTime: 1000,
          success: true
        },
        {
          // No timestamp
          totalTime: 500,
          success: false
        },
        {
          timestamp: null,
          totalTime: 800,
          success: true
        }
      ];

      const analytics = ValidationMetricsConverter.calculateAnalytics(metrics);
      
      expect(analytics.totalSessions).toBe(3);
      expect(analytics.dailyStats).toEqual({}); // No valid dates
    });

    it('should handle missing totalTime values', () => {
      const metrics = [
        {
          timestamp: '2023-10-01T10:00:00Z',
          success: true
          // Missing totalTime
        },
        {
          timestamp: '2023-10-01T11:00:00Z',
          totalTime: null,
          success: true
        }
      ];

      const analytics = ValidationMetricsConverter.calculateAnalytics(metrics);
      
      expect(analytics.averageTimeToSuccess).toBe(0); // Should handle missing times
      expect(analytics.dailyStats['2023-10-01'].totalTime).toBe(0);
    });

    it('should handle all failed attempts', () => {
      const metrics = [
        { timestamp: '2023-10-01T10:00:00Z', success: false },
        { timestamp: '2023-10-01T11:00:00Z', success: false }
      ];

      const analytics = ValidationMetricsConverter.calculateAnalytics(metrics);
      
      expect(analytics.successRate).toBe(0);
      expect(analytics.averageTimeToSuccess).toBe(0);
      expect(analytics.averageAttemptsToSuccess).toBe(0);
    });

    it('should calculate stage success rates correctly with complex data', () => {
      const metrics = [
        {
          stages: [
            { id: 'lint', success: true },
            { id: 'test', success: true },
            { id: 'build', success: false }
          ]
        },
        {
          stages: [
            { id: 'lint', success: false },
            { id: 'test', success: true },
            { id: 'build', success: true }
          ]
        },
        {
          stages: [
            { id: 'lint', success: true },
            { id: 'test', success: false }
            // Build stage missing
          ]
        }
      ];

      const analytics = ValidationMetricsConverter.calculateAnalytics(metrics);
      
      expect(analytics.stageSuccessRates.lint).toEqual({
        attempts: 3,
        successes: 2,
        rate: (2 / 3) * 100
      });
      
      expect(analytics.stageSuccessRates.test).toEqual({
        attempts: 3,
        successes: 2,
        rate: (2 / 3) * 100
      });
      
      expect(analytics.stageSuccessRates.build).toEqual({
        attempts: 2,
        successes: 1,
        rate: 50
      });
    });

    it('should handle multiple days in daily stats', () => {
      const metrics = [
        {
          timestamp: '2023-10-01T10:00:00Z',
          totalTime: 1000,
          success: true
        },
        {
          timestamp: '2023-10-01T14:00:00Z',
          totalTime: 800,
          success: false
        },
        {
          timestamp: '2023-10-02T10:00:00Z',
          totalTime: 1200,
          success: true
        }
      ];

      const analytics = ValidationMetricsConverter.calculateAnalytics(metrics);
      
      expect(analytics.dailyStats).toEqual({
        '2023-10-01': {
          sessions: 2,
          successes: 1,
          totalTime: 1800
        },
        '2023-10-02': {
          sessions: 1,
          successes: 1,
          totalTime: 1200
        }
      });
    });
  });
});