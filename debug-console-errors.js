const { chromium } = require('playwright');

async function debugConsoleErrors() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const consoleMessages = [];
  const errors = [];
  
  page.on('console', (msg) => {
    const text = msg.text();
    consoleMessages.push({
      type: msg.type(),
      text: text
    });
    
    if (msg.type() === 'error') {
      console.log(`🚨 Console Error: ${text}`);
      errors.push(text);
    } else if (msg.type() === 'warn') {
      console.log(`⚠️ Console Warning: ${text}`);
    }
  });
  
  page.on('pageerror', (error) => {
    console.log(`💥 Page Error: ${error.message}`);
    errors.push(`Page Error: ${error.message}`);
  });
  
  try {
    console.log('Loading page and checking for errors...\n');
    await page.goto('http://localhost:5175/stage-management');
    await page.waitForTimeout(5000);
    
    // Add some debugging to the page
    const debugInfo = await page.evaluate(() => {
      // Try to access React Query data directly
      let reactQueryData = null;
      try {
        // Check if there are any query-related errors or data
        const queryClient = window.__REACT_QUERY_CLIENT__;
        if (queryClient) {
          const queries = queryClient.getQueriesData(['validation-stages']);
          reactQueryData = queries;
        }
      } catch (e) {
        // React Query debug not available
      }
      
      return {
        bodyText: document.body.textContent?.substring(0, 200) || '',
        hasReactQueryClient: !!window.__REACT_QUERY_CLIENT__,
        reactQueryData: reactQueryData
      };
    });
    
    console.log('Debug Info:');
    console.log(`- Page loaded successfully`);
    console.log(`- Body text starts with: "${debugInfo.bodyText}"`);
    console.log(`- Has React Query client: ${debugInfo.hasReactQueryClient}`);
    
    console.log(`\nTotal console messages: ${consoleMessages.length}`);
    console.log(`- Errors: ${consoleMessages.filter(m => m.type === 'error').length}`);
    console.log(`- Warnings: ${consoleMessages.filter(m => m.type === 'warn').length}`);
    console.log(`- Info/Debug: ${consoleMessages.filter(m => ['info', 'debug', 'log'].includes(m.type)).length}`);
    
    if (errors.length === 0) {
      console.log('\n✅ No JavaScript errors found');
      console.log('🔍 This suggests the issue is with data flow, not JavaScript errors');
    } else {
      console.log(`\n❌ Found ${errors.length} errors - these might explain the issue`);
    }
    
  } catch (error) {
    console.error('Debug script failed:', error.message);
  } finally {
    await browser.close();
  }
}

debugConsoleErrors();