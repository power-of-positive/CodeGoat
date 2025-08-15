/**
 * Task validation utilities
 * Extracted from kanban-tasks-handlers.ts to reduce file size
 */

import { z } from 'zod';
import { PrismaClient, TaskStatus as PrismaTaskStatus } from '@prisma/client';
import { TaskStatus } from '../types/kanban.types';
import {
  createErrorResponse,
  createValidationErrorResponse,
  createInvalidIdResponse,
  createNotFoundResponse,
} from './response-utils';

// Validation schemas
export const CreateTaskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  status: z.enum(['todo', 'inprogress', 'inreview', 'done', 'cancelled']).optional(),
  parent_task_attempt: z.string().uuid().optional(),
});

export const CreateAndStartTaskSchema = z.object({
  project_id: z.string().uuid('Invalid project ID format'),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  parent_task_attempt: z.string().uuid().optional(),
  base_branch: z.string().default('main'),
  profile: z.string().optional(),
});

export const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  parent_task_attempt: z.string().uuid().optional(),
});

/**
 * Validate create task request
 */
export function validateCreateTaskRequest(projectId: string, body: any): { status: number; response: any } | null {
  const projectIdValidation = z.string().uuid().safeParse(projectId);
  if (!projectIdValidation.success) {
    return {
      status: 400,
      response: createInvalidIdResponse('project'),
    };
  }

  const validation = CreateTaskSchema.safeParse(body);
  if (!validation.success) {
    return {
      status: 400,
      response: createValidationErrorResponse(validation.error),
    };
  }

  return null;
}

/**
 * Validate update task request and get existing task
 */
export async function validateUpdateTaskRequest(
  req: any,
  prisma: PrismaClient
): Promise<{ error?: any; status?: number; data?: { updateData: any; existingTask: any } }> {
  const validation = UpdateTaskSchema.safeParse(req.body);
  if (!validation.success) {
    return {
      error: createValidationErrorResponse(validation.error),
      status: 400,
    };
  }

  const { task_id } = req.params;
  const existingTask = await prisma.task.findUnique({ where: { id: task_id } });
  if (!existingTask) {
    return {
      error: createNotFoundResponse('Task'),
      status: 404,
    };
  }

  return {
    data: {
      updateData: validation.data,
      existingTask,
    },
  };
}

/**
 * Validate parent task attempt
 */
export async function validateParentTaskAttempt(prisma: PrismaClient, parentTaskAttemptId?: string): Promise<any | null> {
  if (!parentTaskAttemptId) {
    return null;
  }

  const parentAttempt = await prisma.taskAttempt.findUnique({
    where: { id: parentTaskAttemptId },
  });

  if (!parentAttempt) {
    return createErrorResponse('Parent task attempt not found');
  }

  return null;
}

/**
 * Map API TaskStatus to Prisma TaskStatus
 */
export function mapApiStatusToPrisma(status: TaskStatus): PrismaTaskStatus {
  switch (status) {
    case 'todo':
      return PrismaTaskStatus.TODO;
    case 'inprogress':
      return PrismaTaskStatus.INPROGRESS;
    case 'inreview':
      return PrismaTaskStatus.INREVIEW;
    case 'done':
      return PrismaTaskStatus.DONE;
    case 'cancelled':
      return PrismaTaskStatus.CANCELLED;
    default:
      return PrismaTaskStatus.TODO;
  }
}