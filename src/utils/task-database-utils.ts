/**
 * Task database operation utilities
 * Extracted from kanban-tasks-handlers.ts to reduce file size
 */

import { PrismaClient } from '@prisma/client';
import { mapApiStatusToPrisma } from './task-validation-utils';

/**
 * Get task by ID with attempts
 */
export async function getTaskById(prisma: PrismaClient, taskId: string): Promise<any> {
  return await prisma.task.findUnique({
    where: { id: taskId },
    include: { attempts: true },
  });
}

/**
 * Delete task by ID
 */
export async function deleteTaskById(prisma: PrismaClient, taskId: string): Promise<void> {
  await prisma.task.delete({ where: { id: taskId } });
}

/**
 * Create task in database
 */
export async function createTaskInDatabase(prisma: PrismaClient, projectId: string, taskData: any): Promise<any> {
  return await prisma.task.create({
    data: {
      projectId: projectId,
      title: taskData.title,
      description: taskData.description,
      parentTaskAttempt: taskData.parent_task_attempt,
      ...(taskData.status && { status: mapApiStatusToPrisma(taskData.status) }),
    },
  });
}

/**
 * Create task and attempt in a transaction
 */
export async function createTaskAndAttemptTransaction(prisma: PrismaClient, taskData: any): Promise<any> {
  return await prisma.$transaction(async tx => {
    const newTask = await tx.task.create({
      data: {
        projectId: taskData.project_id,
        title: taskData.title,
        description: taskData.description,
        parentTaskAttempt: taskData.parent_task_attempt,
        status: 'INPROGRESS',
      },
    });

    const branchName = `task-${newTask.id}-${Date.now()}`;
    const worktreePath = `./worktrees/${branchName}`;

    await tx.taskAttempt.create({
      data: {
        taskId: newTask.id,
        branchName,
        worktreePath,
        executor: 'CLAUDE_CODE',
        status: 'RUNNING',
      },
    });

    return await tx.task.findUnique({
      where: { id: newTask.id },
      include: { attempts: true },
    });
  });
}

/**
 * Update task in database
 */
export async function updateTaskInDatabase(prisma: PrismaClient, taskId: string, updateData: any): Promise<any> {
  const updateFields: Record<string, unknown> = {};
  if (updateData.title) updateFields.title = updateData.title;
  if (updateData.description !== undefined) updateFields.description = updateData.description;
  if (updateData.status) updateFields.status = updateData.status.toUpperCase();
  if (updateData.parent_task_attempt !== undefined) {
    updateFields.parentTaskAttempt = updateData.parent_task_attempt;
  }

  return await prisma.task.update({
    where: { id: taskId },
    data: updateFields,
  });
}