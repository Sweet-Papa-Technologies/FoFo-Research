import { defineStore } from 'pinia';
import { AuthService } from '../api/auth/AuthService';
import { TokenManager } from '../api/auth/TokenManager';
import type { LoginCredentials, RegisterCredentials, User } from '../api/auth/AuthService';

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
    isAdmin: (state) => state.user?.role === 'admin',
    userEmail: (state) => state.user?.email || '',
    userId: (state) => state.user?.id || ''
  },
  
  actions: {
    async register(credentials: RegisterCredentials) {
      this.isLoading = true;
      
      try {
        const response = await AuthService.register(credentials);
        this.user = response.user;
        this.isAuthenticated = true;
        return response;
      } finally {
        this.isLoading = false;
      }
    },
    
    async login(credentials: LoginCredentials) {
      this.isLoading = true;
      
      try {
        const response = await AuthService.login(credentials);
        this.user = response.user;
        this.isAuthenticated = true;
        return response;
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
      const token = TokenManager.getAccessToken();
      if (!token || TokenManager.isTokenExpired()) {
        this.isAuthenticated = false;
        this.user = null;
        return false;
      }
      
      try {
        const user = await AuthService.getMe();
        this.user = user;
        this.isAuthenticated = true;
        return true;
      } catch {
        this.isAuthenticated = false;
        this.user = null;
        return false;
      }
    },
    
    async changePassword(oldPassword: string, newPassword: string) {
      await AuthService.changePassword(oldPassword, newPassword);
    },
    
    setUser(user: User | null) {
      this.user = user;
      this.isAuthenticated = !!user;
    }
  },
  
  persist: true
});