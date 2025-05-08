import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errorHandler';
import { Report, ReportFormat, ExportOptions } from '../models/report';
import { ReportFormatterTool } from '../kaiban/tools/ReportFormatterTool';

/**
 * Service for generating and managing research reports
 */
export class ReportService {
  private reportsDir: string;
  private reportFormatter: ReportFormatterTool;

  constructor() {
    this.reportsDir = path.join(process.cwd(), 'data', 'reports');
    this.reportFormatter = new ReportFormatterTool();
    
    // Create reports directory if it doesn't exist
    fs.mkdirSync(this.reportsDir, { recursive: true });
    
    logger.info('ReportService initialized successfully');
  }

  /**
   * Convert KaibanJS report to our Report format
   */
  private convertKaibanReport(kaibanReport: any, jobId: string, topic: string): Report {
    try {
      // Extract sections
      const sections = kaibanReport.sections?.map((section: any) => ({
        title: section.heading,
        content: section.content,
        sources: this.extractSourceReferences(section.content)
      })) || [];

      // Extract sources
      const sources: Record<string, any> = {};
      if (kaibanReport.sources) {
        kaibanReport.sources.forEach((source: any, index: number) => {
          const sourceId = `source-${index + 1}`;
          sources[sourceId] = {
            url: source.url,
            title: source.title || source.url,
            summary: source.summary || 'No summary available',
            credibilityScore: source.credibilityScore,
            captureTimestamp: new Date()
          };
        });
      }

      // Extract key findings
      const keyFindings = kaibanReport.keyFindings || 
                          kaibanReport.key_findings || 
                          kaibanReport.findings || 
                          this.extractKeyFindings(kaibanReport);

      // Extract executive summary
      const executiveSummary = kaibanReport.executiveSummary || 
                              kaibanReport.summary || 
                              (kaibanReport.sections && kaibanReport.sections.length > 0 
                                ? kaibanReport.sections[0].content.substring(0, 500) + '...' 
                                : 'No summary available');

      // Create and return report
      return {
        id: uuidv4(),
        jobId,
        topic,
        executiveSummary: typeof executiveSummary === 'string' ? executiveSummary : JSON.stringify(executiveSummary),
        keyFindings: Array.isArray(keyFindings) ? keyFindings : [String(keyFindings)],
        sections,
        sources,
        createdAt: new Date(),
        format: ReportFormat.MARKDOWN
      };
    } catch (error) {
      logger.error(`Failed to convert KaibanJS report: ${error}`);
      throw new AppError('Failed to convert report format', 500);
    }
  }

  /**
   * Extract source references from content
   */
  private extractSourceReferences(content: string): string[] {
    try {
      const sourceRefs: string[] = [];
      const sourceRegex = /\[(\d+)\]/g;
      let match;
      
      while ((match = sourceRegex.exec(content)) !== null) {
        const sourceId = `source-${match[1]}`;
        if (!sourceRefs.includes(sourceId)) {
          sourceRefs.push(sourceId);
        }
      }
      
      return sourceRefs;
    } catch (error) {
      logger.error(`Failed to extract source references: ${error}`);
      return [];
    }
  }

  /**
   * Extract key findings from report
   */
  private extractKeyFindings(report: any): string[] {
    try {
      // Try to find key findings in different possible locations in the report
      if (report.keyPoints) return Array.isArray(report.keyPoints) ? report.keyPoints : [report.keyPoints];
      if (report.insights) return Array.isArray(report.insights) ? report.insights : [report.insights];
      
      // If there's a conclusions section, extract from there
      const conclusionsSection = report.sections?.find((s: any) => 
        s.heading.toLowerCase().includes('conclusion') || 
        s.heading.toLowerCase().includes('finding')
      );
      
      if (conclusionsSection) {
        // Try to split by bullet points or numbers
        const bulletPoints = conclusionsSection.content.split(/\n\s*[-•*]\s+/);
        if (bulletPoints.length > 1) {
          return bulletPoints.slice(1).map((point: string) => point.trim()).filter(Boolean);
        }
        
        const numberedPoints = conclusionsSection.content.split(/\n\s*\d+\.\s+/);
        if (numberedPoints.length > 1) {
          return numberedPoints.slice(1).map((point: string) => point.trim()).filter(Boolean);
        }
      }
      
      // Fallback: Take first few sentences from first section
      if (report.sections && report.sections.length > 0) {
        const firstSection = report.sections[0].content;
        const sentences = firstSection.split(/[.!?]+\s+/).filter(Boolean);
        return sentences.slice(0, 3).map((s: string) => s.trim() + '.');
      }
      
      return ['No key findings available'];
    } catch (error) {
      logger.error(`Failed to extract key findings: ${error}`);
      return ['Error extracting key findings'];
    }
  }

  /**
   * Save a report
   */
  public async saveReport(
    jobId: string, 
    topic: string, 
    kaibanReport: any
  ): Promise<Report> {
    try {
      // Convert the KaibanJS report to our Report format
      const report = this.convertKaibanReport(kaibanReport, jobId, topic);
      
      // Save to disk
      const reportPath = path.join(this.reportsDir, `${report.id}.json`);
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      
      logger.info(`Saved report ${report.id} for job ${jobId}`);
      
      return report;
    } catch (error) {
      logger.error(`Failed to save report for job ${jobId}: ${error}`);
      throw new AppError('Failed to save report', 500);
    }
  }

  /**
   * Get a report by ID
   */
  public getReport(reportId: string): Report | null {
    try {
      const reportPath = path.join(this.reportsDir, `${reportId}.json`);
      
      if (!fs.existsSync(reportPath)) {
        logger.warn(`Report ${reportId} not found`);
        return null;
      }
      
      const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as Report;
      return reportData;
    } catch (error) {
      logger.error(`Failed to get report ${reportId}: ${error}`);
      return null;
    }
  }

  /**
   * Get all reports for a job
   */
  public getReportsByJobId(jobId: string): Report[] {
    try {
      const reports: Report[] = [];
      
      const files = fs.readdirSync(this.reportsDir)
        .filter(file => file.endsWith('.json'));
      
      for (const file of files) {
        try {
          const reportPath = path.join(this.reportsDir, file);
          const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as Report;
          
          if (report.jobId === jobId) {
            reports.push(report);
          }
        } catch (error) {
          logger.error(`Failed to read report file ${file}: ${error}`);
        }
      }
      
      return reports;
    } catch (error) {
      logger.error(`Failed to get reports for job ${jobId}: ${error}`);
      return [];
    }
  }

  /**
   * Export a report in the requested format
   */
  public async exportReport(
    reportId: string, 
    options: ExportOptions
  ): Promise<{ content: string; filename: string }> {
    try {
      const report = this.getReport(reportId);
      
      if (!report) {
        throw new AppError(`Report ${reportId} not found`, 404);
      }
      
      // Convert report to format suitable for ReportFormatterTool
      const formatterInput = this.convertToFormatterInput(report, options);
      
      // Use ReportFormatterTool to format the report
      const result = await this.reportFormatter._call(formatterInput);
      
      // Generate filename
      const timestamp = new Date().toISOString().replace(/:/g, '-');
      const filename = `${report.topic.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.${this.getFileExtension(options.format)}`;
      
      return {
        content: result,
        filename
      };
    } catch (error) {
      logger.error(`Failed to export report ${reportId}: ${error}`);
      throw new AppError('Failed to export report', 500);
    }
  }

  /**
   * Convert report to input format for ReportFormatterTool
   */
  private convertToFormatterInput(report: Report, options: ExportOptions): any {
    // Convert sections
    const sections = report.sections.map(section => ({
      heading: section.title,
      content: section.content,
      subsections: [] // We don't support subsections in our model currently
    }));
    
    // Convert sources if included
    const sources = options.includeSources ? 
      Object.entries(report.sources).map(([id, source]) => ({
        url: source.url,
        title: source.title,
        author: source.title.split(' - ')[1], // Attempt to extract author
        publishDate: source.captureTimestamp.toString(),
        credibilityScore: source.credibilityScore
      })) : [];
    
    // Add executive summary as first section if not already included
    if (!sections.some(s => s.heading.toLowerCase().includes('summary'))) {
      sections.unshift({
        heading: 'Executive Summary',
        content: report.executiveSummary,
        subsections: []
      });
    }
    
    // Add key findings section if not already included
    if (!sections.some(s => s.heading.toLowerCase().includes('finding'))) {
      sections.push({
        heading: 'Key Findings',
        content: report.keyFindings.map(f => `- ${f}`).join('\n\n'),
        subsections: []
      });
    }
    
    return {
      title: report.topic,
      sections,
      sources,
      formatOptions: {
        template: this.mapFormatToTemplate(options.format),
        includeTableOfContents: true,
        includeCoverPage: true,
        includeExecutiveSummary: true,
        format: this.mapReportFormatToFormatterFormat(options.format)
      }
    };
  }

  /**
   * Map report format to template name
   */
  private mapFormatToTemplate(format: ReportFormat): string {
    switch (format) {
      case ReportFormat.PDF:
        return 'detailed';
      case ReportFormat.HTML:
        return 'web';
      case ReportFormat.MARKDOWN:
      default:
        return 'detailed';
    }
  }

  /**
   * Map report format to formatter format
   */
  private mapReportFormatToFormatterFormat(format: ReportFormat): string {
    switch (format) {
      case ReportFormat.HTML:
        return 'html';
      case ReportFormat.PDF:
        return 'markdown'; // PDF is generated from markdown
      case ReportFormat.MARKDOWN:
      default:
        return 'markdown';
    }
  }

  /**
   * Get file extension for report format
   */
  private getFileExtension(format: ReportFormat): string {
    switch (format) {
      case ReportFormat.HTML:
        return 'html';
      case ReportFormat.PDF:
        return 'pdf';
      case ReportFormat.MARKDOWN:
      default:
        return 'md';
    }
  }
}

// Create and export singleton instance
export const reportService = new ReportService();