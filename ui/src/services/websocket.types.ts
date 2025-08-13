export interface WebSocketEvent {
  type: string;
  data: unknown;
  timestamp: number;
  room?: string;
}

export interface TaskUpdateEvent {
  type: 'task_updated' | 'task_created' | 'task_deleted';
  data: {
    taskId: string;
    projectId: string;
    task?: unknown;
    changes?: Record<string, unknown>;
  };
}

export interface TaskAttemptUpdateEvent {
  type: 'attempt_updated' | 'attempt_created' | 'attempt_deleted';
  data: {
    attemptId: string;
    taskId: string;
    projectId: string;
    attempt?: unknown;
    changes?: Record<string, unknown>;
  };
}

export interface WebSocketStats {
  isConnected: boolean;
  events: WebSocketEvent[];
  connections: {
    total: number;
    active: number;
    rooms: Record<string, number>;
  };
  metrics: {
    eventsReceived: number;
    eventsEmitted: number;
    reconnectCount: number;
    lastConnected?: number;
    lastDisconnected?: number;
  };
}

export type EventHandler<T = unknown> = (data: T) => void;

export interface WebSocketServiceInterface {
  connect(): void;
  disconnect(): void;
  joinRoom(room: string): void;
  leaveRoom(room: string): void;
  emitEvent(event: string, data: unknown, room?: string): void;
  on<T = unknown>(event: string, handler: EventHandler<T>): void;
  off(event: string, handler: EventHandler): void;
  getStats(): WebSocketStats;
  isConnected(): boolean;
}