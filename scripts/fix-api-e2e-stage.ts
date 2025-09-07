#!/usr/bin/env npx tsx
/**
 * Script to fix API E2E test stage command to use isolated test runner
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixApiE2eStage() {
  try {
    console.log('🔧 Fixing API E2E test stage command...\n');

    // Update API E2E Tests command to use the isolated runner
    const apiE2eUpdate = await prisma.validationStageConfig.updateMany({
      where: {
        stageId: 'api-e2e-tests',
      },
      data: {
        command: 'cd tests/api-e2e && ./run-isolated-tests.sh',
        timeout: 180000, // 3 minutes should be enough with proper server management
      },
    });

    if (apiE2eUpdate.count > 0) {
      console.log('✅ Updated API E2E Tests to use isolated runner script');
    } else {
      console.log('⚠️ API E2E Tests stage not found in database');
    }

    // Display the updated stage
    const updatedStage = await prisma.validationStageConfig.findFirst({
      where: {
        stageId: 'api-e2e-tests',
      },
    });

    if (updatedStage) {
      console.log('\n📊 Updated API E2E stage configuration:');
      console.log(`  Name: ${updatedStage.name}`);
      console.log(`  Command: ${updatedStage.command}`);
      console.log(`  Timeout: ${updatedStage.timeout}ms (${updatedStage.timeout / 60000} minutes)`);
      console.log(`  Enabled: ${updatedStage.enabled ? '✅' : '❌'}`);
    }

    console.log('\n✨ API E2E stage configuration update complete!');
  } catch (error) {
    console.error('❌ Failed to update API E2E stage:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixApiE2eStage().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});