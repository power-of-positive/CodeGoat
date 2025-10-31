#!/usr/bin/env node
/**
 * Quick test script to verify schema validation works
 * Run with: node test-schema-validation.js
 */

async function testSchemaValidation() {
  console.log('🧪 Testing Schema Validation\n');

  // Test 1: Valid request (should pass)
  console.log('Test 1: Valid request');
  try {
    const response = await fetch('http://localhost:3001/api/claude-workers/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: 'test-123',
        taskContent: 'Test task content',
      }),
    });
    const data = await response.json();
    if (response.ok) {
      console.log('✅ PASS: Valid request accepted');
    } else {
      console.log('❌ FAIL: Valid request rejected:', data);
    }
  } catch (error) {
    console.log('ℹ️  Server not running:', error.message);
  }

  // Test 2: Missing taskContent (should fail with validation error)
  console.log('\nTest 2: Missing required field (taskContent)');
  try {
    const response = await fetch('http://localhost:3001/api/claude-workers/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: 'test-123',
        // taskContent missing!
      }),
    });
    const data = await response.json();
    if (!response.ok && data.error === 'Validation failed') {
      console.log('✅ PASS: Invalid request rejected with validation error');
      console.log('   Details:', JSON.stringify(data.details, null, 2));
    } else {
      console.log('❌ FAIL: Invalid request should have been rejected');
    }
  } catch (error) {
    console.log('ℹ️  Server not running:', error.message);
  }

  // Test 3: Empty taskContent (should fail)
  console.log('\nTest 3: Empty string for required field');
  try {
    const response = await fetch('http://localhost:3001/api/claude-workers/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        taskId: 'test-123',
        taskContent: '',  // Empty string
      }),
    });
    const data = await response.json();
    if (!response.ok && data.error === 'Validation failed') {
      console.log('✅ PASS: Empty string rejected');
      console.log('   Details:', JSON.stringify(data.details, null, 2));
    } else {
      console.log('❌ FAIL: Empty string should have been rejected');
    }
  } catch (error) {
    console.log('ℹ️  Server not running:', error.message);
  }

  console.log('\n📋 Summary:');
  console.log('If all tests show ✅ PASS, schema validation is working correctly!');
  console.log('If you see "Server not running", start the backend with: npm run dev');
}

testSchemaValidation();
