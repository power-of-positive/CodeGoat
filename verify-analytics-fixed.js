const { chromium } = require('playwright');
const fs = require('fs');

async function verifyAnalyticsFixed() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  
  const fixedScreenshotsDir = './analytics-fixed-screenshots';
  if (!fs.existsSync(fixedScreenshotsDir)) {
    fs.mkdirSync(fixedScreenshotsDir, { recursive: true });
  }
  
  try {
    console.log('🎯 Verifying analytics fix...\n');
    
    await page.goto('http://localhost:5175/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Take updated screenshots
    await page.screenshot({ 
      path: `${fixedScreenshotsDir}/analytics-fixed-full.png`,
      fullPage: true 
    });
    
    await page.screenshot({ 
      path: `${fixedScreenshotsDir}/analytics-fixed-viewport.png` 
    });
    
    // Analyze visible data
    const dataAnalysis = await page.evaluate(() => {
      // Look for actual numbers/metrics
      const metricsText = document.body.textContent || '';
      
      // Extract numbers that look like metrics
      const numbers = metricsText.match(/\\d+(?:\\.\\d+)?%?/g) || [];
      const runNumbers = metricsText.match(/\\d+\\s*runs?/gi) || [];
      const percentages = metricsText.match(/\\d+(?:\\.\\d+)?%/g) || [];
      
      // Look for specific metric cards/sections
      const metricElements = Array.from(document.querySelectorAll('*')).filter(el => {
        const text = el.textContent?.toLowerCase() || '';
        return (text.includes('total') && text.includes('run')) ||
               (text.includes('success') && text.includes('rate')) ||
               (text.includes('average') && text.includes('duration'));
      });
      
      // Look for charts and visualizations
      const charts = document.querySelectorAll('canvas, svg, .recharts-wrapper');
      
      // Check for loading states
      const stillLoading = document.querySelectorAll('[class*="loading"], [class*="spinner"]').length > 0;
      
      return {
        totalNumbers: numbers.length,
        runNumbers: runNumbers.length,
        percentages: percentages.length,
        metricElements: metricElements.length,
        chartsVisible: charts.length,
        stillLoading,
        sampleNumbers: numbers.slice(0, 10),
        sampleRunNumbers: runNumbers,
        samplePercentages: percentages.slice(0, 5)
      };
    });
    
    console.log('📊 Data Analysis Results:');
    console.log(`- Total numbers found: ${dataAnalysis.totalNumbers}`);
    console.log(`- Run-related numbers: ${dataAnalysis.runNumbers}`);
    console.log(`- Percentages found: ${dataAnalysis.percentages}`);
    console.log(`- Metric elements: ${dataAnalysis.metricElements}`);
    console.log(`- Charts visible: ${dataAnalysis.chartsVisible}`);
    console.log(`- Still loading: ${dataAnalysis.stillLoading ? '❌ Yes' : '✅ No'}`);
    
    if (dataAnalysis.sampleNumbers.length > 0) {
      console.log(`\\n📈 Sample numbers found: ${dataAnalysis.sampleNumbers.join(', ')}`);
    }
    if (dataAnalysis.sampleRunNumbers.length > 0) {
      console.log(`📈 Run numbers: ${dataAnalysis.sampleRunNumbers.join(', ')}`);
    }
    if (dataAnalysis.samplePercentages.length > 0) {
      console.log(`📈 Percentages: ${dataAnalysis.samplePercentages.join(', ')}`);
    }
    
    // Check specific analytics sections
    const sections = await page.locator('section, .card, [class*="metric"], [class*="chart"]').all();
    console.log(`\\n🎯 Found ${sections.length} potential analytics sections`);
    
    for (let i = 0; i < Math.min(sections.length, 3); i++) {
      try {
        await sections[i].screenshot({ path: `${fixedScreenshotsDir}/section-${i + 1}-fixed.png` });
        const text = await sections[i].textContent();
        console.log(`   Section ${i + 1}: "${text?.substring(0, 50)}..."`);
      } catch (e) {
        console.log(`   Section ${i + 1}: Failed to capture`);
      }
    }
    
    // Overall assessment
    const hasData = dataAnalysis.totalNumbers > 10 && dataAnalysis.metricElements > 0;
    const hasCharts = dataAnalysis.chartsVisible > 0;
    const noErrors = !dataAnalysis.stillLoading;
    
    console.log(`\\n🎯 FINAL ASSESSMENT:`);
    console.log(`✅ Data displaying: ${hasData ? 'YES' : 'NO'}`);
    console.log(`✅ Charts visible: ${hasCharts ? 'YES' : 'NO'}`);
    console.log(`✅ No loading errors: ${noErrors ? 'YES' : 'NO'}`);
    console.log(`\\n🎉 Overall Status: ${hasData && hasCharts && noErrors ? '✅ FULLY WORKING' : '⚠️ NEEDS MORE WORK'}`);
    
    console.log(`\\n📸 Updated screenshots saved to: ${fixedScreenshotsDir}/`);
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await browser.close();
  }
}

verifyAnalyticsFixed();