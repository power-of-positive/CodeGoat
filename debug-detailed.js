const { chromium } = require('playwright');

async function debugDetailed() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  const networkRequests = [];
  const consoleMessages = [];

  // Capture all console messages
  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push(`${msg.type()}: ${text}`);
    console.log(`[Console ${msg.type()}] ${text}`);
  });

  // Capture all network requests
  page.on('request', (request) => {
    networkRequests.push(`${request.method()} ${request.url()}`);
  });

  page.on('response', (response) => {
    console.log(`[Response] ${response.status()} ${response.url()}`);
  });

  // Capture JavaScript errors
  page.on('pageerror', (error) => {
    console.log(`[Page Error] ${error.message}`);
  });

  try {
    console.log('🔍 Navigating to settings page...\n');
    await page.goto('http://localhost:5175/settings');
    
    // Wait longer and check for data
    await page.waitForTimeout(5000);
    
    // Check what's actually rendered
    const bodyText = await page.textContent('body');
    console.log('\n📄 Page body text (first 500 chars):');
    console.log(bodyText.substring(0, 500));
    
    // Look for specific elements
    const elements = await page.locator('*').all();
    console.log(`\n📊 Total DOM elements: ${elements.length}`);
    
    // Check for React Query elements
    const reactQueryElements = await page.locator('[data-testid*="query"], [data-react-query]').count();
    console.log(`React Query elements: ${reactQueryElements}`);
    
    // Check for API request URLs in network tab
    console.log('\n📡 All network requests:');
    const apiRequests = networkRequests.filter(req => req.includes('/api/'));
    console.log(`API requests: ${apiRequests.length}`);
    apiRequests.forEach(req => console.log(`  ${req}`));
    
    // Check if React app loaded
    const reactRoot = await page.locator('#root').innerHTML();
    const hasReactContent = reactRoot.length > 100;
    console.log(`\nReact app loaded: ${hasReactContent} (root innerHTML length: ${reactRoot.length})`);
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  } finally {
    await browser.close();
  }
}

debugDetailed();