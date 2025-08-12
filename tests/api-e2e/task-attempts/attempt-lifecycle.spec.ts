/**
 * Task Attempt Lifecycle Tests Index
 * 
 * Main entry point for all task attempt lifecycle tests.
 * Individual test suites have been split into focused files for clean code compliance.
 * 
 * Test organization:
 * - attempt-basic.spec.ts: Basic attempt lifecycle and retrieval tests
 * - attempt-operations.spec.ts: Attempt deletion and timestamp operation tests
 */

// Re-export test suites for discoverability
export * from './attempt-basic.spec';
export * from './attempt-operations.spec';