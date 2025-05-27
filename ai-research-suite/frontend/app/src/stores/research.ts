/* eslint-disable @typescript-eslint/no-explicit-any */
import { defineStore } from 'pinia';
import { ResearchService } from '../api/ResearchService';
import { wsService, WebSocketEvent } from '../api/websocket/WebSocketService';
import type {
  ResearchSession,
  CreateResearchRequest,
  ResearchSource
} from '../types/research';
import type {
  ProgressUpdate,
  StatusUpdate,
  SourceFoundUpdate,
  ResearchCompleteUpdate
} from '../api/websocket/WebSocketService';

interface ResearchState {
  activeSessions: Map<string, ResearchSession>;
  sessionHistory: ResearchSession[];
  currentSession: ResearchSession | null;
  currentSources: ResearchSource[];
  isLoading: boolean;
  error: string | null;
}

export const useResearchStore = defineStore('research', {
  state: (): ResearchState => ({
    activeSessions: new Map(),
    sessionHistory: [],
    currentSession: null,
    currentSources: [],
    isLoading: false,
    error: null
  }),

  getters: {
    activeSessionCount: (state) => state.activeSessions.size,
    hasActiveSessions: (state) => state.activeSessions.size > 0,

    getSessionById: (state) => (id: string) => {
      return state.activeSessions.get(id) ||
             state.sessionHistory.find(s => s.id === id);
    },

    sortedSessionHistory: (state) => {
      return [...state.sessionHistory].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    },

    completedSessions: (state) => {
      return state.sessionHistory.filter(s => s.status === 'completed');
    },

    failedSessions: (state) => {
      return state.sessionHistory.filter(s => s.status === 'failed');
    }
  },

  actions: {
    async startResearch(request: CreateResearchRequest) {
      this.isLoading = true;
      this.error = null;

      try {
        const session = await ResearchService.startResearch(request);
        this.activeSessions.set(session.id, session);
        this.currentSession = session;

        // Subscribe to WebSocket updates for this session
        this.subscribeToSession(session.id);

        return session;
      } catch (error: any) {
        this.error = error.response?.data?.error || 'Failed to start research';
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchSession(sessionId: string) {
      this.isLoading = true;
      this.error = null;

      try {
        const session = await ResearchService.getSession(sessionId);

        if (session.status === 'completed' || session.status === 'failed' || session.status === 'cancelled') {
          this.activeSessions.delete(sessionId);
          const index = this.sessionHistory.findIndex(s => s.id === sessionId);
          if (index >= 0) {
            this.sessionHistory[index] = session;
          } else {
            this.sessionHistory.push(session);
          }
        } else {
          this.activeSessions.set(sessionId, session);
          this.subscribeToSession(sessionId);
        }

        if (this.currentSession?.id === sessionId) {
          this.currentSession = session;
        }

        return session;
      } catch (error: any) {
        this.error = error.response?.data?.error || 'Failed to fetch session';
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchSessionHistory() {
      this.isLoading = true;
      this.error = null;

      try {
        const response = await ResearchService.getSessionHistory();
        this.sessionHistory = response.data;

        // Move active sessions to activeSessions map
        this.sessionHistory.forEach(session => {
          if (session.status !== 'completed' &&
              session.status !== 'failed' &&
              session.status !== 'cancelled') {
            this.activeSessions.set(session.id, session);
            this.subscribeToSession(session.id);
          }
        });
      } catch (error: any) {
        this.error = error.response?.data?.error || 'Failed to fetch session history';
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    async cancelResearch(sessionId: string) {
      try {
        await ResearchService.cancelResearch(sessionId);

        const session = this.activeSessions.get(sessionId);
        if (session) {
          session.status = 'cancelled';
          this.activeSessions.delete(sessionId);
          this.sessionHistory.push(session);
        }

        if (this.currentSession?.id === sessionId) {
          this.currentSession = null;
          this.currentSources = [];
        }

        wsService.unsubscribeFromSession(sessionId);
      } catch (error: any) {
        this.error = error.response?.data?.error || 'Failed to cancel research';
        throw error;
      }
    },

    async retryResearch(sessionId: string) {
      this.isLoading = true;
      this.error = null;

      try {
        const session = await ResearchService.retryResearch(sessionId);
        this.activeSessions.set(session.id, session);
        this.currentSession = session;
        this.currentSources = [];

        // Subscribe to WebSocket updates
        this.subscribeToSession(session.id);

        return session;
      } catch (error: any) {
        this.error = error.response?.data?.error || 'Failed to retry research';
        throw error;
      } finally {
        this.isLoading = false;
      }
    },

    setCurrentSession(sessionId: string | null) {
      if (!sessionId) {
        this.currentSession = null;
        this.currentSources = [];
        return;
      }

      const session = this.activeSessions.get(sessionId) ||
                     this.sessionHistory.find(s => s.id === sessionId);

      if (session) {
        this.currentSession = session;
        if (session.status !== 'completed' &&
            session.status !== 'failed' &&
            session.status !== 'cancelled') {
          this.subscribeToSession(sessionId);
        }
      }
    },

    updateSessionProgress(sessionId: string, progress: ResearchSession['progress']) {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.progress = progress;

        if (this.currentSession?.id === sessionId) {
          this.currentSession.progress = progress;
        }
      }
    },

    updateSessionStatus(sessionId: string, status: ResearchSession['status']) {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.status = status;

        if (this.currentSession?.id === sessionId) {
          this.currentSession.status = status;
        }

        // Move to history if completed/failed/cancelled
        if (status === 'completed' || status === 'failed' || status === 'cancelled') {
          this.activeSessions.delete(sessionId);
          this.sessionHistory.push(session);
          wsService.unsubscribeFromSession(sessionId);
        }
      }
    },

    addSource(sessionId: string, source: ResearchSource) {
      if (this.currentSession?.id === sessionId) {
        this.currentSources.push(source);
      }
    },

    subscribeToSession(sessionId: string) {
      // Subscribe to WebSocket updates
      wsService.subscribeToSession(sessionId);

      // Set up event listeners
      const unsubscribers: (() => void)[] = [];

      unsubscribers.push(
        wsService.on<ProgressUpdate>(WebSocketEvent.PROGRESS_UPDATE, (data) => {
          if (data.sessionId === sessionId) {
            this.updateSessionProgress(sessionId, data.progress);
          }
        })
      );

      unsubscribers.push(
        wsService.on<StatusUpdate>(WebSocketEvent.STATUS_CHANGE, (data) => {
          if (data.sessionId === sessionId) {
            this.updateSessionStatus(sessionId, data.status as ResearchSession['status']);
          }
        })
      );

      unsubscribers.push(
        wsService.on<SourceFoundUpdate>(WebSocketEvent.SOURCE_FOUND, (data) => {
          if (data.sessionId === sessionId) {
            this.addSource(sessionId, data.source as ResearchSource);
          }
        })
      );

      unsubscribers.push(
        wsService.on<ResearchCompleteUpdate>(WebSocketEvent.RESEARCH_COMPLETE, (data) => {
          if (data.sessionId === sessionId) {
            const session = this.activeSessions.get(sessionId);
            if (session) {
              session.status = data.status === 'success' ? 'completed' : 'failed';
              session.reportId = data.reportId;
              this.updateSessionStatus(sessionId, session.status);
            }
          }
        })
      );

      // Store unsubscribers for cleanup
      (this as any)[`_unsubscribers_${sessionId}`] = unsubscribers;
    },

    clearError() {
      this.error = null;
    }
  }
});
