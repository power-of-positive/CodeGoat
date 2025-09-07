#!/usr/bin/env node

/**
 * Migrate validation stages from settings-precommit.json to test database
 * This ensures the test database has the same validation configuration as the settings file
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ValidationStageConfig {
  id: string;
  name: string;
  command: string;
  timeout?: number;
  enabled?: boolean;
  continueOnFailure?: boolean;
  order?: number;
  description?: string;
  environment?: string;
  category?: string;
}

interface Settings {
  validation?: {
    stages?: ValidationStageConfig[];
  };
}

async function migrateValidationStages() {
  console.log('🔄 Migrating validation stages from settings-precommit.json to test database...');

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.KANBAN_DATABASE_URL || 'file:./prisma/kanban-test.db',
      },
    },
  });

  try {
    // Read settings-precommit.json
    const settingsPath = path.join(process.cwd(), 'settings-precommit.json');
    const settingsContent = await fs.readFile(settingsPath, 'utf-8');
    const settings: Settings = JSON.parse(settingsContent);

    const stages = settings.validation?.stages || [];

    if (stages.length === 0) {
      console.log('⚠️  No validation stages found in settings-precommit.json');
      return;
    }

    console.log(`📋 Found ${stages.length} validation stages in settings file`);

    // Clear existing stages in test database
    console.log('🗑️  Clearing existing validation stages in test database...');
    await prisma.validationStageConfig.deleteMany();

    // Migrate stages to database
    let migratedCount = 0;
    for (const stage of stages) {
      try {
        await prisma.validationStageConfig.create({
          data: {
            stageId: stage.id,
            name: stage.name,
            command: stage.command,
            timeout: stage.timeout || 30000,
            enabled: stage.enabled !== false, // Default to true if not specified
            continueOnFailure: stage.continueOnFailure || false,
            priority: stage.order || 999,
            description: stage.description || `${stage.name} validation stage`,
            environment: stage.environment || null,
            category: stage.category || 'validation',
          },
        });

        console.log(
          `✅ Migrated: ${stage.id} - ${stage.name} (enabled: ${stage.enabled !== false})`
        );
        migratedCount++;
      } catch (error) {
        console.error(`❌ Failed to migrate stage ${stage.id}:`, error);
      }
    }

    console.log(
      `\n🎉 Successfully migrated ${migratedCount}/${stages.length} validation stages to test database`
    );

    // Verify migration
    const dbStages = await prisma.validationStageConfig.findMany({
      orderBy: { priority: 'asc' },
    });

    const enabledCount = dbStages.filter(s => s.enabled).length;
    console.log(
      `📊 Database now contains ${dbStages.length} total stages (${enabledCount} enabled)`
    );

    console.log('\n🔍 Enabled stages:');
    dbStages
      .filter(s => s.enabled)
      .forEach(stage => {
        console.log(`  ${stage.priority}. ${stage.stageId} - ${stage.name}`);
      });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration if called directly
if (require.main === module) {
  migrateValidationStages().catch(error => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
}

export { migrateValidationStages };
