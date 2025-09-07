import type {
  ValidationStageConfig,
  ConsolidatedStageConfig,
  StageStatistics,
  ConsolidationMapping,
} from '../types/validation.types';

export class StageConsolidationService {
  /**
   * Identifies duplicate stages by grouping stages with the same name
   * Returns a map where key is the preferred stage ID and value is array of all stage IDs in that group
   */
  identifyDuplicateStages(stages: ValidationStageConfig[]): Record<string, string[]> {
    // Group stages by name
    const stagesByName = new Map<string, ValidationStageConfig[]>();

    for (const stage of stages) {
      if (!stagesByName.has(stage.name)) {
        stagesByName.set(stage.name, []);
      }
      stagesByName.get(stage.name)!.push(stage);
    }

    // Only return groups that have duplicates (more than 1 stage)
    const duplicates: Record<string, string[]> = {};

    for (const [name, stageGroup] of stagesByName.entries()) {
      if (stageGroup.length > 1) {
        // Choose preferred stage ID (enabled stage, or first alphabetically if tied)
        const sortedStages = [...stageGroup].sort((a, b) => {
          // Prefer enabled stages
          if (a.enabled !== b.enabled) {
            return b.enabled ? 1 : -1;
          }
          // If both have same enabled status, prefer alphabetically first
          return a.stageId.localeCompare(b.stageId);
        });

        const preferredStageId = sortedStages[0].stageId;
        const allStageIds = stageGroup.map(s => s.stageId).sort();

        duplicates[preferredStageId] = allStageIds;
      }
    }

    return duplicates;
  }

  /**
   * Consolidates duplicate stages, keeping the preferred one and marking it as consolidated
   */
  consolidateStages(stages: ValidationStageConfig[]): ConsolidatedStageConfig[] {
    const duplicates = this.identifyDuplicateStages(stages);
    const consolidated: ConsolidatedStageConfig[] = [];
    const processedStageIds = new Set<string>();

    for (const stage of stages) {
      if (processedStageIds.has(stage.stageId)) {
        continue; // Already processed as part of a duplicate group
      }

      // Find if this stage is part of a duplicate group
      let duplicateGroup: string[] | null = null;
      let isPreferred = false;

      for (const [preferredId, stageIds] of Object.entries(duplicates)) {
        if (stageIds.includes(stage.stageId)) {
          duplicateGroup = stageIds;
          isPreferred = preferredId === stage.stageId;
          break;
        }
      }

      if (duplicateGroup && isPreferred) {
        // This is the preferred stage in a duplicate group
        const consolidatedStage: ConsolidatedStageConfig = {
          ...stage,
          consolidatedFrom: duplicateGroup,
        };
        consolidated.push(consolidatedStage);

        // Mark all stages in this group as processed
        duplicateGroup.forEach(id => processedStageIds.add(id));
      } else if (!duplicateGroup) {
        // This is a unique stage (not part of any duplicate group)
        consolidated.push(stage);
        processedStageIds.add(stage.stageId);
      }
      // Skip non-preferred stages in duplicate groups
    }

    return consolidated;
  }

  /**
   * Merges stage statistics for duplicate stages
   */
  mergeStageStatistics(stageStats: StageStatistics[]): StageStatistics[] {
    // Group statistics by stage name
    const statsByName = new Map<string, StageStatistics[]>();

    for (const stat of stageStats) {
      if (!statsByName.has(stat.stageName)) {
        statsByName.set(stat.stageName, []);
      }
      statsByName.get(stat.stageName)!.push(stat);
    }

    const merged: StageStatistics[] = [];

    for (const [stageName, stats] of statsByName.entries()) {
      if (stats.length === 1) {
        // No duplicates, add calculated success rate and average duration
        const stat = stats[0];
        merged.push({
          ...stat,
          successRate: stat.totalRuns > 0 ? (stat.successCount / stat.totalRuns) * 100 : 0,
          averageDuration: stat.totalRuns > 0 ? stat.totalDuration / stat.totalRuns : 0,
        });
      } else {
        // Multiple stats for same stage name - merge them
        const totalRuns = stats.reduce((sum, s) => sum + s.totalRuns, 0);
        const successCount = stats.reduce((sum, s) => sum + s.successCount, 0);
        const totalDuration = stats.reduce((sum, s) => sum + s.totalDuration, 0);

        // Use the first stage ID alphabetically for consistency
        const stageIds = stats.map(s => s.stageId).sort();
        const preferredStageId = stageIds[0];

        merged.push({
          stageName,
          stageId: preferredStageId,
          totalRuns,
          successCount,
          totalDuration,
          successRate: totalRuns > 0 ? (successCount / totalRuns) * 100 : 0,
          averageDuration: totalRuns > 0 ? totalDuration / totalRuns : 0,
        });
      }
    }

    return merged;
  }

  /**
   * Returns a mapping of all stage IDs to their consolidated stage IDs
   */
  getConsolidationMapping(stages: ValidationStageConfig[]): ConsolidationMapping {
    const duplicates = this.identifyDuplicateStages(stages);
    const mapping: ConsolidationMapping = {};

    // First, map all stages to themselves by default
    for (const stage of stages) {
      mapping[stage.stageId] = stage.stageId;
    }

    // Then override with consolidation mappings for duplicate groups
    for (const [preferredId, stageIds] of Object.entries(duplicates)) {
      for (const stageId of stageIds) {
        mapping[stageId] = preferredId;
      }
    }

    return mapping;
  }
}
