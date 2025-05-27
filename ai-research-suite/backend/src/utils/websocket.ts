import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { logger } from './logger';
import { config } from '../config';

export enum WSEventType {
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
  PROGRESS_UPDATE = 'progress_update',
  STATUS_CHANGE = 'status_change',
  SOURCE_FOUND = 'source_found',
  PARTIAL_REPORT = 'partial_report',
  RESEARCH_COMPLETE = 'research_complete',
  ERROR = 'error',
}

export interface ProgressUpdateEvent {
  sessionId: string;
  progress: {
    percentage: number;
    currentPhase: string;
    phasesCompleted: string[];
    estimatedTimeRemaining?: number;
  };
}

export interface SourceFoundEvent {
  sessionId: string;
  source: {
    url: string;
    title: string;
    relevanceScore: number;
    summary: string;
  };
}

export interface StatusChangeEvent {
  sessionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message?: string;
}

let io: SocketIOServer;

export function setupWebSockets(socketServer: SocketIOServer): void {
  io = socketServer;

  // Add authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    
    if (!token) {
      logger.warn(`WebSocket connection rejected: No token provided`);
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      socket.data.userId = decoded.id;
      socket.data.email = decoded.email;
      logger.info(`WebSocket authenticated: ${decoded.email}`);
      next();
    } catch (error) {
      logger.warn(`WebSocket authentication failed:`, error);
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id} (user: ${socket.data.email})`);

    socket.on(WSEventType.SUBSCRIBE, ({ sessionId }: { sessionId: string }) => {
      socket.join(`research:${sessionId}`);
      logger.info(`Client ${socket.id} subscribed to session ${sessionId}`);
    });

    socket.on(WSEventType.UNSUBSCRIBE, ({ sessionId }: { sessionId: string }) => {
      socket.leave(`research:${sessionId}`);
      logger.info(`Client ${socket.id} unsubscribed from session ${sessionId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id} (user: ${socket.data.email})`);
    });
  });
}

export function emitProgressUpdate(event: ProgressUpdateEvent): void {
  if (!io) {
    logger.warn('WebSocket server not initialized');
    return;
  }
  io.to(`research:${event.sessionId}`).emit(WSEventType.PROGRESS_UPDATE, event);
}

export function emitSourceFound(event: SourceFoundEvent): void {
  if (!io) {
    logger.warn('WebSocket server not initialized');
    return;
  }
  io.to(`research:${event.sessionId}`).emit(WSEventType.SOURCE_FOUND, event);
}

export function emitStatusChange(event: StatusChangeEvent): void {
  if (!io) {
    logger.warn('WebSocket server not initialized');
    return;
  }
  io.to(`research:${event.sessionId}`).emit(WSEventType.STATUS_CHANGE, event);
}

export function emitResearchComplete(sessionId: string, reportId: string): void {
  if (!io) {
    logger.warn('WebSocket server not initialized');
    return;
  }
  io.to(`research:${sessionId}`).emit(WSEventType.RESEARCH_COMPLETE, { sessionId, reportId });
}

export function emitError(sessionId: string, error: string): void {
  if (!io) {
    logger.warn('WebSocket server not initialized');
    return;
  }
  io.to(`research:${sessionId}`).emit(WSEventType.ERROR, { sessionId, error });
}