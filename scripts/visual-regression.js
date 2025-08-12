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
  console.log('🖼️  Running Visual Regression Tests...');
  
  try {
    // Check if baseline screenshots exist
    const hasBaselines = fs.existsSync(SNAPSHOTS_DIR) && 
                        fs.readdirSync(SNAPSHOTS_DIR).length > 0;
    
    if (!hasBaselines) {
      console.log('📸 No baseline screenshots found. Creating initial baselines...');
      
      // Generate baselines
      execSync('npm run test:e2e -- e2e/dashboard-navigation.spec.ts --update-snapshots', {
        cwd: UI_DIR,
        stdio: 'inherit'
      });
      
      console.log('✅ Baseline screenshots created successfully');
      console.log('ℹ️  Visual regression testing will be active on subsequent runs');
      return 0;
    }
    
    // Run visual regression tests
    console.log('🔍 Comparing current UI against baselines...');
    
    try {
      execSync('npm run test:e2e -- e2e/dashboard-navigation.spec.ts', {
        cwd: UI_DIR,
        stdio: 'pipe'
      });
      
      console.log('✅ Visual regression tests passed - no unexpected UI changes detected');
      return 0;
    } catch (testError) {
      // Visual regression test failed - output details
      console.log('❌ Visual regression tests failed');
      
      if (testError.stdout) {
        console.log('\nTest Output:');
        console.log(testError.stdout.toString());
      }
      
      if (testError.stderr) {
        console.log('\nError Details:');
        console.log(testError.stderr.toString());
      }
      
      throw testError;
    }
    
  } catch (error) {
    console.log('❌ Visual regression tests failed');
    console.log('');
    console.log('This means the UI has changed compared to the baseline screenshots.');
    console.log('');
    console.log('If this change was intentional:');
    console.log('  1. Review the visual differences in the test report');
    console.log('  2. Run: cd ui && npm run test:e2e -- e2e/dashboard-navigation.spec.ts --update-snapshots');
    console.log('  3. Commit the updated baseline screenshots');
    console.log('');
    console.log('If this change was unintentional:');
    console.log('  1. Fix the UI regression');
    console.log('  2. Re-run the validation pipeline');
    console.log('');
    
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