/**
 * Cascade Deletion Tests Index
 * 
 * Main entry point for all cascade deletion tests.
 * Individual test suites have been split into focused files for clean code compliance.
 * 
 * Test organization:
 * - cascade-basic.spec.ts: Basic project/task cascade deletion tests
 * - cascade-parent-child.spec.ts: Parent-child relationship deletion tests
 */

// Re-export test suites for discoverability
export * from './cascade-basic.spec';
export * from './cascade-parent-child.spec';
