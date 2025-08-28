#!/usr/bin/env node

/**
 * Visual Regression Testing Script for Validation Pipeline
 * 
 * This script runs visual regression tests as part of the validation pipeline.
 * It handles baseline management and provides intelligent failure reporting.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const UI_DIR = path.join(__dirname, '../ui');
const SNAPSHOTS_DIR = path.join(UI_DIR, 'e2e/dashboard-navigation.spec.ts-snapshots');

async function runVisualRegressionTests() {
  console.error('🖼️  Running Visual Regression Tests...');
  
  try {
    // Check if baseline screenshots exist
    const hasBaselines = fs.existsSync(SNAPSHOTS_DIR) && 
                        fs.readdirSync(SNAPSHOTS_DIR).length > 0;
    
    if (!hasBaselines) {
      console.error('📸 No baseline screenshots found. Creating initial baselines...');
      
      // Generate baselines
      execSync('npm run test:e2e -- e2e/dashboard-navigation.spec.ts --update-snapshots', {
        cwd: UI_DIR,
        stdio: 'inherit'
      });
      
      console.error('✅ Baseline screenshots created successfully');
      console.error('ℹ️  Visual regression testing will be active on subsequent runs');
      return 0;
    }
    
    // Run visual regression tests
    console.error('🔍 Comparing current UI against baselines...');
    
    try {
      execSync('npm run test:e2e -- e2e/dashboard-navigation.spec.ts', {
        cwd: UI_DIR,
        stdio: 'pipe'
      });
      
      console.error('✅ Visual regression tests passed - no unexpected UI changes detected');
      return 0;
    } catch (testError) {
      // Visual regression test failed - output details
      console.error('❌ Visual regression tests failed');
      
      if (testError.stdout) {
        console.error('\nTest Output:');
        console.error(testError.stdout.toString());
      }
      
      if (testError.stderr) {
        console.error('\nError Details:');
        console.error(testError.stderr.toString());
      }
      
      throw testError;
    }
    
  } catch (error) {
    console.error('❌ Visual regression tests failed');
    console.error('');
    console.error('This means the UI has changed compared to the baseline screenshots.');
    console.error('');
    console.error('If this change was intentional:');
    console.error('  1. Review the visual differences in the test report');
    console.error('  2. Run: cd ui && npm run test:e2e -- e2e/dashboard-navigation.spec.ts --update-snapshots');
    console.error('  3. Commit the updated baseline screenshots');
    console.error('');
    console.error('If this change was unintentional:');
    console.error('  1. Fix the UI regression');
    console.error('  2. Re-run the validation pipeline');
    console.error('');
    
    // In validation pipeline, we continue on failure to allow manual review
    return error.status || 1;
  }
}

// Run the visual regression tests
runVisualRegressionTests()
  .then(exitCode => process.exit(exitCode))
  .catch(error => {
    console.error('💥 Unexpected error during visual regression testing:', error);
    process.exit(1);
  });