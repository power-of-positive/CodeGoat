import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { ILogger } from '../logger-interface';

export interface WebSocketEvent {
  type: string;
  data: unknown;
  timestamp: number;
  room?: string;
}

export interface ProjectRoom {
  projectId: string;
  clients: Set<string>;
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

export type KanbanWebSocketEvent =
  | TaskUpdateEvent
  | TaskAttemptUpdateEvent
  | ExecutionProgressEvent;

export class WebSocketService {
  private io: SocketIOServer | null = null;
  private projectRooms: Map<string, ProjectRoom> = new Map();
  private logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  /**
   * Initialize WebSocket server with HTTP server
   */
  initialize(httpServer: HttpServer): void {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: [
          'http://localhost:3000',
          'http://localhost:3001',
          'http://localhost:5173', // Vite dev server
          'http://127.0.0.1:3000',
          'http://127.0.0.1:3001',
          'http://127.0.0.1:5173',
        ],
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.io.on('connection', (socket: Socket) => {
      this.handleConnection(socket);
    });

    this.logger.info('WebSocket server initialized');
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(socket: Socket): void {
    this.logger.info(`WebSocket client connected: ${socket.id}`);

    // Handle joining project rooms
    socket.on('join_project', (projectId: string) => {
      this.joinProjectRoom(socket, projectId);
    });

    // Handle leaving project rooms
    socket.on('leave_project', (projectId: string) => {
      this.leaveProjectRoom(socket, projectId);
    });

    // Handle client ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Handle disconnection
    socket.on('disconnect', (reason: string) => {
      this.handleDisconnection(socket, reason);
    });

    // Send welcome message
    socket.emit('connected', {
      clientId: socket.id,
      timestamp: Date.now(),
      message: 'WebSocket connection established',
    });
  }

  /**
   * Join a project room for receiving project-specific updates
   */
  private joinProjectRoom(socket: Socket, projectId: string): void {
    const roomName = `project_${projectId}`;
    socket.join(roomName);

    // Track project room membership
    if (!this.projectRooms.has(projectId)) {
      this.projectRooms.set(projectId, {
        projectId,
        clients: new Set(),
      });
    }

    const room = this.projectRooms.get(projectId)!;
    room.clients.add(socket.id);

    this.logger.debug?.(`Client ${socket.id} joined project room: ${projectId}`);

    socket.emit('joined_project', {
      projectId,
      timestamp: Date.now(),
      clientCount: room.clients.size,
    });

    // Notify other clients in the room
    socket.to(roomName).emit('client_joined', {
      clientId: socket.id,
      projectId,
      timestamp: Date.now(),
      totalClients: room.clients.size,
    });
  }

  /**
   * Leave a project room
   */
  private leaveProjectRoom(socket: Socket, projectId: string): void {
    const roomName = `project_${projectId}`;
    socket.leave(roomName);

    // Update project room membership
    const room = this.projectRooms.get(projectId);
    if (room) {
      room.clients.delete(socket.id);

      // Clean up empty rooms
      if (room.clients.size === 0) {
        this.projectRooms.delete(projectId);
      }
    }

    this.logger.debug?.(`Client ${socket.id} left project room: ${projectId}`);

    socket.emit('left_project', {
      projectId,
      timestamp: Date.now(),
    });

    // Notify other clients in the room
    socket.to(roomName).emit('client_left', {
      clientId: socket.id,
      projectId,
      timestamp: Date.now(),
      totalClients: room ? room.clients.size : 0,
    });
  }

  /**
   * Handle client disconnection
   */
  private handleDisconnection(socket: Socket, reason: string): void {
    this.logger.info(`WebSocket client disconnected: ${socket.id}, reason: ${reason}`);

    // Clean up project room memberships
    for (const [projectId, room] of this.projectRooms.entries()) {
      if (room.clients.has(socket.id)) {
        room.clients.delete(socket.id);

        // Notify other clients in the room
        const roomName = `project_${projectId}`;
        socket.to(roomName).emit('client_left', {
          clientId: socket.id,
          projectId,
          timestamp: Date.now(),
          totalClients: room.clients.size,
        });

        // Clean up empty rooms
        if (room.clients.size === 0) {
          this.projectRooms.delete(projectId);
        }
      }
    }
  }

  /**
   * Broadcast a task update to all clients in a project room
   */
  broadcastTaskUpdate(event: TaskUpdateEvent): void {
    if (!this.io) {
      this.logger.warn?.('WebSocket server not initialized, cannot broadcast task update');
      return;
    }

    const roomName = `project_${event.data.projectId}`;
    const websocketEvent: WebSocketEvent = {
      type: event.type,
      data: event.data,
      timestamp: Date.now(),
      room: roomName,
    };

    this.io.to(roomName).emit('task_update', websocketEvent);
    this.logger.debug?.(`Broadcast task update to room ${roomName}: ${event.type}`);
  }

  /**
   * Broadcast a task attempt update to all clients in a project room
   */
  broadcastTaskAttemptUpdate(event: TaskAttemptUpdateEvent): void {
    if (!this.io) {
      this.logger.warn?.('WebSocket server not initialized, cannot broadcast task attempt update');
      return;
    }

    const roomName = `project_${event.data.projectId}`;
    const websocketEvent: WebSocketEvent = {
      type: event.type,
      data: event.data,
      timestamp: Date.now(),
      room: roomName,
    };

    this.io.to(roomName).emit('task_attempt_update', websocketEvent);
    this.logger.debug?.(`Broadcast task attempt update to room ${roomName}: ${event.type}`);
  }

  /**
   * Broadcast execution progress to all clients in a project room
   */
  broadcastExecutionProgress(event: ExecutionProgressEvent): void {
    if (!this.io) {
      this.logger.warn?.('WebSocket server not initialized, cannot broadcast execution progress');
      return;
    }

    const roomName = `project_${event.data.projectId}`;
    const websocketEvent: WebSocketEvent = {
      type: event.type,
      data: event.data,
      timestamp: Date.now(),
      room: roomName,
    };

    this.io.to(roomName).emit('execution_progress', websocketEvent);
    this.logger.debug?.(
      `Broadcast execution progress to room ${roomName}: ${event.data.progress.stage}`
    );
  }

  /**
   * Send a custom event to all clients in a specific project room
   */
  sendToProjectRoom(projectId: string, eventName: string, data: unknown): void {
    if (!this.io) {
      this.logger.warn?.('WebSocket server not initialized, cannot send to project room');
      return;
    }

    const roomName = `project_${projectId}`;
    const websocketEvent: WebSocketEvent = {
      type: eventName,
      data,
      timestamp: Date.now(),
      room: roomName,
    };

    this.io.to(roomName).emit(eventName, websocketEvent);
    this.logger.debug?.(`Sent custom event ${eventName} to room ${roomName}`);
  }

  /**
   * Send an event to all connected clients
   */
  broadcast(eventName: string, data: unknown): void {
    if (!this.io) {
      this.logger.warn?.('WebSocket server not initialized, cannot broadcast');
      return;
    }

    const websocketEvent: WebSocketEvent = {
      type: eventName,
      data,
      timestamp: Date.now(),
    };

    this.io.emit(eventName, websocketEvent);
    this.logger.debug?.(`Broadcast event ${eventName} to all clients`);
  }

  /**
   * Get statistics about connected clients and rooms
   */
  getStats(): {
    connectedClients: number;
    projectRooms: number;
    roomDetails: Array<{ projectId: string; clientCount: number }>;
  } {
    const roomDetails = Array.from(this.projectRooms.entries()).map(([projectId, room]) => ({
      projectId,
      clientCount: room.clients.size,
    }));

    return {
      connectedClients: this.io ? this.io.engine.clientsCount : 0,
      projectRooms: this.projectRooms.size,
      roomDetails,
    };
  }

  /**
   * Get the Socket.IO server instance
   */
  getServer(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Shutdown the WebSocket server
   */
  shutdown(): void {
    if (this.io) {
      this.io.close();
      this.io = null;
      this.projectRooms.clear();
      this.logger.info('WebSocket server shutdown');
    }
  }
}
