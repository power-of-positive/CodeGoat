import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Launch browser and create context for authentication/session setup if needed
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Wait for both services to be available
    const maxRetries = 30;
    let retries = 0;
    
    // Check if backend is ready
    while (retries < maxRetries) {
      try {
        const response = await page.request.get('http://localhost:3001/health', { 
          timeout: 5000 
        });
        if (response.ok()) break;
      } catch (e) {
        // Service not ready yet
      }
      
      retries++;
      await page.waitForTimeout(2000);
      
      if (retries >= maxRetries) {
        console.error('Backend service did not start in time');
        throw new Error('Backend service did not start in time');
      }
    }

    retries = 0;
    // Check if frontend is ready
    while (retries < maxRetries) {
      try {
        const response = await page.request.get('http://localhost:5173/', { 
          timeout: 5000 
        });
        if (response.ok()) break;
      } catch (e) {
        // Service not ready yet
      }
      
      retries++;
      await page.waitForTimeout(2000);
      
      if (retries >= maxRetries) {
        console.error('Frontend service did not start in time');
        throw new Error('Frontend service did not start in time');
      }
    }

    console.log('✅ Both services are ready');
    
  } finally {
    await context.close();
    await browser.close();
  }
}

export default globalSetup;