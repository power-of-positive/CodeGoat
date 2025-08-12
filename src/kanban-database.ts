/**
 * Kanban Database Initialization
 * Provides a singleton instance of the Kanban database service
 */

import { KanbanDatabaseService } from './services/kanban-database.service';
import { ILogger } from './logger-interface';

let kanbanDbInstance: KanbanDatabaseService | null = null;

/**
 * Initialize the Kanban database service
 */
export function initializeKanbanDatabase(logger: ILogger): KanbanDatabaseService {
  if (!kanbanDbInstance) {
    kanbanDbInstance = new KanbanDatabaseService(logger);
  }
  return kanbanDbInstance;
}

/**
 * Get the Kanban database service instance
 * Throws an error if not initialized
 */
export function getKanbanDatabase(): KanbanDatabaseService {
  if (!kanbanDbInstance) {
    throw new Error('Kanban database not initialized. Call initializeKanbanDatabase() first.');
  }
  return kanbanDbInstance;
}

/**
 * Check if Kanban database is initialized
 */
export function isKanbanDatabaseInitialized(): boolean {
  return kanbanDbInstance !== null;
}
