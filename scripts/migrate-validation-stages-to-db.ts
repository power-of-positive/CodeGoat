#!/usr/bin/env npx tsx

/**
 * Migration script to move validation stage configurations from settings.json to database
 */

import { PrismaClient } from '@prisma/client';
import fs from 'fs/promises';
import path from 'path';
import { Settings, ValidationStage } from '../src/types/settings.types';

const prisma = new PrismaClient();

interface ValidationStageConfig {
  stageId: string;
  name: string;
  command: string;
  timeout: number;
  enabled: boolean;
  continueOnFailure: boolean;
  priority: number;
  description?: string;
  category?: string;
}

/**
 * Load validation stages from settings.json
 */
async function loadValidationStagesFromSettings(): Promise<ValidationStage[]> {
  try {
    const settingsPath = path.join(process.cwd(), 'settings.json');
    const settingsContent = await fs.readFile(settingsPath, 'utf-8');
    const settings: Settings = JSON.parse(settingsContent);
    
    if (!settings.validation?.stages) {
      throw new Error('No validation stages found in settings.json');
    }
    
    return settings.validation.stages;
  } catch (error) {
    console.error('Error loading settings.json:', error);
    throw error;
  }
}

/**
 * Convert settings.json stage to database format
 */
function convertStageToDbFormat(stage: ValidationStage): ValidationStageConfig {
  // Determine category based on stage ID
  let category: string;
  const id = stage.id.toLowerCase();
  if (id.includes('lint')) {
    category = 'lint';
  } else if (id.includes('test') || id.includes('coverage')) {
    category = 'test';
  } else if (id.includes('typecheck') || id.includes('typescript')) {
    category = 'type';
  } else if (id.includes('build')) {
    category = 'build';
  } else if (id.includes('e2e') || id.includes('playwright')) {
    category = 'e2e';
  } else if (id.includes('audit') || id.includes('vulnerability') || id.includes('security')) {
    category = 'security';
  } else if (id.includes('dead-code') || id.includes('duplication')) {
    category = 'quality';
  } else if (id.includes('uncommitted') || id.includes('todo')) {
    category = 'validation';
  } else {
    category = 'other';
  }

  return {
    stageId: stage.id,
    name: stage.name,
    command: stage.command,
    timeout: stage.timeout || 60000,
    enabled: stage.enabled !== false, // Default to true if not specified
    continueOnFailure: stage.continueOnFailure || false,
    priority: stage.priority || 999,
    description: `Migrated from settings.json - ${stage.name}`,
    category
  };
}

/**
 * Migrate validation stages to database
 */
async function migrateValidationStagesToDb(): Promise<void> {
  try {
    console.error('🚀 Starting migration of validation stages to database...');
    
    // Load stages from settings.json
    const settingsStages = await loadValidationStagesFromSettings();
    console.error(`📋 Found ${settingsStages.length} validation stages in settings.json`);
    
    // Check if stages already exist in database
    const existingStages = await prisma.validationStageConfig.findMany();
    if (existingStages.length > 0) {
      console.error(`⚠️  Found ${existingStages.length} existing stages in database`);
      console.error('🔄 Clearing existing stages for fresh migration...');
      await prisma.validationStageConfig.deleteMany();
    }
    
    // Convert and insert stages
    const dbStages = settingsStages.map(convertStageToDbFormat);
    
    console.error('💾 Inserting validation stages into database...');
    
    for (const stage of dbStages) {
      await prisma.validationStageConfig.create({
        data: stage
      });
      console.error(`✅ Inserted stage: ${stage.stageId} (${stage.name})`);
    }
    
    // Verify migration
    const finalCount = await prisma.validationStageConfig.count();
    console.error(`🎉 Migration completed! ${finalCount} validation stages now in database.`);
    
    // Display stage summary
    const stagesByCategory = await prisma.validationStageConfig.groupBy({
      by: ['category'],
      _count: {
        id: true
      },
      orderBy: {
        category: 'asc'
      }
    });
    
    console.error('\n📊 Validation stages by category:');
    for (const group of stagesByCategory) {
      console.error(`  ${group.category}: ${group._count.id} stages`);
    }
    
    // Show execution order
    console.error('\n📝 Execution order (by priority):');
    const orderedStages = await prisma.validationStageConfig.findMany({
      select: {
        stageId: true,
        name: true,
        priority: true,
        enabled: true
      },
      orderBy: {
        priority: 'asc'
      }
    });
    
    for (const stage of orderedStages) {
      const status = stage.enabled ? '✅' : '❌';
      console.error(`  ${stage.priority}. ${status} ${stage.stageId} - ${stage.name}`);
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  try {
    await migrateValidationStagesToDb();
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

export { migrateValidationStagesToDb };