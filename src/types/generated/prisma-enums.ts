// AUTO-GENERATED FILE. DO NOT EDIT.
// Run `npm run generate:prisma-enums` after changing prisma/schema.prisma.

export const TaskStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
} as const;

export type TaskStatusType = (typeof TaskStatus)[keyof typeof TaskStatus];

export const Priority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
} as const;

export type PriorityType = (typeof Priority)[keyof typeof Priority];

export const TaskType = {
  STORY: 'story',
  TASK: 'task',
} as const;

export type TaskTypeType = (typeof TaskType)[keyof typeof TaskType];

export const AgentType = {
  CLAUDE_CODE: 'claude_code',
  OPENAI_CODEX: 'openai_codex',
  OPENAI_O1: 'openai_o1',
  ANTHROPIC_API: 'anthropic_api',
  CUSTOM: 'custom',
} as const;

export type AgentTypeType = (typeof AgentType)[keyof typeof AgentType];
