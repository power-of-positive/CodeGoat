const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function createVisualAnalyticsTest() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set viewport for consistent screenshots
  await page.setViewportSize({ width: 1920, height: 1080 });
  
  const screenshotsDir = './analytics-screenshots';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }
  
  const apiRequests = [];
  const consoleErrors = [];
  
  // Monitor network requests
  page.on('request', (request) => {
    if (request.url().includes('/api/analytics')) {
      apiRequests.push({
        url: request.url(),
        method: request.method()
      });
      console.log(`📡 API Request: ${request.method()} ${request.url()}`);
    }
  });
  
  page.on('response', async (response) => {
    if (response.url().includes('/api/analytics')) {
      try {
        const data = await response.json();
        console.log(`📊 API Response: ${response.status()} ${response.url()}`);
        console.log(`   Data keys: ${Object.keys(data).join(', ')}`);
        if (data.totalRuns !== undefined) {
          console.log(`   Total runs: ${data.totalRuns}`);
        }
        if (data.successRate !== undefined) {
          console.log(`   Success rate: ${data.successRate}%`);
        }
      } catch (e) {
        console.log(`📊 API Response: ${response.status()} ${response.url()} (failed to parse JSON)`);
      }
    }
  });
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log(`🚨 Console Error: ${msg.text()}`);
    }
  });
  
  try {
    console.log('🎯 Creating visual regression test for analytics page...\n');
    
    // 1. Navigate to analytics page
    console.log('1. Navigating to validation analytics page (/)...');
    await page.goto('http://localhost:5175/', { waitUntil: 'networkidle' });
    
    // Wait for any loading states to complete
    await page.waitForTimeout(3000);
    
    // Take full page screenshot
    await page.screenshot({ 
      path: `${screenshotsDir}/analytics-full-page.png`,
      fullPage: true 
    });
    
    // Take viewport screenshot
    await page.screenshot({ 
      path: `${screenshotsDir}/analytics-viewport.png` 
    });
    
    console.log('   ✅ Screenshots captured');
    
    // 2. Analyze page content
    console.log('\\n2. Analyzing page content...');
    
    const pageContent = await page.evaluate(() => {
      const body = document.body;
      
      // Look for specific analytics elements
      const analyticsMetrics = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        return text.includes('total runs') || 
               text.includes('success rate') || 
               text.includes('validation') || 
               text.includes('metrics') ||
               text.includes('analytics');
      });
      
      // Look for loading indicators
      const loadingElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        return text.includes('loading') || text.includes('spinner');
      });
      
      // Look for error messages
      const errorElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        return text.includes('error') || text.includes('failed') || text.includes('no data');
      });
      
      // Look for charts/visualizations
      const chartElements = document.querySelectorAll('canvas, svg, .recharts-wrapper, .chart, [class*="chart"]');
      
      // Look for data tables
      const tableElements = document.querySelectorAll('table, .table, [class*="table"]');
      
      return {
        title: document.title,
        bodyText: body.textContent?.substring(0, 500) || '',
        analyticsMetricsCount: analyticsMetrics.length,
        loadingElementsCount: loadingElements.length,
        errorElementsCount: errorElements.length,
        chartElementsCount: chartElements.length,
        tableElementsCount: tableElements.length,
        hasValidationText: body.textContent?.includes('validation') || false,
        hasMetricsText: body.textContent?.includes('metrics') || false,
        hasAnalyticsText: body.textContent?.includes('analytics') || false,
        metricsElements: analyticsMetrics.map(el => ({
          tagName: el.tagName,
          text: el.textContent?.substring(0, 100),
          className: el.className
        })).slice(0, 10)
      };
    });
    
    console.log('   Page title:', pageContent.title);
    console.log('   Analytics metrics elements:', pageContent.analyticsMetricsCount);
    console.log('   Loading indicators:', pageContent.loadingElementsCount);
    console.log('   Error messages:', pageContent.errorElementsCount);
    console.log('   Chart elements:', pageContent.chartElementsCount);
    console.log('   Table elements:', pageContent.tableElementsCount);
    console.log('   Has "validation" text:', pageContent.hasValidationText);
    console.log('   Has "metrics" text:', pageContent.hasMetricsText);
    console.log('   Has "analytics" text:', pageContent.hasAnalyticsText);
    
    if (pageContent.metricsElements.length > 0) {
      console.log('\\n   Found metrics elements:');
      pageContent.metricsElements.forEach((el, i) => {
        console.log(`     ${i + 1}. ${el.tagName}: "${el.text}" (class: ${el.className})`);
      });
    }
    
    console.log('\\n   First 200 chars of page:');
    console.log(`   "${pageContent.bodyText.substring(0, 200)}"`);
    
    // 3. Take targeted screenshots of specific sections
    console.log('\\n3. Taking targeted screenshots...');
    
    // Try to find and screenshot specific analytics sections
    const sections = await page.locator('section, .section, [class*="analytics"], [class*="metrics"], main > div').all();
    for (let i = 0; i < Math.min(sections.length, 5); i++) {
      try {
        await sections[i].screenshot({ path: `${screenshotsDir}/section-${i + 1}.png` });
        console.log(`   ✅ Screenshot section ${i + 1}`);
      } catch (e) {
        console.log(`   ❌ Failed to screenshot section ${i + 1}: ${e.message}`);
      }
    }
    
    // 4. Test different routes that might have analytics
    const analyticsRoutes = ['/', '/analytics', '/validation', '/metrics'];
    for (const route of analyticsRoutes) {
      try {
        console.log(`\\n4. Testing route: ${route}`);
        await page.goto(`http://localhost:5175${route}`, { waitUntil: 'networkidle', timeout: 10000 });
        await page.waitForTimeout(2000);
        
        const routeExists = !page.url().includes('404') && page.url().includes(route.slice(1) || 'localhost:5175/');
        console.log(`   Route exists: ${routeExists}`);
        
        if (routeExists) {
          await page.screenshot({ 
            path: `${screenshotsDir}/route-${route.replace('/', 'root')}.png` 
          });
          console.log(`   ✅ Screenshot saved for ${route}`);
        }
      } catch (e) {
        console.log(`   ❌ Failed to test route ${route}: ${e.message}`);
      }
    }
    
    // 5. Summary
    console.log('\\n📊 ANALYSIS SUMMARY:');
    console.log('==================');
    console.log(`API Requests made: ${apiRequests.length}`);
    apiRequests.forEach(req => console.log(`  - ${req.method} ${req.url}`));
    
    console.log(`Console Errors: ${consoleErrors.length}`);
    consoleErrors.forEach(err => console.log(`  - ${err}`));
    
    console.log(`\\nScreenshots saved to: ${screenshotsDir}/`);
    console.log('- analytics-full-page.png (complete page)');
    console.log('- analytics-viewport.png (visible area)');
    console.log('- section-*.png (individual sections)');
    console.log('- route-*.png (different routes)');
    
    // Determine likely issues
    console.log('\\n🔍 LIKELY ISSUES:');
    if (apiRequests.length === 0) {
      console.log('❌ No analytics API requests detected - data fetching may be broken');
    }
    if (pageContent.analyticsMetricsCount === 0) {
      console.log('❌ No analytics/metrics elements found on page');
    }
    if (pageContent.loadingElementsCount > 0) {
      console.log('⚠️ Loading indicators still present - data may not be loading');
    }
    if (consoleErrors.length > 0) {
      console.log('⚠️ JavaScript errors detected - check console output above');
    }
    if (!pageContent.hasAnalyticsText && !pageContent.hasMetricsText) {
      console.log('❌ Page lacks analytics/metrics text - wrong page or component not rendering');
    }
    
  } catch (error) {
    console.error('❌ Visual test failed:', error.message);
  } finally {
    await browser.close();
  }
}

createVisualAnalyticsTest();