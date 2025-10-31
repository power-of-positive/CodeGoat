/**
 * Tests for validation-stage-configs API routes
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import express from 'express';

// Mock PrismaClient before importing the router
const mockPrismaClient = {
  validationStageConfig: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  $transaction: jest.fn(),
  $disconnect: jest.fn(),
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => mockPrismaClient),
}));

// Mock database service
jest.mock('../../services/database', () => ({
  getDatabaseService: jest.fn().mockImplementation(() => mockPrismaClient),
  createDatabaseService: jest.fn().mockImplementation(() => mockPrismaClient),
}));

// Import router after mocking
import validationStageConfigsRouter from '../../routes/validation-stage-configs';

describe('Validation Stage Configs Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/validation-stage-configs', validationStageConfigsRouter);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /api/validation-stage-configs', () => {
    it('should return all validation stage configurations', async () => {
      const mockStages = [
        {
          id: '1',
          stageId: 'lint',
          name: 'Code Linting',
          command: 'npm run lint',
          timeout: 90000,
          enabled: true,
          continueOnFailure: false,
          priority: 1,
          description: 'Lint code',
          category: 'lint',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          stageId: 'typecheck',
          name: 'Type Checking',
          command: 'npm run type-check',
          timeout: 45000,
          enabled: true,
          continueOnFailure: false,
          priority: 2,
          description: 'Check types',
          category: 'type',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaClient.validationStageConfig.findMany.mockResolvedValue(mockStages);

      const response = await request(app).get('/api/validation-stage-configs').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].stageId).toBe('lint');
      expect(response.body.data[1].stageId).toBe('typecheck');
      expect(response.body.meta).toEqual({
        total: 2,
        enabled: 2,
        disabled: 0,
      });

      expect(mockPrismaClient.validationStageConfig.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: {
          priority: 'asc',
        },
      });
    });

    it('should filter by category', async () => {
      const mockStages = [
        {
          id: '1',
          stageId: 'lint',
          name: 'Code Linting',
          command: 'npm run lint',
          timeout: 90000,
          enabled: true,
          continueOnFailure: false,
          priority: 1,
          description: 'Lint code',
          category: 'lint',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaClient.validationStageConfig.findMany.mockResolvedValue(mockStages);

      const response = await request(app)
        .get('/api/validation-stage-configs?category=lint')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPrismaClient.validationStageConfig.findMany).toHaveBeenCalledWith({
        where: { category: 'lint' },
        orderBy: {
          priority: 'asc',
        },
      });
    });

    it('should filter by enabled status', async () => {
      const mockStages = [
        {
          id: '1',
          stageId: 'lint',
          name: 'Code Linting',
          command: 'npm run lint',
          timeout: 90000,
          enabled: true,
          continueOnFailure: false,
          priority: 1,
          description: 'Lint code',
          category: 'lint',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaClient.validationStageConfig.findMany.mockResolvedValue(mockStages);

      const response = await request(app)
        .get('/api/validation-stage-configs?enabled=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPrismaClient.validationStageConfig.findMany).toHaveBeenCalledWith({
        where: { enabled: true },
        orderBy: {
          priority: 'asc',
        },
      });
    });

    it('should handle database errors', async () => {
      mockPrismaClient.validationStageConfig.findMany.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app).get('/api/validation-stage-configs').expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Failed to fetch validation stage configurations',
      });
    });
  });

  describe('GET /api/validation-stage-configs/:stageId', () => {
    it('should return a specific validation stage configuration', async () => {
      const mockStage = {
        id: '1',
        stageId: 'lint',
        name: 'Code Linting',
        command: 'npm run lint',
        timeout: 90000,
        enabled: true,
        continueOnFailure: false,
        priority: 1,
        description: 'Lint code',
        category: 'lint',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.validationStageConfig.findUnique.mockResolvedValue(mockStage);

      const response = await request(app).get('/api/validation-stage-configs/lint').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stageId).toBe('lint');
      expect(response.body.data.name).toBe('Code Linting');

      expect(mockPrismaClient.validationStageConfig.findUnique).toHaveBeenCalledWith({
        where: { stageId: 'lint' },
      });
    });

    it('should return 404 for non-existent stage', async () => {
      mockPrismaClient.validationStageConfig.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/validation-stage-configs/nonexistent')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Validation stage configuration not found',
      });
    }, 10000);

    it('should handle database errors', async () => {
      mockPrismaClient.validationStageConfig.findUnique.mockRejectedValue(
        new Error('Database error')
      );

      const response = await request(app).get('/api/validation-stage-configs/lint').expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Failed to fetch validation stage configuration',
      });
    });
  });

  describe('POST /api/validation-stage-configs', () => {
    it('should create a new validation stage configuration', async () => {
      const newStage = {
        stageId: 'new-test',
        name: 'New Test Stage',
        command: 'npm run new-test',
        timeout: 60000,
        enabled: true,
        continueOnFailure: false,
        priority: 10,
        description: 'New test stage',
        category: 'test',
      };

      const createdStage = {
        id: '3',
        ...newStage,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.validationStageConfig.findUnique.mockResolvedValue(null);
      mockPrismaClient.validationStageConfig.create.mockResolvedValue(createdStage);

      const response = await request(app)
        .post('/api/validation-stage-configs')
        .send(newStage)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stageId).toBe('new-test');
      expect(response.body.data.name).toBe('New Test Stage');
      expect(response.body.message).toBe('Validation stage configuration created successfully');

      expect(mockPrismaClient.validationStageConfig.create).toHaveBeenCalledWith({
        data: newStage,
      });
    });

    it('should return 409 for duplicate stageId', async () => {
      const existingStage = {
        id: '1',
        stageId: 'lint',
        name: 'Code Linting',
        command: 'npm run lint',
        timeout: 90000,
        enabled: true,
        continueOnFailure: false,
        priority: 1,
        description: 'Lint code',
        category: 'lint',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.validationStageConfig.findUnique.mockResolvedValue(existingStage);

      const newStage = {
        stageId: 'lint',
        name: 'Duplicate Linting',
        command: 'npm run lint',
        priority: 10,
      };

      const response = await request(app)
        .post('/api/validation-stage-configs')
        .send(newStage)
        .expect(409);

      expect(response.body).toEqual({
        success: false,
        message: 'A validation stage with this ID already exists',
      });
    });

    it('should validate required fields', async () => {
      const invalidStage = {
        // Missing required fields
        name: 'Invalid Stage',
      };

      const response = await request(app)
        .post('/api/validation-stage-configs')
        .send(invalidStage)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Stage ID is required');
      expect(response.body.errors).toBeDefined();
    });

    it('should validate stageId format', async () => {
      const invalidStage = {
        stageId: 'invalid stage id!', // Contains invalid characters
        name: 'Invalid Stage',
        command: 'npm run test',
        priority: 1,
      };

      const response = await request(app)
        .post('/api/validation-stage-configs')
        .send(invalidStage)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe(
        'Stage ID must be alphanumeric with hyphens and underscores only'
      );
    }, 10000);

    it('should handle database errors', async () => {
      mockPrismaClient.validationStageConfig.findUnique.mockResolvedValue(null);
      mockPrismaClient.validationStageConfig.create.mockRejectedValue(new Error('Database error'));

      const newStage = {
        stageId: 'test-stage',
        name: 'Test Stage',
        command: 'npm run test',
        priority: 1,
      };

      const response = await request(app)
        .post('/api/validation-stage-configs')
        .send(newStage)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Failed to create validation stage configuration',
      });
    });
  });

  describe('PUT /api/validation-stage-configs/:stageId', () => {
    it('should update a validation stage configuration', async () => {
      const existingStage = {
        id: '1',
        stageId: 'lint',
        name: 'Code Linting',
        command: 'npm run lint',
        timeout: 90000,
        enabled: true,
        continueOnFailure: false,
        priority: 1,
        description: 'Lint code',
        category: 'lint',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateData = {
        name: 'Updated Code Linting',
        timeout: 120000,
      };

      const updatedStage = {
        ...existingStage,
        ...updateData,
        updatedAt: new Date(),
      };

      mockPrismaClient.validationStageConfig.findUnique.mockResolvedValue(existingStage);
      mockPrismaClient.validationStageConfig.update.mockResolvedValue(updatedStage);

      const response = await request(app)
        .put('/api/validation-stage-configs/lint')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.name).toBe('Updated Code Linting');
      expect(response.body.data.timeout).toBe(120000);
      expect(response.body.message).toBe('Validation stage configuration updated successfully');

      expect(mockPrismaClient.validationStageConfig.update).toHaveBeenCalledWith({
        where: { stageId: 'lint' },
        data: updateData,
      });
    });

    it('should return 404 for non-existent stage', async () => {
      mockPrismaClient.validationStageConfig.findUnique.mockResolvedValue(null);

      const updateData = {
        name: 'Updated Name',
      };

      const response = await request(app)
        .put('/api/validation-stage-configs/nonexistent')
        .send(updateData)
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Validation stage configuration not found',
      });
    });

    it('should validate update data', async () => {
      const invalidUpdate = {
        timeout: -1000, // Invalid timeout
      };

      const response = await request(app)
        .put('/api/validation-stage-configs/lint')
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Timeout must be at least 1000ms');
    });

    it('should handle database errors', async () => {
      const existingStage = {
        id: '1',
        stageId: 'lint',
        name: 'Code Linting',
        command: 'npm run lint',
        timeout: 90000,
        enabled: true,
        continueOnFailure: false,
        priority: 1,
        description: 'Lint code',
        category: 'lint',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.validationStageConfig.findUnique.mockResolvedValue(existingStage);
      mockPrismaClient.validationStageConfig.update.mockRejectedValue(new Error('Database error'));

      const updateData = {
        name: 'Updated Name',
      };

      const response = await request(app)
        .put('/api/validation-stage-configs/lint')
        .send(updateData)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Failed to update validation stage configuration',
      });
    });
  });

  describe('DELETE /api/validation-stage-configs/:stageId', () => {
    it('should delete a validation stage configuration', async () => {
      const existingStage = {
        id: '1',
        stageId: 'lint',
        name: 'Code Linting',
        command: 'npm run lint',
        timeout: 90000,
        enabled: true,
        continueOnFailure: false,
        priority: 1,
        description: 'Lint code',
        category: 'lint',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.validationStageConfig.findUnique.mockResolvedValue(existingStage);
      mockPrismaClient.validationStageConfig.delete.mockResolvedValue(existingStage);

      const response = await request(app).delete('/api/validation-stage-configs/lint').expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Validation stage configuration deleted successfully',
      });

      expect(mockPrismaClient.validationStageConfig.delete).toHaveBeenCalledWith({
        where: { stageId: 'lint' },
      });
    });

    it('should return 404 for non-existent stage', async () => {
      mockPrismaClient.validationStageConfig.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/validation-stage-configs/nonexistent')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Validation stage configuration not found',
      });
    });

    it('should handle database errors', async () => {
      const existingStage = {
        id: '1',
        stageId: 'lint',
        name: 'Code Linting',
        command: 'npm run lint',
        timeout: 90000,
        enabled: true,
        continueOnFailure: false,
        priority: 1,
        description: 'Lint code',
        category: 'lint',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaClient.validationStageConfig.findUnique.mockResolvedValue(existingStage);
      mockPrismaClient.validationStageConfig.delete.mockRejectedValue(new Error('Database error'));

      const response = await request(app).delete('/api/validation-stage-configs/lint').expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Failed to delete validation stage configuration',
      });
    });
  });

  describe('POST /api/validation-stage-configs/:stageId/toggle', () => {
    it('should toggle enabled status', async () => {
      const existingStage = {
        id: '1',
        stageId: 'lint',
        name: 'Code Linting',
        command: 'npm run lint',
        timeout: 90000,
        enabled: true,
        continueOnFailure: false,
        priority: 1,
        description: 'Lint code',
        category: 'lint',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const toggledStage = {
        ...existingStage,
        enabled: false,
        updatedAt: new Date(),
      };

      mockPrismaClient.validationStageConfig.findUnique.mockResolvedValue(existingStage);
      mockPrismaClient.validationStageConfig.update.mockResolvedValue(toggledStage);

      const response = await request(app)
        .post('/api/validation-stage-configs/lint/toggle')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.enabled).toBe(false);
      expect(response.body.message).toBe('Validation stage disabled successfully');

      expect(mockPrismaClient.validationStageConfig.update).toHaveBeenCalledWith({
        where: { stageId: 'lint' },
        data: { enabled: false },
      });
    });

    it('should return 404 for non-existent stage', async () => {
      mockPrismaClient.validationStageConfig.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/validation-stage-configs/nonexistent/toggle')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Validation stage configuration not found',
      });
    });
  });

  describe('POST /api/validation-stage-configs/reorder', () => {
    it('should reorder validation stages', async () => {
      const reorderData = {
        stages: [
          { stageId: 'lint', priority: 2 },
          { stageId: 'typecheck', priority: 1 },
        ],
      };

      const reorderedStages = [
        {
          id: '2',
          stageId: 'typecheck',
          name: 'Type Checking',
          command: 'npm run type-check',
          timeout: 45000,
          enabled: true,
          continueOnFailure: false,
          priority: 1,
          description: 'Check types',
          category: 'type',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '1',
          stageId: 'lint',
          name: 'Code Linting',
          command: 'npm run lint',
          timeout: 90000,
          enabled: true,
          continueOnFailure: false,
          priority: 2,
          description: 'Lint code',
          category: 'lint',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaClient.$transaction.mockResolvedValue(undefined);
      mockPrismaClient.validationStageConfig.findMany.mockResolvedValue(reorderedStages);

      const response = await request(app)
        .post('/api/validation-stage-configs/reorder')
        .send(reorderData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].stageId).toBe('typecheck');
      expect(response.body.data[1].stageId).toBe('lint');
      expect(response.body.message).toBe('Validation stages reordered successfully');

      expect(mockPrismaClient.$transaction).toHaveBeenCalled();
    });

    it('should validate reorder data', async () => {
      const invalidData = {
        stages: 'invalid', // Should be array
      };

      const response = await request(app)
        .post('/api/validation-stage-configs/reorder')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid input: expected array, received string');
    });

    it('should handle database errors during reorder', async () => {
      const reorderData = {
        stages: [{ stageId: 'lint', priority: 2 }],
      };

      mockPrismaClient.$transaction.mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .post('/api/validation-stage-configs/reorder')
        .send(reorderData)
        .expect(500);

      expect(response.body).toEqual({
        success: false,
        message: 'Failed to reorder validation stage configurations',
      });
    });
  });
});
