const { chromium } = require('playwright');

async function testStageManagement() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const apiRequests = [];
  
  page.on('console', (msg) => {
    console.log(`[Console ${msg.type()}] ${msg.text()}`);
  });
  
  page.on('request', (req) => {
    if (req.url().includes('/api/')) {
      apiRequests.push(`${req.method()} ${req.url()}`);
      console.log(`[API Request] ${req.method()} ${req.url()}`);
    }
  });
  
  page.on('response', (res) => {
    if (res.url().includes('/api/')) {
      console.log(`[API Response] ${res.status()} ${res.url()}`);
    }
  });
  
  try {
    console.log('Testing /stage-management page...\n');
    await page.goto('http://localhost:5175/stage-management');
    await page.waitForTimeout(5000);
    
    const pageText = await page.textContent('body');
    const hasStageData = pageText.includes('Code Linting') || pageText.includes('Type Checking');
    const hasLoadingText = pageText.includes('Loading');
    const hasErrorText = pageText.includes('Error') || pageText.includes('Failed');
    
    console.log(`\nPage analysis:`);
    console.log(`- Has stage data: ${hasStageData}`);
    console.log(`- Has loading indicators: ${hasLoadingText}`);
    console.log(`- Has error messages: ${hasErrorText}`);
    console.log(`- API requests made: ${apiRequests.length}`);
    
    if (apiRequests.length === 0) {
      console.log('\n❌ No API requests made! This suggests React Query is not triggering.');
    }
    
    apiRequests.forEach(req => console.log(`  ${req}`));
    
    console.log('\nFirst 300 chars of page:');
    console.log(pageText.substring(0, 300));
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testStageManagement();