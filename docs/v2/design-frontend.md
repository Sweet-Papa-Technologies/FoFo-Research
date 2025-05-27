# AI Research Suite - Frontend Development Guide

## Document Information
- **Type**: Frontend Requirements & High-Level Design
- **Version**: 1.0
- **Date**: May 27, 2025
- **Purpose**: Guide for AI programmer to build the Quasar/TypeScript frontend
- **Project Path**: `ai-research-suite/frontend/app`

## Table of Contents
1. [Overview](#overview)
2. [Technical Architecture](#technical-architecture)
3. [Authentication System](#authentication-system)
4. [Core UI Components](#core-ui-components)
5. [Real-time Updates](#real-time-updates)
6. [State Management](#state-management)
7. [API Integration](#api-integration)
8. [User Interface Design](#user-interface-design)
9. [Development Setup](#development-setup)

## Overview

### Project Goals
Build a responsive, intuitive web interface for the AI Research Suite that enables users to:
- Conduct AI-powered research with real-time progress tracking
- View and export comprehensive research reports
- Manage research sessions and history
- Configure search and AI model settings

### Key Features
- **Real-time Progress Monitoring**: WebSocket-based live updates during research
- **Secure Authentication**: JWT-based auth with refresh token management
- **Responsive Design**: Desktop and mobile-friendly interface
- **Dark/Light Theme Support**: User-selectable themes
- **Progressive Web App**: Offline capabilities and installable

## Technical Architecture

### Environment Configuration

```typescript
// src/config/environment.ts
export interface EnvironmentConfig {
  apiUrl: string;
  wsUrl: string;
  isDevelopment: boolean;
}

export const getEnvironment = (): EnvironmentConfig => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    apiUrl: isDevelopment ? 'http://localhost:80' : 'http://api:8080',
    wsUrl: isDevelopment ? 'ws://localhost:80' : 'ws://api:8080',
    isDevelopment
  };
};
```

### Project Structure

```
frontend/app/
├── src/
│   ├── api/              # API client and services
│   ├── components/       # Reusable Vue components
│   ├── composables/      # Vue composition functions
│   ├── layouts/          # Page layouts
│   ├── pages/            # Route pages
│   ├── router/           # Vue Router configuration
│   ├── stores/           # Pinia state stores
│   ├── types/            # TypeScript type definitions
│   └── utils/            # Utility functions
├── public/               # Static assets
└── quasar.config.js      # Quasar configuration
```

## Authentication System

### JWT Token Management

```typescript
// src/api/auth/TokenManager.ts
export class TokenManager {
  private static ACCESS_TOKEN_KEY = 'access_token';
  private static REFRESH_TOKEN_KEY = 'refresh_token';
  private static TOKEN_EXPIRY_KEY = 'token_expiry';
  
  static setTokens(accessToken: string, refreshToken: string, expiresIn: number) {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
    
    const expiryTime = Date.now() + (expiresIn * 1000);
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
  }
  
  static getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }
  
  static getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }
  
  static isTokenExpired(): boolean {
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiry) return true;
    
    return Date.now() > parseInt(expiry);
  }
  
  static clearTokens() {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
  }
}
```

### Authentication Service

```typescript
// src/api/auth/AuthService.ts
import { api } from '../client';
import { TokenManager } from './TokenManager';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

export class AuthService {
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    
    TokenManager.setTokens(
      response.data.accessToken,
      response.data.refreshToken,
      response.data.expiresIn
    );
    
    return response.data;
  }
  
  static async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      TokenManager.clearTokens();
    }
  }
  
  static async refreshToken(): Promise<string> {
    const refreshToken = TokenManager.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token available');
    
    const response = await api.post<AuthResponse>('/auth/refresh', {
      refreshToken
    });
    
    TokenManager.setTokens(
      response.data.accessToken,
      response.data.refreshToken,
      response.data.expiresIn
    );
    
    return response.data.accessToken;
  }
}
```

### API Client with Auto-refresh

```typescript
// src/api/client.ts
import axios, { AxiosInstance, AxiosError } from 'axios';
import { TokenManager } from './auth/TokenManager';
import { AuthService } from './auth/AuthService';
import { getEnvironment } from '@/config/environment';

const env = getEnvironment();

export const api: AxiosInstance = axios.create({
  baseURL: `${env.apiUrl}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = TokenManager.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshSubscribers.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }
      
      originalRequest._retry = true;
      isRefreshing = true;
      
      try {
        const newToken = await AuthService.refreshToken();
        refreshSubscribers.forEach(callback => callback(newToken));
        refreshSubscribers = [];
        
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    
    return Promise.reject(error);
  }
);
```

## Core UI Components

### Component Hierarchy

```
App.vue
├── layouts/
│   ├── MainLayout.vue
│   │   ├── AppHeader.vue
│   │   ├── NavigationDrawer.vue
│   │   └── router-view
│   └── AuthLayout.vue
│       └── router-view
├── pages/
│   ├── auth/
│   │   ├── LoginPage.vue
│   │   └── LogoutPage.vue
│   ├── research/
│   │   ├── NewResearch.vue
│   │   ├── ActiveResearch.vue
│   │   └── ResearchHistory.vue
│   ├── reports/
│   │   ├── ReportViewer.vue
│   │   └── ReportList.vue
│   └── settings/
│       ├── GeneralSettings.vue
│       └── IntegrationSettings.vue
└── components/
    ├── research/
    │   ├── TopicInput.vue
    │   ├── ParameterForm.vue
    │   ├── ProgressTracker.vue
    │   └── SourceCard.vue
    ├── reports/
    │   ├── MarkdownViewer.vue
    │   ├── CitationList.vue
    │   └── ExportDialog.vue
    └── common/
        ├── LoadingSpinner.vue
        ├── ErrorAlert.vue
        └── ConfirmDialog.vue
```

### Key Component Specifications

#### Login Component

```vue
<!-- src/pages/auth/LoginPage.vue -->
<template>
  <q-page class="flex flex-center">
    <q-card class="login-card" style="min-width: 400px">
      <q-card-section>
        <div class="text-h5 text-center q-mb-md">AI Research Suite</div>
      </q-card-section>
      
      <q-form @submit="onSubmit" class="q-gutter-md">
        <q-card-section>
          <q-input
            v-model="credentials.email"
            type="email"
            label="Email"
            outlined
            :rules="[val => !!val || 'Email is required']"
          />
          
          <q-input
            v-model="credentials.password"
            type="password"
            label="Password"
            outlined
            class="q-mt-md"
            :rules="[val => !!val || 'Password is required']"
          />
        </q-card-section>
        
        <q-card-actions>
          <q-btn
            type="submit"
            color="primary"
            class="full-width"
            label="Login"
            :loading="loading"
          />
        </q-card-actions>
      </q-form>
      
      <q-inner-loading :showing="loading">
        <q-spinner-dots size="50px" color="primary" />
      </q-inner-loading>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const $q = useQuasar();
const authStore = useAuthStore();

const credentials = ref({
  email: '',
  password: ''
});
const loading = ref(false);

async function onSubmit() {
  loading.value = true;
  
  try {
    await authStore.login(credentials.value);
    await router.push('/dashboard');
    
    $q.notify({
      type: 'positive',
      message: 'Successfully logged in'
    });
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: error.response?.data?.message || 'Login failed'
    });
  } finally {
    loading.value = false;
  }
}
</script>
```

#### Research Topic Input Component

```vue
<!-- src/components/research/TopicInput.vue -->
<template>
  <q-card>
    <q-card-section>
      <div class="text-h6 q-mb-md">New Research</div>
      
      <q-input
        v-model="topic"
        type="textarea"
        filled
        label="Research Topic"
        placeholder="Enter your research topic or question..."
        :rules="topicRules"
        counter
        maxlength="500"
        autogrow
        class="q-mb-md"
      />
      
      <q-expansion-item
        v-model="showAdvanced"
        label="Advanced Parameters"
        icon="settings"
      >
        <q-card>
          <q-card-section>
            <parameter-form v-model="parameters" />
          </q-card-section>
        </q-card>
      </q-expansion-item>
    </q-card-section>
    
    <q-separator />
    
    <q-card-actions align="right">
      <q-btn
        flat
        label="Cancel"
        @click="$emit('cancel')"
      />
      <q-btn
        unelevated
        color="primary"
        label="Start Research"
        :loading="loading"
        :disable="!isValid"
        @click="startResearch"
      />
    </q-card-actions>
  </q-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import { useResearchStore } from '@/stores/research';
import ParameterForm from './ParameterForm.vue';
import type { ResearchParameters } from '@/types/research';

const router = useRouter();
const $q = useQuasar();
const researchStore = useResearchStore();

const topic = ref('');
const parameters = ref<ResearchParameters>({
  maxSources: 20,
  minSources: 5,
  reportLength: 'medium',
  depth: 'standard'
});
const showAdvanced = ref(false);
const loading = ref(false);

const topicRules = [
  (val: string) => val?.length >= 3 || 'Topic must be at least 3 characters',
  (val: string) => val?.length <= 500 || 'Topic must be less than 500 characters'
];

const isValid = computed(() => 
  topic.value.length >= 3 && topic.value.length <= 500
);

async function startResearch() {
  loading.value = true;
  
  try {
    const session = await researchStore.startResearch({
      topic: topic.value,
      parameters: parameters.value
    });
    
    await router.push(`/research/active/${session.id}`);
  } catch (error) {
    $q.notify({
      type: 'negative',
      message: 'Failed to start research'
    });
  } finally {
    loading.value = false;
  }
}
</script>
```

## Real-time Updates

### WebSocket Service

```typescript
// src/api/websocket/WebSocketService.ts
import { io, Socket } from 'socket.io-client';
import { TokenManager } from '../auth/TokenManager';
import { getEnvironment } from '@/config/environment';

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

export interface SourceFoundUpdate {
  sessionId: string;
  source: {
    url: string;
    title: string;
    relevanceScore: number;
    summary: string;
  };
}

export class WebSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const env = getEnvironment();
      const token = TokenManager.getAccessToken();
      
      this.socket = io(env.wsUrl, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });
      
      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        resolve();
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        reject(error);
      });
      
      this.setupEventListeners();
    });
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  subscribeToSession(sessionId: string) {
    this.emit(WebSocketEvent.SUBSCRIBE, { sessionId });
  }
  
  unsubscribeFromSession(sessionId: string) {
    this.emit(WebSocketEvent.UNSUBSCRIBE, { sessionId });
  }
  
  on(event: WebSocketEvent, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }
  
  private emit(event: string, data: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    }
  }
  
  private setupEventListeners() {
    if (!this.socket) return;
    
    Object.values(WebSocketEvent).forEach(event => {
      this.socket!.on(event, (data) => {
        this.listeners.get(event)?.forEach(callback => callback(data));
      });
    });
  }
}

export const wsService = new WebSocketService();
```

### Progress Tracker Component

```vue
<!-- src/components/research/ProgressTracker.vue -->
<template>
  <q-card>
    <q-card-section>
      <div class="text-h6">Research Progress</div>
      
      <q-linear-progress
        :value="progress.percentage / 100"
        class="q-mt-md"
        size="20px"
        color="primary"
        animation-speed="300"
      >
        <div class="absolute-full flex flex-center">
          <q-badge color="white" text-color="primary" :label="`${progress.percentage}%`" />
        </div>
      </q-linear-progress>
      
      <div class="q-mt-md">
        <div class="text-subtitle2">Current Phase</div>
        <div class="text-body1">{{ progress.currentPhase }}</div>
      </div>
      
      <div class="q-mt-sm" v-if="progress.estimatedTimeRemaining">
        <div class="text-subtitle2">Estimated Time Remaining</div>
        <div class="text-body1">{{ formatTime(progress.estimatedTimeRemaining) }}</div>
      </div>
    </q-card-section>
    
    <q-separator />
    
    <q-card-section>
      <div class="text-subtitle2 q-mb-sm">Completed Phases</div>
      <q-list dense>
        <q-item v-for="phase in progress.phasesCompleted" :key="phase">
          <q-item-section avatar>
            <q-icon name="check_circle" color="positive" />
          </q-item-section>
          <q-item-section>{{ phase }}</q-item-section>
        </q-item>
      </q-list>
    </q-card-section>
    
    <q-separator />
    
    <q-card-section v-if="sources.length > 0">
      <div class="text-subtitle2 q-mb-sm">Sources Found ({{ sources.length }})</div>
      <q-virtual-scroll
        :items="sources"
        virtual-scroll-slice-size="5"
        v-slot="{ item }"
        style="max-height: 200px"
      >
        <source-card :source="item" class="q-mb-sm" />
      </q-virtual-scroll>
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { wsService, WebSocketEvent } from '@/api/websocket/WebSocketService';
import SourceCard from './SourceCard.vue';
import type { ProgressUpdate, SourceFoundUpdate } from '@/api/websocket/WebSocketService';

const props = defineProps<{
  sessionId: string;
}>();

const progress = ref({
  percentage: 0,
  currentPhase: 'Initializing',
  phasesCompleted: [] as string[],
  estimatedTimeRemaining: 0
});

const sources = ref<any[]>([]);

const unsubscribers: Function[] = [];

onMounted(() => {
  // Subscribe to session updates
  wsService.subscribeToSession(props.sessionId);
  
  // Listen for progress updates
  unsubscribers.push(
    wsService.on(WebSocketEvent.PROGRESS_UPDATE, (data: ProgressUpdate) => {
      if (data.sessionId === props.sessionId) {
        progress.value = data.progress;
      }
    })
  );
  
  // Listen for source discoveries
  unsubscribers.push(
    wsService.on(WebSocketEvent.SOURCE_FOUND, (data: SourceFoundUpdate) => {
      if (data.sessionId === props.sessionId) {
        sources.value.push(data.source);
      }
    })
  );
});

onUnmounted(() => {
  // Unsubscribe from session
  wsService.unsubscribeFromSession(props.sessionId);
  
  // Clean up listeners
  unsubscribers.forEach(unsubscribe => unsubscribe());
});

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}
</script>
```

## State Management

### Auth Store

```typescript
// src/stores/auth.ts
import { defineStore } from 'pinia';
import { AuthService } from '@/api/auth/AuthService';
import type { LoginCredentials } from '@/api/auth/AuthService';

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    isAuthenticated: false,
    isLoading: false
  }),
  
  getters: {
    isAdmin: (state) => state.user?.role === 'admin'
  },
  
  actions: {
    async login(credentials: LoginCredentials) {
      this.isLoading = true;
      
      try {
        const response = await AuthService.login(credentials);
        this.user = response.user;
        this.isAuthenticated = true;
      } finally {
        this.isLoading = false;
      }
    },
    
    async logout() {
      this.isLoading = true;
      
      try {
        await AuthService.logout();
      } finally {
        this.user = null;
        this.isAuthenticated = false;
        this.isLoading = false;
      }
    },
    
    async checkAuth() {
      // Check if user is already authenticated
      const token = TokenManager.getAccessToken();
      if (!token || TokenManager.isTokenExpired()) {
        this.isAuthenticated = false;
        return;
      }
      
      try {
        // Verify token with backend
        const response = await api.get('/auth/me');
        this.user = response.data;
        this.isAuthenticated = true;
      } catch {
        this.isAuthenticated = false;
      }
    }
  },
  
  persist: {
    enabled: true,
    strategies: [
      {
        key: 'auth',
        storage: localStorage,
        paths: ['user']
      }
    ]
  }
});
```

### Research Store

```typescript
// src/stores/research.ts
import { defineStore } from 'pinia';
import { ResearchService } from '@/api/ResearchService';
import type { ResearchSession, ResearchParameters } from '@/types/research';

interface ResearchState {
  activeSessions: Map<string, ResearchSession>;
  sessionHistory: ResearchSession[];
  currentSession: ResearchSession | null;
  isLoading: boolean;
}

export const useResearchStore = defineStore('research', {
  state: (): ResearchState => ({
    activeSessions: new Map(),
    sessionHistory: [],
    currentSession: null,
    isLoading: false
  }),
  
  getters: {
    activeSessionCount: (state) => state.activeSessions.size,
    hasActiveSessions: (state) => state.activeSessions.size > 0
  },
  
  actions: {
    async startResearch(params: { topic: string; parameters: ResearchParameters }) {
      this.isLoading = true;
      
      try {
        const session = await ResearchService.startResearch(params);
        this.activeSessions.set(session.id, session);
        this.currentSession = session;
        return session;
      } finally {
        this.isLoading = false;
      }
    },
    
    async fetchSessionHistory() {
      this.isLoading = true;
      
      try {
        const sessions = await ResearchService.getSessionHistory();
        this.sessionHistory = sessions;
      } finally {
        this.isLoading = false;
      }
    },
    
    async cancelResearch(sessionId: string) {
      await ResearchService.cancelResearch(sessionId);
      this.activeSessions.delete(sessionId);
      
      if (this.currentSession?.id === sessionId) {
        this.currentSession = null;
      }
    },
    
    updateSessionProgress(sessionId: string, progress: any) {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.progress = progress;
      }
    }
  }
});
```

## API Integration

### Research Service

```typescript
// src/api/ResearchService.ts
import { api } from './client';
import type { ResearchSession, ResearchParameters, Report } from '@/types/research';

export class ResearchService {
  static async startResearch(params: {
    topic: string;
    parameters: ResearchParameters;
  }): Promise<ResearchSession> {
    const response = await api.post<ResearchSession>('/research', params);
    return response.data;
  }
  
  static async getSession(sessionId: string): Promise<ResearchSession> {
    const response = await api.get<ResearchSession>(`/research/${sessionId}`);
    return response.data;
  }
  
  static async getSessionHistory(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ResearchSession[]> {
    const response = await api.get<{ data: ResearchSession[] }>('/research', {
      params
    });
    return response.data.data;
  }
  
  static async cancelResearch(sessionId: string): Promise<void> {
    await api.delete(`/research/${sessionId}`);
  }
  
  static async getReport(reportId: string, format: string = 'markdown'): Promise<Report> {
    const response = await api.get<Report>(`/reports/${reportId}`, {
      params: { format }
    });
    return response.data;
  }
  
  static async exportReport(reportId: string, format: 'pdf' | 'docx'): Promise<Blob> {
    const response = await api.get(`/reports/${reportId}`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  }
}
```

## User Interface Design

### Theme Configuration

```typescript
// src/css/quasar.variables.scss
$primary   : #1976D2;
$secondary : #26A69A;
$accent    : #9C27B0;

$dark      : #1D1D1D;
$dark-page : #121212;

$positive  : #21BA45;
$negative  : #C10015;
$info      : #31CCEC;
$warning   : #F2C037;

// Custom variables
$header-height: 64px;
$drawer-width: 256px;
$card-shadow: 0 1px 5px rgba(0, 0, 0, 0.2), 0 2px 2px rgba(0, 0, 0, 0.14), 0 3px 1px -2px rgba(0, 0, 0, 0.12);
```

### Main Layout

```vue
<!-- src/layouts/MainLayout.vue -->
<template>
  <q-layout view="lHh Lpr lFf">
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="toggleLeftDrawer"
        />

        <q-toolbar-title>
          AI Research Suite
        </q-toolbar-title>

        <q-space />

        <q-btn
          flat
          round
          :icon="$q.dark.isActive ? 'light_mode' : 'dark_mode'"
          @click="$q.dark.toggle"
        />
        
        <q-btn flat round icon="account_circle">
          <q-menu>
            <q-list style="min-width: 200px">
              <q-item v-if="authStore.user">
                <q-item-section>
                  <q-item-label>{{ authStore.user.email }}</q-item-label>
                  <q-item-label caption>{{ authStore.user.role }}</q-item-label>
                </q-item-section>
              </q-item>
              
              <q-separator />
              
              <q-item clickable v-close-popup to="/settings">
                <q-item-section avatar>
                  <q-icon name="settings" />
                </q-item-section>
                <q-item-section>Settings</q-item-section>
              </q-item>
              
              <q-item clickable v-close-popup @click="logout">
                <q-item-section avatar>
                  <q-icon name="logout" />
                </q-item-section>
                <q-item-section>Logout</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-drawer
      v-model="leftDrawerOpen"
      show-if-above
      bordered
    >
      <q-list>
        <q-item-label header>
          Navigation
        </q-item-label>

        <q-item
          v-for="item in navigationItems"
          :key="item.path"
          :to="item.path"
          exact
          clickable
        >
          <q-item-section avatar>
            <q-icon :name="item.icon" />
          </q-item-section>
          <q-item-section>
            <q-item-label>{{ item.label }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const leftDrawerOpen = ref(false);

const navigationItems = [
  { path: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { path: '/research/new', label: 'New Research', icon: 'add_circle' },
  { path: '/research/active', label: 'Active Research', icon: 'pending' },
  { path: '/research/history', label: 'Research History', icon: 'history' },
  { path: '/reports', label: 'Reports', icon: 'description' },
  { path: '/settings', label: 'Settings', icon: 'settings' }
];

function toggleLeftDrawer() {
  leftDrawerOpen.value = !leftDrawerOpen.value;
}

async function logout() {
  await authStore.logout();
  await router.push('/login');
}
</script>
```

### Error Handling

```vue
<!-- src/components/common/ErrorBoundary.vue -->
<template>
  <div v-if="hasError" class="error-boundary">
    <q-banner class="bg-negative text-white">
      <template v-slot:avatar>
        <q-icon name="error" />
      </template>
      <div class="text-h6">Something went wrong</div>
      <div>{{ error?.message || 'An unexpected error occurred' }}</div>
      <template v-slot:action>
        <q-btn flat label="Reload" @click="reload" />
      </template>
    </q-banner>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { ref, onErrorCaptured } from 'vue';

const hasError = ref(false);
const error = ref<Error | null>(null);

onErrorCaptured((err) => {
  hasError.value = true;
  error.value = err;
  console.error('Error caught by boundary:', err);
  return false;
});

function reload() {
  hasError.value = false;
  error.value = null;
  window.location.reload();
}
</script>
```

## Development Setup

### Environment Variables

```bash
# .env.development
NODE_ENV=development
API_URL=http://localhost:80
WS_URL=ws://localhost:80

# .env.production
NODE_ENV=production
API_URL=http://api:8080
WS_URL=ws://api:8080
```

### Router Configuration

```typescript
// src/router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes = [
  {
    path: '/login',
    component: () => import('@/pages/auth/LoginPage.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/dashboard'
      },
      {
        path: 'dashboard',
        component: () => import('@/pages/DashboardPage.vue')
      },
      {
        path: 'research/new',
        component: () => import('@/pages/research/NewResearch.vue')
      },
      {
        path: 'research/active/:id?',
        component: () => import('@/pages/research/ActiveResearch.vue')
      },
      {
        path: 'research/history',
        component: () => import('@/pages/research/ResearchHistory.vue')
      },
      {
        path: 'reports/:id?',
        component: () => import('@/pages/reports/ReportViewer.vue')
      },
      {
        path: 'settings',
        component: () => import('@/pages/settings/GeneralSettings.vue')
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Navigation guard for authentication
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  
  // Check authentication status
  await authStore.checkAuth();
  
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else if (to.path === '/login' && authStore.isAuthenticated) {
    next('/dashboard');
  } else {
    next();
  }
});

export default router;
```

### App Initialization

```typescript
// src/boot/app-init.ts
import { boot } from 'quasar/wrappers';
import { wsService } from '@/api/websocket/WebSocketService';
import { useAuthStore } from '@/stores/auth';

export default boot(async ({ app, router }) => {
  // Initialize auth state
  const authStore = useAuthStore();
  await authStore.checkAuth();
  
  // Connect WebSocket if authenticated
  if (authStore.isAuthenticated) {
    try {
      await wsService.connect();
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  }
  
  // Handle WebSocket reconnection on auth state change
  authStore.$subscribe((mutation, state) => {
    if (state.isAuthenticated && !wsService.isConnected()) {
      wsService.connect();
    } else if (!state.isAuthenticated && wsService.isConnected()) {
      wsService.disconnect();
    }
  });
});
```

## Key Implementation Notes

1. **API Configuration**: The frontend automatically switches between `http://localhost:80` (development) and `http://api:8080` (Docker) based on the environment.

2. **Token Management**: Access tokens are stored in localStorage with automatic refresh when they expire. The API client handles this transparently.

3. **WebSocket Connection**: Establishes real-time connection after authentication for live research updates.

4. **Progress Tracking**: Real-time updates are received via WebSocket and displayed in the ProgressTracker component.

5. **Error Handling**: Global error handling with user-friendly messages and automatic retry for network failures.

6. **Responsive Design**: All components are mobile-friendly using Quasar's responsive utilities.

7. **Theme Support**: Dark/light mode toggle with persistent user preference.

8. **State Persistence**: Critical state (like auth) persists across page refreshes.

## Next Steps

1. Set up the Quasar project structure as outlined
2. Implement the authentication flow first
3. Build the core research components
4. Add WebSocket integration for real-time updates
5. Implement report viewing and export functionality
6. Add comprehensive error handling
7. Test across different screen sizes
8. Add PWA capabilities for offline support