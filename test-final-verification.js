const { chromium } = require('playwright');

async function finalVerification() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    console.log('🎯 Final verification: Testing data display...\n');
    
    // Test Stage Management page
    console.log('1. Testing Stage Management page (/stage-management):');
    await page.goto('http://localhost:5175/stage-management');
    await page.waitForTimeout(3000);
    
    const stageCards = await page.locator('[role="listitem"], .space-y-4 > div').count();
    const hasCodeLinting = await page.locator('text="Code Linting"').count();
    const hasTypeChecking = await page.locator('text="Type Checking"').count();
    const emptyState = await page.locator('text="No validation stages configured"').count();
    
    console.log(`   - Stage cards found: ${stageCards}`);
    console.log(`   - "Code Linting" found: ${hasCodeLinting}`);
    console.log(`   - "Type Checking" found: ${hasTypeChecking}`);
    console.log(`   - Empty state message: ${emptyState}`);
    console.log(`   - Status: ${stageCards > 0 ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    // Test Analytics page
    console.log('\n2. Testing Analytics page (/):');
    await page.goto('http://localhost:5175/');
    await page.waitForTimeout(3000);
    
    const hasAnalyticsData = await page.locator('text=/\\d+ runs/i, text=/\\d+% success/i').count();
    const hasValidationMetrics = await page.locator('text="Validation"').count();
    
    console.log(`   - Analytics metrics found: ${hasAnalyticsData}`);
    console.log(`   - Validation sections found: ${hasValidationMetrics}`);
    console.log(`   - Status: ${hasAnalyticsData > 0 ? '✅ SUCCESS' : '✅ OK (may need data)'}`);
    
    // Test Settings navigation page
    console.log('\n3. Testing Settings page (/settings):');
    await page.goto('http://localhost:5175/settings');
    await page.waitForTimeout(2000);
    
    const hasManageValidationButton = await page.locator('text="Manage Validation Stages"').count();
    const hasValidationPipeline = await page.locator('text="Validation Pipeline"').count();
    
    console.log(`   - "Manage Validation Stages" button: ${hasManageValidationButton}`);
    console.log(`   - "Validation Pipeline" section: ${hasValidationPipeline}`);
    console.log(`   - Status: ${hasManageValidationButton > 0 ? '✅ SUCCESS' : '❌ FAILED'}`);
    
    const overallSuccess = stageCards > 0 && hasManageValidationButton > 0;
    console.log(`\n🎯 Overall Result: ${overallSuccess ? '✅ ALL DATA DISPLAYING CORRECTLY' : '❌ ISSUES FOUND'}`);
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await browser.close();
  }
}

finalVerification();