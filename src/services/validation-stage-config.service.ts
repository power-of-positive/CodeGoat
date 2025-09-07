/**
 * Service for managing validation stage configurations from database
 * Replaces the settings.json validation.stages functionality
 */

import { PrismaClient, ValidationStageConfig } from '@prisma/client';
import { ValidationStage } from '../types/settings.types';

const prisma = new PrismaClient();

/**
 * Convert database ValidationStageConfig to settings ValidationStage format
 */
function convertDbToSettingsFormat(dbStage: ValidationStageConfig): ValidationStage {
  return {
    id: dbStage.stageId,
    name: dbStage.name,
    command: dbStage.command,
    timeout: dbStage.timeout,
    enabled: dbStage.enabled,
    continueOnFailure: dbStage.continueOnFailure,
    priority: dbStage.priority,
  };
}

/**
 * Get all validation stage configurations in settings.json format
 * This provides backward compatibility with existing validation runners
 */
export async function getValidationStagesForExecution(): Promise<ValidationStage[]> {
  try {
    const dbStages = await prisma.validationStageConfig.findMany({
      orderBy: {
        priority: 'asc',
      },
    });

    return dbStages.map(convertDbToSettingsFormat);
  } catch (error) {
    console.error('Failed to fetch validation stages from database:', error);
    throw new Error('Failed to fetch validation stage configurations');
  }
}

/**
 * Get only enabled validation stages
 */
export async function getEnabledValidationStages(): Promise<ValidationStage[]> {
  try {
    const dbStages = await prisma.validationStageConfig.findMany({
      where: {
        enabled: true,
      },
      orderBy: {
        priority: 'asc',
      },
    });

    return dbStages.map(convertDbToSettingsFormat);
  } catch (error) {
    console.error('Failed to fetch enabled validation stages from database:', error);
    throw new Error('Failed to fetch enabled validation stage configurations');
  }
}

/**
 * Get validation stage by ID
 */
export async function getValidationStageById(stageId: string): Promise<ValidationStage | null> {
  try {
    const dbStage = await prisma.validationStageConfig.findUnique({
      where: { stageId },
    });

    if (!dbStage) {
      return null;
    }

    return convertDbToSettingsFormat(dbStage);
  } catch (error) {
    console.error(`Failed to fetch validation stage ${stageId} from database:`, error);
    throw new Error(`Failed to fetch validation stage configuration: ${stageId}`);
  }
}

/**
 * Create a new validation stage configuration
 */
export async function createValidationStage(
  stageData: Omit<ValidationStageConfig, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ValidationStageConfig> {
  try {
    return await prisma.validationStageConfig.create({
      data: stageData,
    });
  } catch (error) {
    console.error('Failed to create validation stage:', error);
    throw new Error('Failed to create validation stage configuration');
  }
}

/**
 * Update a validation stage configuration
 */
export async function updateValidationStage(
  stageId: string,
  updateData: Partial<Omit<ValidationStageConfig, 'id' | 'stageId' | 'createdAt'>>
): Promise<ValidationStageConfig> {
  try {
    return await prisma.validationStageConfig.update({
      where: { stageId },
      data: updateData,
    });
  } catch (error) {
    console.error(`Failed to update validation stage ${stageId}:`, error);
    throw new Error(`Failed to update validation stage configuration: ${stageId}`);
  }
}

/**
 * Delete a validation stage configuration
 */
export async function deleteValidationStage(stageId: string): Promise<void> {
  try {
    await prisma.validationStageConfig.delete({
      where: { stageId },
    });
  } catch (error) {
    console.error(`Failed to delete validation stage ${stageId}:`, error);
    throw new Error(`Failed to delete validation stage configuration: ${stageId}`);
  }
}

/**
 * Toggle enabled status of a validation stage
 */
export async function toggleValidationStage(stageId: string): Promise<ValidationStageConfig> {
  try {
    const current = await prisma.validationStageConfig.findUnique({
      where: { stageId },
    });

    if (!current) {
      throw new Error(`Validation stage ${stageId} not found`);
    }

    return await prisma.validationStageConfig.update({
      where: { stageId },
      data: { enabled: !current.enabled },
    });
  } catch (error) {
    console.error(`Failed to toggle validation stage ${stageId}:`, error);
    throw new Error(`Failed to toggle validation stage configuration: ${stageId}`);
  }
}

/**
 * Reorder validation stages by updating priorities
 */
export async function reorderValidationStages(
  stages: Array<{ stageId: string; priority: number }>
): Promise<ValidationStageConfig[]> {
  try {
    await prisma.$transaction(async tx => {
      for (const stage of stages) {
        await tx.validationStageConfig.update({
          where: { stageId: stage.stageId },
          data: { priority: stage.priority },
        });
      }
    });

    return await prisma.validationStageConfig.findMany({
      orderBy: { priority: 'asc' },
    });
  } catch (error) {
    console.error('Failed to reorder validation stages:', error);
    throw new Error('Failed to reorder validation stage configurations');
  }
}

/**
 * Get validation stage statistics
 */
export async function getValidationStageStats(): Promise<{
  total: number;
  enabled: number;
  disabled: number;
  byCategory: Record<string, number>;
}> {
  try {
    const [totalCount, enabledCount, categoryStats] = await Promise.all([
      prisma.validationStageConfig.count(),
      prisma.validationStageConfig.count({ where: { enabled: true } }),
      prisma.validationStageConfig.groupBy({
        by: ['category'],
        _count: { id: true },
      }),
    ]);

    const byCategory: Record<string, number> = {};
    for (const stat of categoryStats) {
      byCategory[stat.category ?? 'other'] = stat._count.id;
    }

    return {
      total: totalCount,
      enabled: enabledCount,
      disabled: totalCount - enabledCount,
      byCategory,
    };
  } catch (error) {
    console.error('Failed to fetch validation stage statistics:', error);
    throw new Error('Failed to fetch validation stage statistics');
  }
}

/**
 * Health check - verify database connection and basic functionality
 */
export async function healthCheck(): Promise<{
  status: 'ok' | 'error';
  message?: string;
  stageCount?: number;
}> {
  try {
    const count = await prisma.validationStageConfig.count();
    return {
      status: 'ok',
      stageCount: count,
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
