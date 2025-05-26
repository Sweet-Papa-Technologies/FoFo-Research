import { Server as SocketIOServer } from 'socket.io';
import { logger } from './logger';

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

  io.on('connection', (socket) => {
    logger.info(`Client connected: ${socket.id}`);

    socket.on(WSEventType.SUBSCRIBE, ({ sessionId }: { sessionId: string }) => {
      socket.join(`research:${sessionId}`);
      logger.info(`Client ${socket.id} subscribed to session ${sessionId}`);
    });

    socket.on(WSEventType.UNSUBSCRIBE, ({ sessionId }: { sessionId: string }) => {
      socket.leave(`research:${sessionId}`);
      logger.info(`Client ${socket.id} unsubscribed from session ${sessionId}`);
    });

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
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