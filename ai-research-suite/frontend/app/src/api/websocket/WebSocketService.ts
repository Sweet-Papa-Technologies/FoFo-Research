/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/consistent-type-imports */
import { io, Socket } from 'socket.io-client';
import { TokenManager } from '../auth/TokenManager';
import { getEnvironment } from '../../config/environment';

export enum WebSocketEvent {
  // Client -> Server
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',

  // Server -> Client
  PROGRESS_UPDATE = 'progress_update',
  STATUS_CHANGE = 'status_change',
  SOURCE_FOUND = 'source_found',
  PARTIAL_REPORT = 'partial_report',
  RESEARCH_COMPLETE = 'research_complete',
  ERROR = 'error'
}

export interface ProgressUpdate {
  sessionId: string;
  progress: {
    percentage: number;
    currentPhase: string;
    phasesCompleted: string[];
    estimatedTimeRemaining: number;
  };
}

export interface StatusUpdate {
  sessionId: string;
  status: string;
  message?: string;
}

export interface SourceFoundUpdate {
  sessionId: string;
  source: {
    url: string;
    title: string;
    relevanceScore: number;
    summary: string;
  };
}

export interface PartialReportUpdate {
  sessionId: string;
  content: string;
  section: string;
}

export interface ResearchCompleteUpdate {
  sessionId: string;
  reportId: string;
  status: 'success' | 'error';
  message?: string;
}

type EventCallback<T = any> = (data: T) => void;

export class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const env = getEnvironment();
      const token = TokenManager.getAccessToken();

      if (!token) {
        reject(new Error('No authentication token available'));
        return;
      }

      // When wsUrl is empty, we need to explicitly specify the path
      // to ensure Socket.IO uses the proxy correctly
      const socketUrl = env.wsUrl || `ws://${window.location.hostname}:80`;

      this.socket = io(socketUrl, {
        auth: { token },
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.reconnectAttempts++;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(error);
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
      });

      this.setupEventListeners();
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  subscribeToSession(sessionId: string) {
    this.emit(WebSocketEvent.SUBSCRIBE, { sessionId });
  }

  unsubscribeFromSession(sessionId: string) {
    this.emit(WebSocketEvent.UNSUBSCRIBE, { sessionId });
  }

  on<T = any>(event: WebSocketEvent, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  off(event: WebSocketEvent, callback?: EventCallback) {
    if (!callback) {
      this.listeners.delete(event);
    } else {
      this.listeners.get(event)?.delete(callback);
    }
  }

  private emit(event: string, data: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn(`Cannot emit ${event}, socket not connected`);
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    // Remove existing listeners to prevent duplicates
    Object.values(WebSocketEvent).forEach(event => {
      this.socket!.removeAllListeners(event);
    });

    // Set up listeners for all events
    Object.values(WebSocketEvent).forEach(event => {
      this.socket!.on(event, (data) => {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
          callbacks.forEach(callback => {
            try {
              callback(data);
            } catch (error) {
              console.error(`Error in WebSocket callback for ${event}:`, error);
            }
          });
        }
      });
    });
  }
}

// Singleton instance
export const wsService = new WebSocketService();
