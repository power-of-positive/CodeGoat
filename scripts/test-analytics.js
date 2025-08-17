#!/usr/bin/env node

/**
 * Test script to demonstrate the full analytics and validation pipeline
 * Shows how session tracking works with validation attempts
 */

const axios = require('axios');
const { ValidationRunner } = require('./validate-task.js');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

class AnalyticsDemo {
  constructor() {
    this.baseUrl = 'http://localhost:3000';
  }

  async log(message) {
    console.log(`${colors.blue}[DEMO]${colors.reset} ${message}`);
  }

  async startServer() {
    // Check if server is running
    try {
      await axios.get(`${this.baseUrl}/api/status`);
      await this.log('✅ Server is already running');
      return true;
    } catch {
      await this.log('❌ Server is not running. Please start the server first:');
      console.log('   npm run dev');
      return false;
    }
  }

  async startSession(userPrompt, taskDescription) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/analytics/sessions`, {
        userPrompt,
        taskDescription
      });
      
      const sessionId = response.data.sessionId;
      await this.log(`🚀 Started session: ${sessionId}`);
      await this.log(`📝 Prompt: "${userPrompt}"`);
      await this.log(`📋 Task: "${taskDescription}"`);
      
      return sessionId;
    } catch (error) {
      await this.log(`❌ Failed to start session: ${error.message}`);
      throw error;
    }
  }

  async runValidation(sessionId) {
    try {
      await this.log(`🔍 Running validation for session ${sessionId}...`);
      
      // Create validation runner with session ID
      const runner = new ValidationRunner({ sessionId });
      const results = await runner.run();
      
      await this.log(`📊 Validation completed: ${results.success ? 'SUCCESS' : 'FAILED'}`);
      await this.log(`⏱️  Total time: ${results.totalTime}ms`);
      await this.log(`🎯 Stages: ${results.passed} passed, ${results.failed} failed`);
      
      return results;
    } catch (error) {
      await this.log(`❌ Validation failed: ${error.message}`);
      throw error;
    }
  }

  async endSession(sessionId, success) {
    try {
      await axios.put(`${this.baseUrl}/api/analytics/sessions/${sessionId}/end`, {
        success
      });
      
      await this.log(`🏁 Session ended: ${success ? 'SUCCESS' : 'FAILED'}`);
    } catch (error) {
      await this.log(`❌ Failed to end session: ${error.message}`);
      throw error;
    }
  }

  async getAnalytics() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/analytics`);
      const analytics = response.data;
      
      await this.log('📈 Current Analytics:');
      console.log(`   Total sessions: ${analytics.totalSessions}`);
      console.log(`   Success rate: ${analytics.successRate.toFixed(1)}%`);
      console.log(`   Avg time to success: ${(analytics.averageTimeToSuccess / 1000).toFixed(1)}s`);
      console.log(`   Avg attempts to success: ${analytics.averageAttemptsToSuccess.toFixed(1)}`);
      console.log(`   Most failed stage: ${analytics.mostFailedStage}`);
      
      // Show stage success rates
      console.log('   Stage success rates:');
      Object.entries(analytics.stageSuccessRates).forEach(([stage, stats]) => {
        console.log(`     ${stage}: ${stats.rate.toFixed(1)}% (${stats.successes}/${stats.attempts})`);
      });
      
      return analytics;
    } catch (error) {
      await this.log(`❌ Failed to get analytics: ${error.message}`);
      throw error;
    }
  }

  async getSessionDetails(sessionId) {
    try {
      const response = await axios.get(`${this.baseUrl}/api/analytics/sessions/${sessionId}`);
      const session = response.data;
      
      await this.log(`📄 Session Details (${sessionId}):`);
      console.log(`   Start time: ${new Date(session.startTime).toISOString()}`);
      console.log(`   End time: ${session.endTime ? new Date(session.endTime).toISOString() : 'Not ended'}`);
      console.log(`   Total duration: ${session.totalDuration ? (session.totalDuration / 1000).toFixed(1) + 's' : 'N/A'}`);
      console.log(`   Final success: ${session.finalSuccess}`);
      console.log(`   Attempts: ${session.attempts.length}`);
      console.log(`   Total validation time: ${(session.totalValidationTime / 1000).toFixed(1)}s`);
      console.log(`   Average stage time: ${session.averageStageTime.toFixed(0)}ms`);
      
      session.attempts.forEach((attempt, index) => {
        console.log(`   Attempt ${index + 1}: ${attempt.success ? 'SUCCESS' : 'FAILED'} (${attempt.totalTime}ms)`);
        attempt.stages.forEach(stage => {
          const status = stage.success ? '✅' : '❌';
          console.log(`     ${status} ${stage.name}: ${stage.duration}ms`);
        });
      });
      
      return session;
    } catch (error) {
      await this.log(`❌ Failed to get session details: ${error.message}`);
      throw error;
    }
  }

  async demo() {
    try {
      console.log(`${colors.bright}${colors.blue}🧪 Analytics & Validation Pipeline Demo${colors.reset}`);
      console.log(`${colors.blue}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
      
      // 1. Check server
      const serverRunning = await this.startServer();
      if (!serverRunning) {
        process.exit(1);
      }
      
      // 2. Start a session
      const sessionId = await this.startSession(
        'Fix linting issues and ensure all tests pass',
        'Claude Code is helping to clean up code quality issues'
      );
      
      // 3. Run validation
      const validationResults = await this.runValidation(sessionId);
      
      // 4. End session
      await this.endSession(sessionId, validationResults.success);
      
      // 5. Show session details
      console.log('');
      await this.getSessionDetails(sessionId);
      
      // 6. Show overall analytics
      console.log('');
      await this.getAnalytics();
      
      console.log('');
      console.log(`${colors.bright}${colors.green}✅ Analytics demo completed successfully!${colors.reset}`);
      console.log(`${colors.cyan}💡 Session ID: ${sessionId}${colors.reset}`);
      console.log(`${colors.cyan}📊 Visit http://localhost:3000/api/analytics to see all analytics${colors.reset}`);
      
    } catch (error) {
      console.error(`${colors.red}💥 Demo failed: ${error.message}${colors.reset}`);
      process.exit(1);
    }
  }
}

// Run demo if called directly
if (require.main === module) {
  const demo = new AnalyticsDemo();
  demo.demo();
}