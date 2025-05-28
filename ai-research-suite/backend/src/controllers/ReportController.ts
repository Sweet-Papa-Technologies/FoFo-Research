import { Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { getDb } from '../utils/database';
import { AuthRequest } from '../middleware/auth';
import { NotFoundError } from '../middleware/errorHandler';

export class ReportController {
  private get db() {
    return getDb();
  }
  
  async getReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reportId } = req.params;
      const { format = 'json' } = req.query;
      const userId = req.user?.id;
      
      logger.info(`Retrieving report ${reportId} for user ${userId}`);
      
      // Get report with session info
      const report = await this.db('reports')
        .join('research_sessions', 'reports.session_id', 'research_sessions.id')
        .where('reports.id', reportId)
        .where('research_sessions.user_id', userId)
        .select(
          'reports.*',
          'research_sessions.topic',
          'research_sessions.parameters',
          'research_sessions.created_at as session_created_at'
        )
        .first();
      
      if (!report) {
        throw new NotFoundError('Report not found');
      }
      
      // Format the report based on requested format
      const formattedReport = await this.formatReport(report, format as string);
      
      res.json({
        success: true,
        data: formattedReport
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getReportBySessionId(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const { format = 'json' } = req.query;
      const userId = req.user?.id;
      
      logger.info(`Retrieving report for session ${sessionId} for user ${userId}`);
      
      // Get report with session info
      const report = await this.db('reports')
        .join('research_sessions', 'reports.session_id', 'research_sessions.id')
        .where('reports.session_id', sessionId)
        .where('research_sessions.user_id', userId)
        .select(
          'reports.*',
          'research_sessions.topic',
          'research_sessions.parameters',
          'research_sessions.created_at as session_created_at'
        )
        .first();
      
      logger.info(`Query result for session ${sessionId}:`, report ? 'Found' : 'Not found');
      
      if (!report) {
        throw new NotFoundError('Report not found for this session');
      }
      
      // Format the report based on requested format
      const formattedReport = await this.formatReport(report, format as string);
      
      res.json({
        success: true,
        data: formattedReport
      });
    } catch (error) {
      next(error);
    }
  }
  
  async downloadReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reportId } = req.params;
      const { format = 'markdown' } = req.query;
      const userId = req.user?.id;
      
      const report = await this.db('reports')
        .join('research_sessions', 'reports.session_id', 'research_sessions.id')
        .where('reports.id', reportId)
        .where('research_sessions.user_id', userId)
        .select('reports.*', 'research_sessions.topic')
        .first();
      
      if (!report) {
        throw new NotFoundError('Report not found');
      }
      
      const content = this.generateDownloadContent(report, format as string);
      const mimeType = this.getMimeType(format as string);
      const extension = this.getFileExtension(format as string);
      
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.${extension}"`);
      res.send(content);
    } catch (error) {
      next(error);
    }
  }
  
  async getReportSources(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reportId } = req.params;
      const userId = req.user?.id;
      
      // Verify user has access to this report
      const report = await this.db('reports')
        .join('research_sessions', 'reports.session_id', 'research_sessions.id')
        .where('reports.id', reportId)
        .where('research_sessions.user_id', userId)
        .first();
      
      if (!report) {
        throw new NotFoundError('Report not found');
      }
      
      const sources = await this.db('sources')
        .where('session_id', report.session_id)
        .orderBy('relevance_score', 'desc')
        .select('id', 'url', 'title', 'summary', 'relevance_score', 'accessed_at');
      
      res.json({
        success: true,
        data: {
          sources: sources.map(source => ({
            id: source.id,
            url: source.url,
            title: source.title,
            summary: source.summary,
            relevanceScore: source.relevance_score,
            accessedAt: source.accessed_at
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getReportCitations(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reportId } = req.params;
      const userId = req.user?.id;
      
      // Verify user has access to this report
      const report = await this.db('reports')
        .join('research_sessions', 'reports.session_id', 'research_sessions.id')
        .where('reports.id', reportId)
        .where('research_sessions.user_id', userId)
        .first();
      
      if (!report) {
        throw new NotFoundError('Report not found');
      }
      
      const citations = await this.db('citations')
        .leftJoin('sources', 'citations.source_id', 'sources.id')
        .where('citations.report_id', reportId)
        .orderBy('citations.position', 'asc')
        .select(
          'citations.id',
          'citations.quote',
          'citations.context',
          'citations.position',
          'sources.url as source_url',
          'sources.title as source_title'
        );
      
      res.json({
        success: true,
        data: {
          citations: citations.map(citation => ({
            id: citation.id,
            quote: citation.quote,
            context: citation.context,
            position: citation.position,
            source: citation.source_url ? {
              url: citation.source_url,
              title: citation.source_title
            } : null
          }))
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  async exportReport(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { reportId } = req.params;
      const { format = 'pdf' } = req.query;
      const userId = req.user?.id;
      
      const report = await this.db('reports')
        .join('research_sessions', 'reports.session_id', 'research_sessions.id')
        .where('reports.id', reportId)
        .where('research_sessions.user_id', userId)
        .select('reports.*', 'research_sessions.topic')
        .first();
      
      if (!report) {
        throw new NotFoundError('Report not found');
      }
      
      // For now, return the download URL
      // In production, this would trigger an async export job
      res.json({
        success: true,
        data: {
          exportUrl: `/api/v1/reports/${reportId}/download?format=${format}`,
          format: format
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  private async formatReport(report: any, format: string): Promise<any> {
    const keyFindings = typeof report.key_findings === 'string' 
      ? JSON.parse(report.key_findings) 
      : report.key_findings;
    
    const parameters = typeof report.parameters === 'string'
      ? JSON.parse(report.parameters)
      : report.parameters;
    
    if (format === 'json') {
      // Fetch sources for this session
      const sources = await this.db('sources')
        .where('session_id', report.session_id)
        .orderBy('relevance_score', 'desc')
        .select('id', 'url', 'title', 'summary', 'relevance_score', 'accessed_at');
      
      return {
        id: report.id,
        sessionId: report.session_id,
        topic: report.topic,
        content: report.content,
        summary: report.summary,
        keyFindings,
        parameters,
        metadata: {
          wordCount: report.word_count || 0,
          generatedAt: report.created_at,
          readingTime: Math.ceil((report.word_count || 0) / 200), // Assuming 200 words per minute
          version: '1.0.0'
        },
        sources: sources.map(source => ({
          id: source.id,
          url: source.url,
          title: source.title,
          summary: source.summary,
          relevanceScore: source.relevance_score,
          accessedAt: source.accessed_at
        })),
        createdAt: report.created_at,
        sessionCreatedAt: report.session_created_at
      };
    }
    
    // For other formats, return raw content
    return report.content;
  }
  
  private generateDownloadContent(report: any, format: string): string {
    if (format === 'markdown' || format === 'md') {
      return report.content;
    }
    
    if (format === 'text' || format === 'txt') {
      // Strip markdown formatting
      return report.content
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*(.+?)\*\*/g, '$1')
        .replace(/\*(.+?)\*/g, '$1')
        .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
        .replace(/```[^`]*```/g, '')
        .trim();
    }
    
    if (format === 'html') {
      // Basic markdown to HTML conversion
      // In production, use a proper markdown parser
      let html = report.content
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/\[([^\]]+)\]\(([^\)]+)\)/g, '<a href="$2">$1</a>')
        .replace(/\n/g, '<br>');
      
      return `<!DOCTYPE html>
<html>
<head>
  <title>${report.topic}</title>
  <meta charset="utf-8">
</head>
<body>
  ${html}
</body>
</html>`;
    }
    
    return report.content;
  }
  
  private getMimeType(format: string): string {
    const mimeTypes: Record<string, string> = {
      'markdown': 'text/markdown',
      'md': 'text/markdown',
      'text': 'text/plain',
      'txt': 'text/plain',
      'html': 'text/html',
      'json': 'application/json'
    };
    
    return mimeTypes[format] || 'text/plain';
  }
  
  private getFileExtension(format: string): string {
    const extensions: Record<string, string> = {
      'markdown': 'md',
      'text': 'txt',
      'html': 'html',
      'json': 'json'
    };
    
    return extensions[format] || format;
  }
}