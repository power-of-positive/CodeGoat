#!/usr/bin/env npx tsx

import { AnalyticsService } from '../src/services/analytics.service';
import { WinstonLogger } from '../src/logger-winston';
import { createDatabaseService } from '../src/services/database';

async function testAnalyticsWithDatabase() {
  console.log('🧪 Testing Analytics Service with Database Migration\n');
  
  // Initialize database service
  const logger = new WinstonLogger({
    level: 'info',
    logsDir: './logs',
    enableConsole: true,
    enableFile: false
  });
  createDatabaseService(logger);

  // Create analytics service (no longer needs metricsPath)
  const analyticsService = new AnalyticsService(logger);
  
  try {
    console.log('📊 Testing getAnalytics()...');
    const analytics = await analyticsService.getAnalytics();
    console.log(`✅ Analytics loaded: ${analytics.totalSessions} sessions, ${analytics.totalValidationRuns} validation runs`);
    
    console.log('\n📈 Testing getStageStatistics()...');
    const stageStats = await analyticsService.getStageStatistics('lint');
    console.log(`✅ Stage stats for 'lint': ${stageStats.overview.totalAttempts} attempts, ${stageStats.overview.successRate.toFixed(1)}% success rate`);
    
    console.log('\n📋 Testing getValidationRuns()...');
    const validationRuns = await analyticsService.getValidationRuns(10);
    console.log(`✅ Validation runs loaded: ${validationRuns.length} recent runs`);
    
    console.log('\n🏗️ Testing getValidationRunStatistics()...');
    const daysToQuery = 30;
    const runStats = await analyticsService.getValidationRunStatistics(daysToQuery);
    console.log(`✅ Run statistics: ${runStats.totalRuns} total runs, ${runStats.successRate.toFixed(1)}% success rate`);
    
    if (validationRuns.length > 0) {
      const recent = validationRuns[0];
      console.log(`\n🔍 Most recent run: ${recent.timestamp} - ${recent.success ? '✅ PASS' : '❌ FAIL'} (${recent.passedStages}/${recent.totalStages} stages)`);
    }
    
    console.log('\n🎉 All analytics service database operations working correctly!');
    
  } catch (error) {
    console.error('❌ Error testing analytics service:', error);
    throw error;
  } finally {
    await analyticsService.dispose();
  }
}

if (require.main === module) {
  testAnalyticsWithDatabase()
    .then(() => {
      console.log('\n✅ Database migration test completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Database migration test failed:', error);
      process.exit(1);
    });
}

export { testAnalyticsWithDatabase };