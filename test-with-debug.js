const { chromium } = require('playwright');

async function testWithDebug() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  const debugLogs = [];
  
  page.on('console', (msg) => {
    const text = msg.text();
    console.log(`[Console ${msg.type()}] ${text}`);
    
    if (text.includes('StageManagement Debug')) {
      debugLogs.push(text);
    }
  });
  
  try {
    console.log('Loading stage management with debug logging...\n');
    await page.goto('http://localhost:5175/stage-management');
    await page.waitForTimeout(5000);
    
    console.log(`\nCaptured ${debugLogs.length} debug logs:`);
    debugLogs.forEach(log => console.log(`  ${log}`));
    
    if (debugLogs.length === 0) {
      console.log('❌ No debug logs captured - component might not be rendering');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testWithDebug();