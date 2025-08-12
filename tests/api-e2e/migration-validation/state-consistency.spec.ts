/**
 * Migration State Consistency Test Suite
 * 
 * Tests for validating complete database state and API compatibility after migration.
 * Split into focused modules for better maintainability.
 */

// Import focused test modules
import './state-consistency/database-relationships.spec';
import './state-consistency/api-compatibility.spec';