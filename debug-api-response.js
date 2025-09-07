const { chromium } = require('playwright');

async function debugAPIResponse() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Capture API responses
  const apiResponses = [];
  
  page.on('response', async (response) => {
    if (response.url().includes('/api/validation-stage-configs')) {
      try {
        const data = await response.json();
        apiResponses.push({
          url: response.url(),
          status: response.status(),
          data: data
        });
        console.log('API Response captured:', {
          url: response.url(),
          status: response.status(),
          success: data.success,
          dataLength: data.data?.length,
          firstStage: data.data?.[0]?.name || 'No stages'
        });
      } catch (e) {
        console.error('Failed to parse API response:', e.message);
      }
    }
  });
  
  try {
    console.log('Loading stage management page...\n');
    await page.goto('http://localhost:5175/stage-management');
    await page.waitForTimeout(3000);
    
    // Wait for any loading states to finish
    await page.waitForFunction(() => {
      const body = document.body.textContent || '';
      return !body.includes('Loading');
    }, { timeout: 10000 });
    
    // Check what's actually in the DOM
    const stageCards = await page.locator('.space-y-4 > *').count();
    const anyStageText = await page.locator('text="Code Linting"').count();
    const emptyStateText = await page.locator('text="No validation stages configured"').count();
    
    console.log('\nDOM Analysis:');
    console.log(`- Stage cards found: ${stageCards}`);
    console.log(`- "Code Linting" text found: ${anyStageText}`);
    console.log(`- Empty state message: ${emptyStateText}`);
    
    // Check if data is actually being used
    if (apiResponses.length > 0) {
      const response = apiResponses[0];
      console.log('\nDetailed API Response:');
      console.log(`- Success: ${response.data.success}`);
      console.log(`- Data array length: ${response.data.data?.length}`);
      if (response.data.data?.length > 0) {
        console.log(`- First 3 stages:`);
        response.data.data.slice(0, 3).forEach((stage, i) => {
          console.log(`  ${i + 1}. ${stage.name} (${stage.enabled ? 'enabled' : 'disabled'})`);
        });
      }
    } else {
      console.log('❌ No API responses captured');
    }
    
  } catch (error) {
    console.error('Debug failed:', error.message);
  } finally {
    await browser.close();
  }
}

debugAPIResponse();