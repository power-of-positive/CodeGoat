/**
 * Task WebSocket broadcast utilities
 * Extracted from kanban-tasks-handlers.ts to reduce file size
 */

import { WebSocketService } from '../services/websocket.service';

/**
 * Broadcast task creation to WebSocket clients
 */
export function broadcastTaskCreation(
  webSocketService: WebSocketService,
  taskId: string,
  projectId: string,
  apiTask: any
): void {
  webSocketService.broadcastTaskUpdate({
    type: 'task_created',
    data: {
      taskId,
      projectId,
      task: apiTask,
    },
  });
}

/**
 * Broadcast task update to WebSocket clients
 */
export function broadcastTaskUpdate(
  webSocketService: WebSocketService,
  taskId: string,
  projectId: string,
  apiTask: any,
  changes: any
): void {
  webSocketService.broadcastTaskUpdate({
    type: 'task_updated',
    data: {
      taskId,
      projectId,
      task: apiTask,
      changes,
    },
  });
}

/**
 * Broadcast task deletion to WebSocket clients
 */
export function broadcastTaskDeletion(
  webSocketService: WebSocketService,
  taskId: string,
  projectId: string
): void {
  webSocketService.broadcastTaskUpdate({
    type: 'task_deleted',
    data: {
      taskId,
      projectId,
    },
  });
}