/**
 * Referential Integrity and Cascade Deletion Test Suite
 * 
 * Tests for database foreign key constraints, cascade deletions, and referential integrity.
 * Split into focused modules for better maintainability.
 */

// Import focused test modules
import './referential-integrity/foreign-key-constraints.spec';
import './referential-integrity/cascade-deletions.spec';
import './referential-integrity/data-consistency.spec';

// Re-export utilities for referential integrity testing (API-driven approach)
export { TestApiClient } from './setup/api-client';
export { cleanupProjects } from './test-helpers/project-test-utils';