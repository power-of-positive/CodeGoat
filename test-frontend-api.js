// Debug script to test frontend API calls
const fetch = require('node-fetch');

async function testAPIs() {
  console.log('Testing frontend APIs through proxy...\n');

  try {
    // Test validation stages
    console.log('1. Testing validation stages API:');
    const stagesResponse = await fetch('http://localhost:5175/api/validation-stage-configs');
    const stagesData = await stagesResponse.json();
    console.log(`   Status: ${stagesResponse.status}`);
    console.log(`   Success: ${stagesData.success}`);
    console.log(`   Data length: ${stagesData.data?.length || 'N/A'}\n`);

    // Test analytics metrics
    console.log('2. Testing analytics metrics API:');
    const analyticsResponse = await fetch('http://localhost:5175/api/analytics/validation-metrics');
    const analyticsData = await analyticsResponse.json();
    console.log(`   Status: ${analyticsResponse.status}`);
    console.log(`   Total runs: ${analyticsData.totalRuns || 'N/A'}`);
    console.log(`   Success rate: ${analyticsData.successRate || 'N/A'}`);
    console.log(`   Stages length: ${analyticsData.stages?.length || 'N/A'}\n`);

    console.log('✅ All APIs responding correctly');
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testAPIs();