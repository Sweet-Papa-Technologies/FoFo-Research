import { api } from './client';
import type { 
  ResearchSession, 
  ResearchListParams, 
  CreateResearchRequest,
  PaginatedResponse,
  SearchResult
} from '../types/research';

export class ResearchService {
  static async startResearch(request: CreateResearchRequest): Promise<ResearchSession> {
    const response = await api.post<{ success: boolean; data: ResearchSession }>('/research', request);
    return response.data.data;
  }
  
  static async getSession(sessionId: string): Promise<ResearchSession> {
    const response = await api.get<{ success: boolean; data: ResearchSession }>(`/research/${sessionId}`);
    return response.data.data;
  }
  
  static async getSessionHistory(params?: ResearchListParams): Promise<PaginatedResponse<ResearchSession>> {
    const response = await api.get<{ 
      success: boolean; 
      data: { 
        sessions: ResearchSession[]; 
        pagination: { 
          page: number; 
          limit: number; 
          total: number; 
          pages: number; 
        } 
      } 
    }>('/research', {
      params
    });
    
    // Backend returns { sessions: [...], pagination: {...} }
    const { sessions, pagination } = response.data.data;
    return {
      data: sessions,
      total: pagination.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: pagination.pages
    };
  }
  
  static async cancelResearch(sessionId: string): Promise<void> {
    await api.delete(`/research/${sessionId}`);
  }
  
  static async retryResearch(sessionId: string): Promise<ResearchSession> {
    const response = await api.post<{ success: boolean; data: ResearchSession }>(`/research/${sessionId}/retry`);
    return response.data.data;
  }
  
  static async getProgress(sessionId: string): Promise<ResearchSession['progress']> {
    const response = await api.get<{ success: boolean; data: ResearchSession['progress'] }>(`/research/${sessionId}/progress`);
    return response.data.data;
  }
  
  static async search(query: string): Promise<SearchResult> {
    const response = await api.post<{ success: boolean; data: SearchResult }>('/search', { query });
    return response.data.data;
  }
  
  static async getSearchHistory(): Promise<SearchResult[]> {
    const response = await api.get<{ success: boolean; data: SearchResult[] }>('/search/history');
    return response.data.data;
  }
}