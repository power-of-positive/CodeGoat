// Re-export Prisma-driven enums to keep API and database values aligned.
export {
  TaskStatus,
  Priority,
  TaskType,
  TaskStatusType,
  PriorityType,
  TaskTypeType,
} from './generated/prisma-enums';

export { PrismaFieldMappings } from './generated/prisma-field-mappings';
export type { PrismaFieldMappingsType } from './generated/prisma-field-mappings';

// Domain enums that are not modelled as Prisma enums yet.
export const BDDScenarioStatus = {
  PENDING: 'pending',
  PASSED: 'passed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const;

export const LogLevel = {
  DEBUG: 'debug',
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
} as const;

export type BDDScenarioStatusType = (typeof BDDScenarioStatus)[keyof typeof BDDScenarioStatus];
export type LogLevelType = (typeof LogLevel)[keyof typeof LogLevel];
