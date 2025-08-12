/**
 * Migration Validation Test Suite
 * 
 * Comprehensive tests to validate database schema, data migration compatibility,
 * and API consistency during backend migration from Rust.
 * 
 * This file orchestrates the migration validation test modules:
 * - Schema validation tests
 * - Data migration and compatibility tests  
 * - State consistency validation
 * - Rollback and recovery testing
 */

// Import all migration validation test modules
import './migration-validation/schema-validation.spec';
import './migration-validation/data-migration.spec';
import './migration-validation/state-consistency.spec';
import './migration-validation/rollback-recovery.spec';

// Re-export common utilities for migration validation (API-driven approach)
export { TestApiClient } from './setup/api-client';
export { cleanupProjects } from './test-helpers/project-test-utils';

/**
 * Migration validation checklist:
 * - [ ] All database schema validation tests pass
 * - [ ] Data migration compatibility tests pass 
 * - [ ] Database state consistency maintained
 * - [ ] Transaction rollback and recovery work correctly
 * - [ ] API endpoints remain compatible after migration
 * - [ ] Foreign key constraints and referential integrity maintained
 * - [ ] All migration files have valid SQL syntax
 * - [ ] Enum values and data type constraints enforced
 */