import { api } from './client';
import type { Report, Citation } from '../types/research';

export interface ExportOptions {
  format: 'pdf' | 'docx' | 'markdown';
  includeMetadata?: boolean;
  includeSources?: boolean;
  includeCitations?: boolean;
}

export class ReportService {
  static async getReportBySessionId(sessionId: string): Promise<Report> {
    const response = await api.get<{ success: boolean; data: Report }>(`/reports/session/${sessionId}`);
    return response.data.data;
  }
  
  static async getReport(reportId: string): Promise<Report> {
    const response = await api.get<{ success: boolean; data: Report }>(`/reports/${reportId}`);
    return response.data.data;
  }
  
  static async getReportSources(reportId: string): Promise<Report['sources']> {
    const response = await api.get<{ success: boolean; data: Report['sources'] }>(`/reports/${reportId}/sources`);
    return response.data.data;
  }
  
  static async getReportCitations(reportId: string): Promise<Citation[]> {
    const response = await api.get<{ success: boolean; data: Citation[] }>(`/reports/${reportId}/citations`);
    return response.data.data;
  }
  
  static async downloadReport(reportId: string, format: 'pdf' | 'docx' | 'markdown' = 'pdf'): Promise<Blob> {
    const response = await api.get(`/reports/${reportId}/download`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  }
  
  static async exportReport(reportId: string, options: ExportOptions): Promise<Blob> {
    const response = await api.post(`/reports/${reportId}/export`, options, {
      responseType: 'blob'
    });
    return response.data;
  }
  
  static downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
  
  static getFileExtension(format: string): string {
    const extensions: Record<string, string> = {
      pdf: 'pdf',
      docx: 'docx',
      markdown: 'md',
      md: 'md'
    };
    return extensions[format] || 'txt';
  }
}