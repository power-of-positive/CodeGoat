import { WebSocketService, TaskUpdateEvent, TaskAttemptUpdateEvent, ExecutionProgressEvent } from '../../services/websocket.service';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { ILogger } from '../../logger-interface';

// Mock Socket.IO
jest.mock('socket.io', () => {
  const mockSocket = {
    id: 'test-socket-id',
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    to: jest.fn(() => ({
      emit: jest.fn(),
    })),
    on: jest.fn(),
  };

  const mockIO = {
    on: jest.fn(),
    to: jest.fn(() => ({
      emit: jest.fn(),
    })),
    emit: jest.fn(),
    close: jest.fn(),
    engine: {
      clientsCount: 5,
    },
  };

  return {
    Server: jest.fn(() => mockIO),
    __mockSocket: mockSocket,
    __mockIO: mockIO,
  };
});

describe('WebSocketService', () => {
  let websocketService: WebSocketService;
  let mockLogger: jest.Mocked<ILogger>;
  let mockHttpServer: jest.Mocked<HttpServer>;
  let mockSocket: any;
  let mockIO: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup mock logger
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    // Setup mock HTTP server
    mockHttpServer = {} as jest.Mocked<HttpServer>;

    // Get mock instances
    const { Server } = require('socket.io');
    const { __mockSocket, __mockIO } = require('socket.io');
    mockSocket = __mockSocket;
    mockIO = __mockIO;

    websocketService = new WebSocketService(mockLogger);
  });

  describe('constructor', () => {
    it('should initialize with logger', () => {
      expect(websocketService).toBeInstanceOf(WebSocketService);
      expect(websocketService.getServer()).toBeNull();
    });
  });

  describe('initialize', () => {
    it('should initialize WebSocket server with correct configuration', () => {
      websocketService.initialize(mockHttpServer);

      const { Server } = require('socket.io');
      expect(Server).toHaveBeenCalledWith(mockHttpServer, {
        cors: {
          origin: [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:5173',
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

      expect(mockIO.on).toHaveBeenCalledWith('connection', expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith('WebSocket server initialized');
    });

    it('should return the Socket.IO server instance after initialization', () => {
      websocketService.initialize(mockHttpServer);
      expect(websocketService.getServer()).toBe(mockIO);
    });
  });

  describe('handleConnection', () => {
    beforeEach(() => {
      websocketService.initialize(mockHttpServer);
      // Simulate connection event
      const connectionHandler = mockIO.on.mock.calls.find((call: any) => call[0] === 'connection')[1];
      connectionHandler(mockSocket);
    });

    it('should log client connection', () => {
      expect(mockLogger.info).toHaveBeenCalledWith(`WebSocket client connected: ${mockSocket.id}`);
    });

    it('should set up socket event listeners', () => {
      expect(mockSocket.on).toHaveBeenCalledWith('join_project', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('leave_project', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('ping', expect.any(Function));
      expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
    });

    it('should send welcome message', () => {
      expect(mockSocket.emit).toHaveBeenCalledWith('connected', {
        clientId: mockSocket.id,
        timestamp: expect.any(Number),
        message: 'WebSocket connection established',
      });
    });

    it('should handle ping event', () => {
      const pingHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'ping')[1];
      pingHandler();
      
      expect(mockSocket.emit).toHaveBeenCalledWith('pong', {
        timestamp: expect.any(Number),
      });
    });
  });

  describe('joinProjectRoom', () => {
    beforeEach(() => {
      websocketService.initialize(mockHttpServer);
      const connectionHandler = mockIO.on.mock.calls.find((call: any) => call[0] === 'connection')[1];
      connectionHandler(mockSocket);
    });

    it('should add client to project room', () => {
      const projectId = 'test-project';
      const joinHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'join_project')[1];
      
      joinHandler(projectId);

      expect(mockSocket.join).toHaveBeenCalledWith(`project_${projectId}`);
      expect(mockSocket.emit).toHaveBeenCalledWith('joined_project', {
        projectId,
        timestamp: expect.any(Number),
        clientCount: 1,
      });
    });

    it('should notify other clients when joining', () => {
      const projectId = 'test-project';
      const joinHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'join_project')[1];
      
      joinHandler(projectId);

      expect(mockSocket.to).toHaveBeenCalledWith(`project_${projectId}`);
    });

    it('should track project room membership', () => {
      const projectId = 'test-project';
      const joinHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'join_project')[1];
      
      joinHandler(projectId);

      const stats = websocketService.getStats();
      expect(stats.projectRooms).toBe(1);
      expect(stats.roomDetails).toEqual([{
        projectId,
        clientCount: 1,
      }]);
    });
  });

  describe('leaveProjectRoom', () => {
    let leaveHandler: any;

    beforeEach(() => {
      websocketService.initialize(mockHttpServer);
      const connectionHandler = mockIO.on.mock.calls.find((call: any) => call[0] === 'connection')[1];
      connectionHandler(mockSocket);
      
      // Join a room first
      const joinHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'join_project')[1];
      joinHandler('test-project');
      
      // Get leave handler before clearing mocks
      leaveHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'leave_project')[1];
      jest.clearAllMocks(); // Clear mocks after setup
    });

    it('should remove client from project room', () => {
      const projectId = 'test-project';
      
      leaveHandler(projectId);

      expect(mockSocket.leave).toHaveBeenCalledWith(`project_${projectId}`);
      expect(mockSocket.emit).toHaveBeenCalledWith('left_project', {
        projectId,
        timestamp: expect.any(Number),
      });
    });

    it('should clean up empty rooms', () => {
      const projectId = 'test-project';
      
      leaveHandler(projectId);

      const stats = websocketService.getStats();
      expect(stats.projectRooms).toBe(0);
    });
  });

  describe('handleDisconnection', () => {
    let disconnectHandler: any;

    beforeEach(() => {
      websocketService.initialize(mockHttpServer);
      const connectionHandler = mockIO.on.mock.calls.find((call: any) => call[0] === 'connection')[1];
      connectionHandler(mockSocket);
      
      // Join a room first
      const joinHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'join_project')[1];
      joinHandler('test-project');
      
      // Get disconnect handler before clearing mocks
      disconnectHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'disconnect')[1];
      jest.clearAllMocks(); // Clear mocks after setup
    });

    it('should log client disconnection', () => {
      const reason = 'client disconnect';
      
      disconnectHandler(reason);

      expect(mockLogger.info).toHaveBeenCalledWith(`WebSocket client disconnected: ${mockSocket.id}, reason: ${reason}`);
    });

    it('should clean up project room memberships', () => {
      disconnectHandler('client disconnect');

      const stats = websocketService.getStats();
      expect(stats.projectRooms).toBe(0);
    });
  });

  describe('broadcastTaskUpdate', () => {
    const taskUpdateEvent: TaskUpdateEvent = {
      type: 'task_updated',
      data: {
        taskId: 'task-1',
        projectId: 'project-1',
        task: { title: 'Test Task' },
        changes: { status: 'completed' },
      },
    };

    it('should broadcast task update when WebSocket server is initialized', () => {
      websocketService.initialize(mockHttpServer);
      
      websocketService.broadcastTaskUpdate(taskUpdateEvent);

      expect(mockIO.to).toHaveBeenCalledWith('project_project-1');
    });

    it('should warn when WebSocket server is not initialized', () => {
      websocketService.broadcastTaskUpdate(taskUpdateEvent);

      expect(mockLogger.warn).toHaveBeenCalledWith('WebSocket server not initialized, cannot broadcast task update');
    });
  });

  describe('broadcastTaskAttemptUpdate', () => {
    const taskAttemptEvent: TaskAttemptUpdateEvent = {
      type: 'task_attempt_updated',
      data: {
        attemptId: 'attempt-1',
        taskId: 'task-1',
        projectId: 'project-1',
        attempt: { status: 'running' },
      },
    };

    it('should broadcast task attempt update when WebSocket server is initialized', () => {
      websocketService.initialize(mockHttpServer);
      
      websocketService.broadcastTaskAttemptUpdate(taskAttemptEvent);

      expect(mockIO.to).toHaveBeenCalledWith('project_project-1');
    });

    it('should warn when WebSocket server is not initialized', () => {
      websocketService.broadcastTaskAttemptUpdate(taskAttemptEvent);

      expect(mockLogger.warn).toHaveBeenCalledWith('WebSocket server not initialized, cannot broadcast task attempt update');
    });
  });

  describe('broadcastExecutionProgress', () => {
    const progressEvent: ExecutionProgressEvent = {
      type: 'execution_progress',
      data: {
        attemptId: 'attempt-1',
        taskId: 'task-1',
        projectId: 'project-1',
        progress: {
          stage: 'processing',
          percentage: 50,
          message: 'Half way done',
          timestamp: Date.now(),
        },
      },
    };

    it('should broadcast execution progress when WebSocket server is initialized', () => {
      websocketService.initialize(mockHttpServer);
      
      websocketService.broadcastExecutionProgress(progressEvent);

      expect(mockIO.to).toHaveBeenCalledWith('project_project-1');
    });

    it('should warn when WebSocket server is not initialized', () => {
      websocketService.broadcastExecutionProgress(progressEvent);

      expect(mockLogger.warn).toHaveBeenCalledWith('WebSocket server not initialized, cannot broadcast execution progress');
    });
  });

  describe('sendToProjectRoom', () => {
    it('should send custom event to project room when WebSocket server is initialized', () => {
      websocketService.initialize(mockHttpServer);
      
      websocketService.sendToProjectRoom('project-1', 'custom_event', { message: 'test' });

      expect(mockIO.to).toHaveBeenCalledWith('project_project-1');
    });

    it('should warn when WebSocket server is not initialized', () => {
      websocketService.sendToProjectRoom('project-1', 'custom_event', { message: 'test' });

      expect(mockLogger.warn).toHaveBeenCalledWith('WebSocket server not initialized, cannot send to project room');
    });
  });

  describe('broadcast', () => {
    it('should broadcast to all clients when WebSocket server is initialized', () => {
      websocketService.initialize(mockHttpServer);
      
      websocketService.broadcast('global_event', { message: 'test' });

      expect(mockIO.emit).toHaveBeenCalledWith('global_event', {
        type: 'global_event',
        data: { message: 'test' },
        timestamp: expect.any(Number),
      });
    });

    it('should warn when WebSocket server is not initialized', () => {
      websocketService.broadcast('global_event', { message: 'test' });

      expect(mockLogger.warn).toHaveBeenCalledWith('WebSocket server not initialized, cannot broadcast');
    });
  });

  describe('getStats', () => {
    it('should return correct stats when no server is initialized', () => {
      const stats = websocketService.getStats();

      expect(stats).toEqual({
        connectedClients: 0,
        projectRooms: 0,
        roomDetails: [],
      });
    });

    it('should return correct stats when server is initialized', () => {
      websocketService.initialize(mockHttpServer);
      const connectionHandler = mockIO.on.mock.calls.find((call: any) => call[0] === 'connection')[1];
      connectionHandler(mockSocket);
      
      // Join a room
      const joinHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'join_project')[1];
      joinHandler('test-project');

      const stats = websocketService.getStats();

      expect(stats).toEqual({
        connectedClients: 5, // From mock engine.clientsCount
        projectRooms: 1,
        roomDetails: [
          {
            projectId: 'test-project',
            clientCount: 1,
          },
        ],
      });
    });
  });

  describe('shutdown', () => {
    it('should shutdown WebSocket server', () => {
      websocketService.initialize(mockHttpServer);
      
      websocketService.shutdown();

      expect(mockIO.close).toHaveBeenCalled();
      expect(websocketService.getServer()).toBeNull();
      expect(mockLogger.info).toHaveBeenCalledWith('WebSocket server shutdown');
    });

    it('should handle shutdown when server is not initialized', () => {
      websocketService.shutdown();

      expect(mockLogger.info).not.toHaveBeenCalledWith('WebSocket server shutdown');
    });

    it('should clear project rooms on shutdown', () => {
      websocketService.initialize(mockHttpServer);
      const connectionHandler = mockIO.on.mock.calls.find((call: any) => call[0] === 'connection')[1];
      connectionHandler(mockSocket);
      
      // Join a room
      const joinHandler = mockSocket.on.mock.calls.find((call: any) => call[0] === 'join_project')[1];
      joinHandler('test-project');

      websocketService.shutdown();

      const stats = websocketService.getStats();
      expect(stats.projectRooms).toBe(0);
    });
  });
});