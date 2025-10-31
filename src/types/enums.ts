// TypeScript enum constants for database values
// These replace Prisma enum imports for SQLite compatibility

export const TaskStatus = {
  TODO: 'todo',
  INPROGRESS: 'inprogress',
  INREVIEW: 'inreview',
  DONE: 'done',
  CANCELLED: 'cancelled',
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

export const Priority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export const TaskType = {
  STORY: 'story',
  TASK: 'task',
} as const;

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

// Export types for TypeScript type checking
export type TaskStatusType = (typeof TaskStatus)[keyof typeof TaskStatus];
export type PriorityType = (typeof Priority)[keyof typeof Priority];
export type TaskTypeType = (typeof TaskType)[keyof typeof TaskType];
export type BDDScenarioStatusType = (typeof BDDScenarioStatus)[keyof typeof BDDScenarioStatus];
export type LogLevelType = (typeof LogLevel)[keyof typeof LogLevel];

// Export the enum types themselves (compatible with Prisma usage)
export type TaskStatusEnum = typeof TaskStatus;
export type PriorityEnum = typeof Priority;
export type TaskTypeEnum = typeof TaskType;
export type BDDScenarioStatusEnum = typeof BDDScenarioStatus;
export type LogLevelEnum = typeof LogLevel;
