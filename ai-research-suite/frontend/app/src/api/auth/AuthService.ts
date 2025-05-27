import { api } from '../client';
import { TokenManager } from './TokenManager';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends LoginCredentials {
  name?: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

export interface User {
  id: string;
  email: string;
  role: string;
  name?: string;
  createdAt?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

export class AuthService {
  static async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', credentials);
    
    TokenManager.setTokens(
      response.data.data.token,
      response.data.data.refreshToken,
      response.data.data.expiresIn
    );
    
    return response.data.data;
  }
  
  static async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
    
    TokenManager.setTokens(
      response.data.data.token,
      response.data.data.refreshToken,
      response.data.data.expiresIn
    );
    
    return response.data.data;
  }
  
  static async logout(): Promise<void> {
    try {
      await api.post('/auth/logout');
    } finally {
      TokenManager.clearTokens();
    }
  }
  
  static async getMe(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data.data;
  }
  
  static async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', {
      oldPassword,
      newPassword
    });
  }
  
  static async refreshToken(): Promise<string> {
    const refreshToken = TokenManager.getRefreshToken();
    if (!refreshToken) throw new Error('No refresh token available');
    
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/refresh', {
      refreshToken
    });
    
    TokenManager.setTokens(
      response.data.data.token,
      response.data.data.refreshToken,
      response.data.data.expiresIn
    );
    
    return response.data.data.token;
  }
}