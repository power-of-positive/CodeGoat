import { createDatabaseService, getDatabaseService } from '../../services/database';
import { createMockLogger } from '../../test-helpers/logger.mock';

// Mock PrismaClient
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $disconnect: jest.fn(),
  })),
}));

describe('Database Service', () => {
  let mockLogger: any;
  let originalProcessOn: typeof process.on;
  let processOnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset module state by clearing require cache
    jest.resetModules();

    // Mock process.on
    originalProcessOn = process.on;
    processOnSpy = jest.spyOn(process, 'on');

    mockLogger = createMockLogger();

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original process.on
    process.on = originalProcessOn;
  });

  describe('createDatabaseService', () => {
    it('should create a new PrismaClient instance on first call', () => {
      const { createDatabaseService } = require('../../services/database');
      const { PrismaClient } = require('@prisma/client');

      const dbService = createDatabaseService(mockLogger);

      expect(PrismaClient).toHaveBeenCalledTimes(1);
      expect(dbService).toBeDefined();
    });

    it('should return the same instance on subsequent calls', () => {
      const { createDatabaseService } = require('../../services/database');
      const { PrismaClient } = require('@prisma/client');

      const dbService1 = createDatabaseService(mockLogger);
      const dbService2 = createDatabaseService(mockLogger);

      expect(PrismaClient).toHaveBeenCalledTimes(1);
      expect(dbService1).toBe(dbService2);
    });

    it('should set up beforeExit handler on first call', () => {
      const { createDatabaseService } = require('../../services/database');

      createDatabaseService(mockLogger);

      expect(processOnSpy).toHaveBeenCalledWith('beforeExit', expect.any(Function));
    });

    it('should not set up duplicate beforeExit handlers on subsequent calls', () => {
      const { createDatabaseService } = require('../../services/database');

      createDatabaseService(mockLogger);
      createDatabaseService(mockLogger);

      // Should only be called once
      expect(processOnSpy).toHaveBeenCalledTimes(1);
      expect(processOnSpy).toHaveBeenCalledWith('beforeExit', expect.any(Function));
    });
  });

  describe('getDatabaseService', () => {
    it('should return the existing database service when already initialized', () => {
      const { createDatabaseService, getDatabaseService } = require('../../services/database');

      const created = createDatabaseService(mockLogger);
      const retrieved = getDatabaseService();

      expect(retrieved).toBe(created);
    });

    it('should throw error when database service not initialized', () => {
      const { getDatabaseService } = require('../../services/database');

      expect(() => {
        getDatabaseService();
      }).toThrow('Database service not initialized. Call createDatabaseService first.');
    });
  });

  describe('beforeExit handler', () => {
    it('should disconnect from database on beforeExit', async () => {
      const { createDatabaseService } = require('../../services/database');

      const dbService = createDatabaseService(mockLogger);

      // Get the beforeExit handler
      expect(processOnSpy).toHaveBeenCalledWith('beforeExit', expect.any(Function));
      const beforeExitHandler = processOnSpy.mock.calls[0][1];

      // Execute the handler
      await beforeExitHandler();

      // Wait for the async handler to complete
      await new Promise(resolve => setImmediate(resolve));

      expect(dbService.$disconnect).toHaveBeenCalled();
    });

    it('should handle disconnect errors gracefully', async () => {
      const { createDatabaseService } = require('../../services/database');
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const dbService = createDatabaseService(mockLogger);
      dbService.$disconnect.mockRejectedValue(new Error('Disconnect failed'));

      // Get the beforeExit handler
      const beforeExitHandler = processOnSpy.mock.calls[0][1];

      // Execute the handler
      await beforeExitHandler();

      // Wait for the async handler to complete and error handling
      await new Promise(resolve => setImmediate(resolve));

      expect(consoleSpy).toHaveBeenCalledWith('Error disconnecting Prisma:', expect.any(Error));

      consoleSpy.mockRestore();
    });

    it('should handle case where prisma is null during shutdown', async () => {
      const { createDatabaseService } = require('../../services/database');

      createDatabaseService(mockLogger);

      // Get the beforeExit handler
      const beforeExitHandler = processOnSpy.mock.calls[0][1];

      // Reset modules to clear the prisma singleton
      jest.resetModules();

      // Execute the handler when module is reset (prisma would be null)
      await beforeExitHandler();

      // Should not throw error - this tests the null check in the beforeExit handler
      expect(true).toBe(true); // Just verify no errors occurred
    });
  });
});
