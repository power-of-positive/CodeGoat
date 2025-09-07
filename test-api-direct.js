// Test the API response processing directly
const fetch = require('node-fetch');

async function testAPIDirectly() {
  try {
    console.log('Testing API response processing...\n');
    
    const response = await fetch('http://localhost:5175/api/validation-stage-configs');
    const data = await response.json();
    
    console.log('Raw API response structure:');
    console.log('- Type:', typeof data);
    console.log('- Is object:', data && typeof data === 'object');
    console.log('- Has success property:', 'success' in data);
    console.log('- Success value:', data.success);
    console.log('- Has data property:', 'data' in data);
    console.log('- Data type:', typeof data.data);
    console.log('- Data is array:', Array.isArray(data.data));
    console.log('- Data length:', data.data?.length || 'N/A');
    
    console.log('\nProcessing as settingsApi.getValidationStages() would:');
    
    // Simulate the exact logic from settings-api.ts
    const processedData = data.data || [];
    console.log('- Processed data type:', typeof processedData);
    console.log('- Processed data is array:', Array.isArray(processedData));
    console.log('- Processed data length:', processedData.length);
    
    if (processedData.length > 0) {
      console.log('- First stage name:', processedData[0]?.name || 'No name');
      console.log('- First stage has all required fields:');
      const requiredFields = ['id', 'stageId', 'name', 'command', 'timeout', 'enabled', 'continueOnFailure', 'priority'];
      requiredFields.forEach(field => {
        const hasField = field in processedData[0];
        const value = processedData[0][field];
        console.log(`  - ${field}: ${hasField} (${typeof value})`);
      });
    }
    
    console.log('\n✅ API processing test complete');
    
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

testAPIDirectly();