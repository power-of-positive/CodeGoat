#!/usr/bin/env npx tsx
/**
 * Script to update validation settings to run sequentially instead of in parallel
 * This avoids resource contention issues when running multiple test stages
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function setSequentialValidation() {
  try {
    console.log('🔧 Setting validation to run sequentially...\n');

    // Update settings.json to use sequential mode if it exists
    const settingsPath = path.join(process.cwd(), 'settings.json');
    if (fs.existsSync(settingsPath)) {
      const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      
      if (!settings.validation) {
        settings.validation = {};
      }
      
      // Set execution mode to sequential
      settings.validation.executionMode = 'sequential';
      settings.validation.parallelStages = false;
      
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      console.log('✅ Updated settings.json to use sequential execution');
    } else {
      // Create a new settings.json with sequential mode
      const settings = {
        validation: {
          executionMode: 'sequential',
          parallelStages: false,
          enableMetrics: true,
          maxAttempts: 5
        }
      };
      
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      console.log('✅ Created settings.json with sequential execution');
    }

    // List current validation stages
    console.log('\n📊 Validation stages will run in this order:');
    const stages = await prisma.validationStageConfig.findMany({
      where: {
        enabled: true,
      },
      orderBy: {
        priority: 'asc',
      },
    });

    for (const stage of stages) {
      const timeoutMinutes = Math.round(stage.timeout / 60000);
      console.log(
        `  ${stage.priority}. ${stage.name.padEnd(35)} - ${stage.timeout}ms (${timeoutMinutes} min)`
      );
    }

    console.log('\n⚠️ Note: Validation will now run sequentially to avoid resource contention.');
    console.log('This may take longer but should be more reliable.');
    console.log('\n✨ Validation configuration update complete!');
  } catch (error) {
    console.error('❌ Failed to update validation configuration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
setSequentialValidation().catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});