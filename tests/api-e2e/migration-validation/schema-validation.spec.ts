import './schema-validation/table-structure.spec';
import './schema-validation/constraint-validation.spec';
import './schema-validation/migration-files.spec';

// Re-export utilities for schema validation (API-driven approach)
export { TestApiClient } from '../setup/api-client';
export { cleanupProjects } from '../test-helpers/project-test-utils';
