const fetch = require('node-fetch');

async function testStageConsolidation() {
  try {
    // Fetch current validation stages
    const response = await fetch('http://localhost:3001/api/validation-stage-configs');
    const data = await response.json();
    const stages = data.data;

    console.log('📊 STAGE CONSOLIDATION TEST');
    console.log('============================');
    console.log(`\n📈 Original stages: ${stages.length}`);

    // Group stages by name to identify duplicates  
    const stagesByName = {};
    stages.forEach(stage => {
      if (!stagesByName[stage.name]) {
        stagesByName[stage.name] = [];
      }
      stagesByName[stage.name].push(stage);
    });

    // Find duplicates
    const duplicateGroups = {};
    let duplicateCount = 0;
    
    Object.entries(stagesByName).forEach(([name, stageGroup]) => {
      if (stageGroup.length > 1) {
        duplicateGroups[name] = stageGroup;
        duplicateCount += stageGroup.length - 1; // -1 because we keep one
      }
    });

    console.log(`\n🔍 Duplicate categories found: ${Object.keys(duplicateGroups).length}`);
    console.log(`📉 Total duplicates to remove: ${duplicateCount}`);
    console.log(`📋 Expected consolidated stages: ${stages.length - duplicateCount}`);

    console.log('\n🔄 DUPLICATE ANALYSIS:');
    console.log('======================');
    
    Object.entries(duplicateGroups).forEach(([name, stageGroup]) => {
      console.log(`\n📂 ${name} (${stageGroup.length} stages):`);
      stageGroup.forEach((stage, i) => {
        const status = stage.enabled ? '✅ ENABLED' : '❌ disabled';
        const preferred = (stage.enabled && stageGroup.filter(s => s.enabled).length === 1) || 
                         (!stageGroup.some(s => s.enabled) && i === 0) ? ' ⭐ PREFERRED' : '';
        console.log(`   - ${stage.stageId} (${status})${preferred}`);
      });
    });

    console.log('\n✨ CONSOLIDATION RESULTS:');
    console.log('=========================');
    console.log(`Before: ${stages.length} stages (with duplicates)`);
    console.log(`After:  ${stages.length - duplicateCount} stages (consolidated)`);
    console.log(`Reduction: ${duplicateCount} duplicate stages removed`);
    console.log(`Efficiency: ${((duplicateCount / stages.length) * 100).toFixed(1)}% fewer stages to manage`);

    // Test with some mock statistics
    console.log('\n🧪 MOCK STATISTICS TEST:');
    console.log('=========================');
    
    const mockStats = [
      { stageName: 'Backend Coverage Check', stageId: 'backend-coverage', totalRuns: 50, successCount: 40, totalDuration: 100000 },
      { stageName: 'Backend Coverage Check', stageId: 'coverage-backend', totalRuns: 30, successCount: 25, totalDuration: 60000 },
      { stageName: 'Playwright E2E Tests', stageId: 'e2e-tests', totalRuns: 15, successCount: 12, totalDuration: 180000 },
      { stageName: 'Playwright E2E Tests', stageId: 'playwright-e2e', totalRuns: 5, successCount: 4, totalDuration: 60000 },
    ];

    console.log('Before consolidation:');
    mockStats.forEach(stat => {
      const successRate = (stat.successCount / stat.totalRuns * 100).toFixed(1);
      const avgDuration = (stat.totalDuration / stat.totalRuns / 1000).toFixed(1);
      console.log(`  ${stat.stageId}: ${stat.totalRuns} runs, ${successRate}% success, ${avgDuration}s avg`);
    });

    // Simulate consolidation logic
    const consolidatedMockStats = {};
    mockStats.forEach(stat => {
      if (!consolidatedMockStats[stat.stageName]) {
        consolidatedMockStats[stat.stageName] = {
          stageName: stat.stageName,
          totalRuns: 0,
          successCount: 0,
          totalDuration: 0
        };
      }
      const consolidated = consolidatedMockStats[stat.stageName];
      consolidated.totalRuns += stat.totalRuns;
      consolidated.successCount += stat.successCount;
      consolidated.totalDuration += stat.totalDuration;
    });

    console.log('\nAfter consolidation:');
    Object.values(consolidatedMockStats).forEach(stat => {
      const successRate = (stat.successCount / stat.totalRuns * 100).toFixed(1);
      const avgDuration = (stat.totalDuration / stat.totalRuns / 1000).toFixed(1);
      console.log(`  ${stat.stageName}: ${stat.totalRuns} runs, ${successRate}% success, ${avgDuration}s avg`);
    });

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testStageConsolidation();