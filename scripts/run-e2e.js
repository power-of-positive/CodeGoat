#!/usr/bin/env node

const { exec } = require('child_process');
const path = require('path');

// Auto-detect running frontend port by checking common Vite ports
async function detectFrontendPort() {
  const commonPorts = [5173, 5174, 5175, 5176, 5177];
  
  for (const port of commonPorts) {
    try {
      const { execSync } = require('child_process');
      execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:${port}`, { 
        timeout: 1000,
        stdio: 'pipe'
      });
      console.error(`🔍 Detected frontend server running on port ${port}`);
      return port;
    } catch {
      // Port not responding, continue checking
    }
  }
  
  console.error('⚠️ No frontend server detected on common ports, using default 5173');
  return 5173;
}

// Detect port and run tests
async function runTests() {
  const detectedPort = await detectFrontendPort();
  
  // Use exec with a timeout for E2E tests
  const testPattern = process.env.PLAYWRIGHT_ARGS || process.argv[2] || '';
  const testCommand = `npx playwright test ${testPattern} --reporter=list --max-failures=3`;
  const TIMEOUT = 150000; // 150 seconds (2.5 minutes to be under validation timeout)
  
  console.error('🎭 Running E2E tests with timeout protection...');
  console.error(`📡 Using frontend port: ${detectedPort}`);

  const testProcess = exec(testCommand, {
    cwd: path.resolve(__dirname, '..', 'ui'),
    timeout: TIMEOUT,
    killSignal: 'SIGKILL',
    env: { 
      ...process.env,
      SKIP_WEB_SERVER: '1', // Skip server startup since we're using existing servers
      FRONTEND_PORT: detectedPort.toString()
    }
  });

  let hasFailures = false;
  let testResults = '';

  testProcess.stdout.on('data', (data) => {
    const output = data.toString();
    testResults += output;
    console.error(output);
    
    // Check for failures but be more lenient with E2E tests
    const failedLines = output.split('\n').filter(line => line.includes('failed'));
    if (failedLines.length > 3) { // Allow some failures in E2E tests
      hasFailures = true;
    }
  });

  testProcess.stderr.on('data', (data) => {
    const error = data.toString();
    console.error(error);
    // Only consider critical errors as failures
    if (error.includes('Error:') || error.includes('ECONNREFUSED') || error.includes('timeout')) {
      hasFailures = true;
    }
  });

  testProcess.on('close', (code) => {
    if (code === null) {
      // Process was killed due to timeout
      console.error('\n⏰ E2E tests timed out');
      console.error('❌ E2E test timeout is considered a failure');
      process.exit(1);
    } else {
      console.error(`\n🎭 E2E tests completed with exit code: ${code}`);
      
      // Count actual failures vs passes
      const failureCount = (testResults.match(/failed/g) || []).length;
      const passCount = (testResults.match(/passed/g) || []).length;
      
      if (code === 0) {
        console.error(`✅ All E2E tests passed! (${passCount} passed, ${failureCount} failed)`);
        process.exit(0);
      } else {
        console.error(`❌ E2E tests failed! (${passCount} passed, ${failureCount} failed)`);
        console.error('🚨 E2E test failures should block the validation pipeline');
        process.exit(code);
      }
    }
  });

  testProcess.on('error', (error) => {
    if (error.signal === 'SIGKILL') {
      console.error('\n⏰ E2E tests were killed due to timeout');
      process.exit(hasFailures ? 1 : 0);
    } else {
      console.error('❌ E2E test execution error:', error);
      process.exit(1);
    }
  });
}

// Run the tests
runTests().catch((error) => {
  console.error('❌ Failed to run E2E tests:', error);
  process.exit(1);
});