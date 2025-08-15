 
import { io, Socket } from 'socket.io-client';

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
  type: 'task_attempt_updated' | 'task_attempt_created' | 'task_attempt_deleted';
  data: {
    attemptId: string;
    taskId: string;
    projectId: string;
    attempt?: unknown;
    changes?: Record<string, unknown>;
  };
}

export interface ExecutionProgressEvent {
  type: 'execution_progress';
  data: {
    attemptId: string;
    taskId: string;
    projectId: string;
    progress: {
      stage: string;
      percentage: number;
      message: string;
      timestamp: number;
    };
  };
}

export interface WebSocketStats {
  connectedClients: number;
  projectRooms: number;
  roomDetails: Array<{ projectId: string; clientCount: number }>;
}

export class WebSocketClient {
  private socket: Socket | null = null;
  private currentProjectId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  // Event callbacks
  private taskUpdateCallbacks: ((event: TaskUpdateEvent) => void)[] = [];
  private taskAttemptUpdateCallbacks: ((event: TaskAttemptUpdateEvent) => void)[] = [];
  private executionProgressCallbacks: ((event: ExecutionProgressEvent) => void)[] = [];
  private connectionCallbacks: ((connected: boolean) => void)[] = [];

  constructor() {
    this.connect();
  }

  private connect(): void {
    if (this.socket?.connected) {
      return;
    }

    const wsUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000'
      : window.location.origin;

    this.socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      forceNew: true,
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('WebSocket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      this.notifyConnectionCallbacks(true);

      // Rejoin project room if we were in one
      if (this.currentProjectId) {
        this.joinProject(this.currentProjectId);
      }
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('WebSocket disconnected:', reason);
      this.notifyConnectionCallbacks(false);

      // Handle reconnection for certain disconnect reasons
      if (reason === 'io server disconnect') {
        // Server disconnected us, don't auto-reconnect
        this.socket?.connect();
      }
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('WebSocket connection error:', error);
      this.handleReconnection();
    });

    this.socket.on('connected', (data: { clientId: string; timestamp: number; message: string }) => {
      console.log('WebSocket welcome:', data);
    });

    this.socket.on('joined_project', (data: { projectId: string; timestamp: number; clientCount: number }) => {
      console.log(`Joined project room: ${data.projectId}, clients: ${data.clientCount}`);
    });

    this.socket.on('left_project', (data: { projectId: string; timestamp: number }) => {
      console.log(`Left project room: ${data.projectId}`);
    });

    this.socket.on('client_joined', (data: { clientId: string; projectId: string; timestamp: number; totalClients: number }) => {
      console.log(`Client joined project ${data.projectId}: ${data.clientId}, total: ${data.totalClients}`);
    });

    this.socket.on('client_left', (data: { clientId: string; projectId: string; timestamp: number; totalClients: number }) => {
      console.log(`Client left project ${data.projectId}: ${data.clientId}, total: ${data.totalClients}`);
    });

    // Task update events
    this.socket.on('task_update', (event: WebSocketEvent) => {
      const taskEvent = event as TaskUpdateEvent & { timestamp: number };
      this.taskUpdateCallbacks.forEach(callback => callback(taskEvent));
    });

    // Task attempt update events
    this.socket.on('task_attempt_update', (event: WebSocketEvent) => {
      const attemptEvent = event as TaskAttemptUpdateEvent & { timestamp: number };
      this.taskAttemptUpdateCallbacks.forEach(callback => callback(attemptEvent));
    });

    // Execution progress events
    this.socket.on('execution_progress', (event: WebSocketEvent) => {
      const progressEvent = event as ExecutionProgressEvent & { timestamp: number };
      this.executionProgressCallbacks.forEach(callback => callback(progressEvent));
    });

    this.socket.on('pong', (data: { timestamp: number }) => {
      console.log('WebSocket pong received:', data);
    });
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private notifyConnectionCallbacks(connected: boolean): void {
    this.connectionCallbacks.forEach(callback => callback(connected));
  }

  // Public API methods
  joinProject(projectId: string): void {
    if (this.currentProjectId === projectId) {
      return; // Already in this project
    }

    // Leave current project if in one
    if (this.currentProjectId) {
      this.leaveProject();
    }

    this.currentProjectId = projectId;
    if (this.socket?.connected) {
      this.socket.emit('join_project', projectId);
    }
  }

  leaveProject(): void {
    if (this.currentProjectId && this.socket?.connected) {
      this.socket.emit('leave_project', this.currentProjectId);
    }
    this.currentProjectId = null;
  }

  ping(): void {
    if (this.socket?.connected) {
      this.socket.emit('ping');
    }
  }

  // Event subscription methods
  onTaskUpdate(callback: (event: TaskUpdateEvent) => void): () => void {
    this.taskUpdateCallbacks.push(callback);
    return () => {
      const index = this.taskUpdateCallbacks.indexOf(callback);
      if (index > -1) {
        this.taskUpdateCallbacks.splice(index, 1);
      }
    };
  }

  onTaskAttemptUpdate(callback: (event: TaskAttemptUpdateEvent) => void): () => void {
    this.taskAttemptUpdateCallbacks.push(callback);
    return () => {
      const index = this.taskAttemptUpdateCallbacks.indexOf(callback);
      if (index > -1) {
        this.taskAttemptUpdateCallbacks.splice(index, 1);
      }
    };
  }

  onExecutionProgress(callback: (event: ExecutionProgressEvent) => void): () => void {
    this.executionProgressCallbacks.push(callback);
    return () => {
      const index = this.executionProgressCallbacks.indexOf(callback);
      if (index > -1) {
        this.executionProgressCallbacks.splice(index, 1);
      }
    };
  }

  onConnectionChange(callback: (connected: boolean) => void): () => void {
    this.connectionCallbacks.push(callback);
    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectionCallbacks.splice(index, 1);
      }
    };
  }

  // Connection status
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  getCurrentProjectId(): string | null {
    return this.currentProjectId;
  }

  getSocketId(): string | null {
    return this.socket?.id ?? null;
  }

  // Cleanup
  disconnect(): void {
    if (this.currentProjectId) {
      this.leaveProject();
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    // Clear all callbacks
    this.taskUpdateCallbacks = [];
    this.taskAttemptUpdateCallbacks = [];
    this.executionProgressCallbacks = [];
    this.connectionCallbacks = [];
  }
}

// Singleton instance
let webSocketClient: WebSocketClient | null = null;

export function getWebSocketClient(): WebSocketClient {
  if (!webSocketClient) {
    webSocketClient = new WebSocketClient();
  }
  return webSocketClient;
}

export function disconnectWebSocket(): void {
  if (webSocketClient) {
    webSocketClient.disconnect();
    webSocketClient = null;
  }
}