/**
 * Foreign Key Constraints Tests Index
 * 
 * Main entry point for all foreign key constraint validation tests.
 * Individual test suites have been split into focused files for clean code compliance.
 * 
 * Test organization:
 * - foreign-key-basic.spec.ts: Basic foreign key constraint validation tests
 * - foreign-key-relationships.spec.ts: Parent-child and template relationship tests
 */

// Re-export test suites for discoverability
export * from './foreign-key-basic.spec';
export * from './foreign-key-relationships.spec';
