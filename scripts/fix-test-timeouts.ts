#!/usr/bin/env npx tsx
/**
 * Script to fix timeout settings for API E2E and Playwright E2E test stages
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTestTimeouts() {
  try {
    console.log('🔧 Fixing test timeout configurations...\n');

    // Update API E2E Tests timeout to 5 minutes (300000ms)
    const apiE2eUpdate = await prisma.validationStageConfig.updateMany({
      where: {
        stageId: 'api-e2e-tests',
      },
      data: {
        timeout: 300000, // 5 minutes
      },
    });

    if (apiE2eUpdate.count > 0) {
      console.log('✅ Updated API E2E Tests timeout to 5 minutes');
    } else {
      console.log('⚠️ API E2E Tests stage not found in database');
    }

    // Update Playwright E2E Tests timeout to 5 minutes (300000ms)
    const playwrightUpdate = await prisma.validationStageConfig.updateMany({
      where: {
        stageId: 'e2e-tests',
      },
      data: {
        timeout: 300000, // 5 minutes
      },
    });

    if (playwrightUpdate.count > 0) {
      console.log('✅ Updated Playwright E2E Tests timeout to 5 minutes');
    } else {
      console.log('⚠️ Playwright E2E Tests stage not found in database');
    }

    // Also check for any alternative IDs
    const playwrightAltUpdate = await prisma.validationStageConfig.updateMany({
      where: {
        stageId: 'playwright-e2e-tests',
      },
      data: {
        timeout: 300000, // 5 minutes
      },
    });

    if (playwrightAltUpdate.count > 0) {
      console.log('✅ Updated Playwright E2E Tests (alternative ID) timeout to 5 minutes');
    }

    // List all current validation stages with their timeouts
    console.log('\n📊 Current validation stage timeouts:');
    const allStages = await prisma.validationStageConfig.findMany({
      orderBy: {
        priority: 'asc',
      },
    });

    for (const stage of allStages) {
      const timeoutMinutes = Math.round(stage.timeout / 60000);
      const status = stage.enabled ? '✅' : '❌';
      console.log(
        `${status} ${stage.name.padEnd(35)} - ${stage.timeout}ms (${timeoutMinutes} min)`
      );
    }

    console.log('\n✨ Timeout configuration update complete!');
  } catch (error) {
    console.error('❌ Failed to update test timeouts:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixTestTimeouts().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});