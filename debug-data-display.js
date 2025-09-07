const { chromium } = require('playwright');

async function debugDataDisplay() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Listen for console messages
  page.on('console', (msg) => {
    console.log(`Console ${msg.type()}: ${msg.text()}`);
  });

  // Listen for network errors
  page.on('requestfailed', (request) => {
    console.log(`❌ Network request failed: ${request.url()} - ${request.failure()?.errorText}`);
  });

  try {
    console.log('🔍 Testing Settings page data display...\n');
    
    await page.goto('http://localhost:5175/settings');
    await page.waitForTimeout(3000); // Wait for page to load
    
    // Check if validation stages are visible
    const stageElements = await page.locator('[data-testid="stage-item"], .validation-stage, [class*="stage"]').count();
    console.log(`Found ${stageElements} stage elements on page`);
    
    // Check for loading states
    const loadingElements = await page.locator('text=Loading').count();
    console.log(`Found ${loadingElements} loading indicators`);
    
    // Check for error messages
    const errorElements = await page.locator('text=Error, [class*="error"]').count();
    console.log(`Found ${errorElements} error messages`);
    
    // Get page content snippet
    const pageText = await page.textContent('body');
    const hasStageData = pageText.includes('Code Linting') || pageText.includes('Type Checking');
    console.log(`Page contains validation stage data: ${hasStageData}`);
    
    // Check network requests
    const responses = [];
    page.on('response', (response) => {
      if (response.url().includes('validation') || response.url().includes('analytics')) {
        responses.push(`${response.status()} ${response.url()}`);
      }
    });
    
    await page.reload();
    await page.waitForTimeout(2000);
    
    console.log('\n📡 Network requests:');
    responses.forEach(r => console.log(`  ${r}`));
    
  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
  } finally {
    await browser.close();
  }
}

debugDataDisplay();