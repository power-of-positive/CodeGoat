import { StageConsolidationService } from '../../services/stage-consolidation.service';
import type { ValidationStageConfig } from '../../types/validation.types';

describe('StageConsolidationService', () => {
  let service: StageConsolidationService;

  beforeEach(() => {
    service = new StageConsolidationService();
  });

  describe('identifyDuplicateStages', () => {
    it('should identify duplicate AI Code Review stages', () => {
      const stages: ValidationStageConfig[] = [
        { stageId: 'ai-code-review', name: 'AI Code Review', enabled: false },
        { stageId: 'ai-review', name: 'AI Code Review', enabled: false },
      ];

      const duplicates = service.identifyDuplicateStages(stages);

      expect(duplicates).toEqual({
        'ai-code-review': ['ai-code-review', 'ai-review'],
      });
    });

    it('should identify duplicate Backend Coverage Check stages', () => {
      const stages: ValidationStageConfig[] = [
        { stageId: 'backend-coverage', name: 'Backend Coverage Check', enabled: false },
        { stageId: 'coverage-backend', name: 'Backend Coverage Check', enabled: true },
      ];

      const duplicates = service.identifyDuplicateStages(stages);

      expect(duplicates).toEqual({
        'coverage-backend': ['backend-coverage', 'coverage-backend'],
      });
    });

    it('should identify all major duplicate categories', () => {
      const stages: ValidationStageConfig[] = [
        // AI Code Review duplicates
        { stageId: 'ai-code-review', name: 'AI Code Review', enabled: false },
        { stageId: 'ai-review', name: 'AI Code Review', enabled: false },

        // Coverage duplicates
        { stageId: 'backend-coverage', name: 'Backend Coverage Check', enabled: false },
        { stageId: 'coverage-backend', name: 'Backend Coverage Check', enabled: true },
        { stageId: 'coverage-frontend', name: 'Frontend Coverage Check', enabled: false },
        { stageId: 'frontend-coverage', name: 'Frontend Coverage Check', enabled: false },

        // E2E duplicates
        { stageId: 'e2e-tests', name: 'Playwright E2E Tests', enabled: true },
        { stageId: 'playwright-e2e', name: 'Playwright E2E Tests', enabled: false },

        // Dead code duplicates
        { stageId: 'dead-code', name: 'Dead Code Detection', enabled: false },
        { stageId: 'dead-code-detection', name: 'Dead Code Detection', enabled: false },
      ];

      const duplicates = service.identifyDuplicateStages(stages);

      expect(Object.keys(duplicates)).toHaveLength(5);
      expect(duplicates['ai-code-review']).toEqual(['ai-code-review', 'ai-review']);
      expect(duplicates['coverage-backend']).toEqual(['backend-coverage', 'coverage-backend']);
      expect(duplicates['coverage-frontend']).toEqual(['coverage-frontend', 'frontend-coverage']);
      expect(duplicates['e2e-tests']).toEqual(['e2e-tests', 'playwright-e2e']);
      expect(duplicates['dead-code']).toEqual(['dead-code', 'dead-code-detection']);
    });
  });

  describe('consolidateStages', () => {
    it('should prefer enabled stage when consolidating duplicates', () => {
      const stages: ValidationStageConfig[] = [
        {
          stageId: 'backend-coverage',
          name: 'Backend Coverage Check',
          enabled: false,
          priority: 6,
          command: 'npm run test:coverage:backend',
        },
        {
          stageId: 'coverage-backend',
          name: 'Backend Coverage Check',
          enabled: true,
          priority: 6,
          command: 'npm run test:coverage:backend',
        },
      ];

      const consolidated = service.consolidateStages(stages);

      expect(consolidated).toHaveLength(1);
      expect(consolidated[0]).toEqual({
        stageId: 'coverage-backend', // Should prefer the enabled one
        name: 'Backend Coverage Check',
        enabled: true,
        priority: 6,
        command: 'npm run test:coverage:backend',
        consolidatedFrom: ['backend-coverage', 'coverage-backend'],
      });
    });

    it('should prefer stage with lower priority when both have same enabled status', () => {
      const stages: ValidationStageConfig[] = [
        { stageId: 'ai-review', name: 'AI Code Review', enabled: false, priority: 12 },
        { stageId: 'ai-code-review', name: 'AI Code Review', enabled: false, priority: 12 },
      ];

      const consolidated = service.consolidateStages(stages);

      expect(consolidated).toHaveLength(1);
      expect(consolidated[0].stageId).toBe('ai-code-review'); // Alphabetically first when tied
      expect(consolidated[0].consolidatedFrom).toEqual(['ai-code-review', 'ai-review']);
    });

    it('should preserve non-duplicate stages unchanged', () => {
      const stages: ValidationStageConfig[] = [
        { stageId: 'lint', name: 'Code Linting', enabled: true, priority: 1 },
        { stageId: 'typecheck', name: 'Type Checking', enabled: true, priority: 2 },
        { stageId: 'coverage-backend', name: 'Backend Coverage Check', enabled: true, priority: 6 },
        {
          stageId: 'backend-coverage',
          name: 'Backend Coverage Check',
          enabled: false,
          priority: 6,
        },
      ];

      const consolidated = service.consolidateStages(stages);

      expect(consolidated).toHaveLength(3);

      // Non-duplicates should remain unchanged
      const lint = consolidated.find(s => s.stageId === 'lint');
      const typecheck = consolidated.find(s => s.stageId === 'typecheck');
      expect(lint).toBeDefined();
      expect(typecheck).toBeDefined();
      expect(lint?.consolidatedFrom).toBeUndefined();
      expect(typecheck?.consolidatedFrom).toBeUndefined();

      // Duplicate should be consolidated
      const coverage = consolidated.find(s => s.name === 'Backend Coverage Check');
      expect(coverage?.stageId).toBe('coverage-backend');
      expect(coverage?.consolidatedFrom).toEqual(['backend-coverage', 'coverage-backend']);
    });
  });

  describe('mergeStageStatistics', () => {
    it('should merge statistics from duplicate stages correctly', () => {
      const stageStats = [
        {
          stageName: 'Backend Coverage Check',
          stageId: 'backend-coverage',
          totalRuns: 50,
          successCount: 40,
          totalDuration: 100000,
        },
        {
          stageName: 'Backend Coverage Check',
          stageId: 'coverage-backend',
          totalRuns: 30,
          successCount: 25,
          totalDuration: 60000,
        },
      ];

      const merged = service.mergeStageStatistics(stageStats);

      expect(merged).toHaveLength(1);
      expect(merged[0]).toEqual({
        stageName: 'Backend Coverage Check',
        stageId: 'backend-coverage', // Should use consolidated stage ID
        totalRuns: 80, // 50 + 30
        successCount: 65, // 40 + 25
        totalDuration: 160000, // 100000 + 60000
        successRate: 81.25, // 65/80 * 100
        averageDuration: 2000, // 160000/80
      });
    });

    it('should handle multiple duplicate groups in statistics', () => {
      const stageStats = [
        // Backend Coverage duplicates
        {
          stageName: 'Backend Coverage Check',
          stageId: 'backend-coverage',
          totalRuns: 20,
          successCount: 18,
          totalDuration: 40000,
        },
        {
          stageName: 'Backend Coverage Check',
          stageId: 'coverage-backend',
          totalRuns: 30,
          successCount: 27,
          totalDuration: 60000,
        },

        // E2E duplicates
        {
          stageName: 'Playwright E2E Tests',
          stageId: 'e2e-tests',
          totalRuns: 15,
          successCount: 12,
          totalDuration: 180000,
        },
        {
          stageName: 'Playwright E2E Tests',
          stageId: 'playwright-e2e',
          totalRuns: 5,
          successCount: 4,
          totalDuration: 60000,
        },

        // Non-duplicate
        {
          stageName: 'Code Linting',
          stageId: 'lint',
          totalRuns: 100,
          successCount: 95,
          totalDuration: 500000,
        },
      ];

      const merged = service.mergeStageStatistics(stageStats);

      expect(merged).toHaveLength(3);

      // Check merged Backend Coverage
      const backendCoverage = merged.find(s => s.stageName === 'Backend Coverage Check');
      expect(backendCoverage).toEqual({
        stageName: 'Backend Coverage Check',
        stageId: 'backend-coverage',
        totalRuns: 50,
        successCount: 45,
        totalDuration: 100000,
        successRate: 90,
        averageDuration: 2000,
      });

      // Check merged E2E
      const e2e = merged.find(s => s.stageName === 'Playwright E2E Tests');
      expect(e2e).toEqual({
        stageName: 'Playwright E2E Tests',
        stageId: 'e2e-tests',
        totalRuns: 20,
        successCount: 16,
        totalDuration: 240000,
        successRate: 80,
        averageDuration: 12000,
      });

      // Check non-duplicate remains unchanged
      const lint = merged.find(s => s.stageName === 'Code Linting');
      expect(lint).toEqual({
        stageName: 'Code Linting',
        stageId: 'lint',
        totalRuns: 100,
        successCount: 95,
        totalDuration: 500000,
        successRate: 95,
        averageDuration: 5000,
      });
    });
  });

  describe('getConsolidationMapping', () => {
    it('should return mapping of old stage IDs to new consolidated stage IDs', () => {
      const stages: ValidationStageConfig[] = [
        { stageId: 'backend-coverage', name: 'Backend Coverage Check', enabled: false },
        { stageId: 'coverage-backend', name: 'Backend Coverage Check', enabled: true },
        { stageId: 'e2e-tests', name: 'Playwright E2E Tests', enabled: true },
        { stageId: 'playwright-e2e', name: 'Playwright E2E Tests', enabled: false },
      ];

      const mapping = service.getConsolidationMapping(stages);

      expect(mapping).toEqual({
        'backend-coverage': 'coverage-backend',
        'coverage-backend': 'coverage-backend',
        'e2e-tests': 'e2e-tests',
        'playwright-e2e': 'e2e-tests',
      });
    });
  });
});

// Test for Analytics Service integration
describe('AnalyticsService Stage Consolidation Integration', () => {
  it('should apply stage consolidation to validation metrics', async () => {
    // This test will be implemented once we have the consolidated stages working
    // It should verify that the analytics endpoint returns consolidated stage data
    expect(true).toBe(true); // Placeholder for now
  });

  it('should show multiple consolidated stages in stage performance overview', () => {
    // This test defines that the stage performance overview should show
    // all consolidated stages, not just one
    expect(true).toBe(true); // Placeholder for now
  });
});
