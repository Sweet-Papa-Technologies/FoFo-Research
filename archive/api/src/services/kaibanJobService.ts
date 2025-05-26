import { ResearchOrchestrator } from '../kaiban/teams/ResearchOrchestrator';
import { ResearchJob, JobStatus } from '../models/job';
import { ReportFormat, ExportOptions } from '../models/report';
import { logger } from '../utils/logger';
import { reportService } from './reportService';

/**
 * Service for processing research jobs using KaibanJS
 */
export class KaibanJobService {
  private orchestrator: ResearchOrchestrator;

  constructor() {
    // Initialize the research orchestrator with default env config
    this.orchestrator = new ResearchOrchestrator();
    
    logger.info('KaibanJobService initialized successfully');
  }

  /**
   * Process a research job using KaibanJS
   */
  public async processJob(job: ResearchJob): Promise<void> {
    try {
      logger.info(`Processing job ${job.id} with KaibanJS: ${job.topic}`);
      
      // Create a new orchestrator instance for each job with the specific model config
      const jobOrchestrator = new ResearchOrchestrator({
        provider: job.models.primary.provider,
        model: job.models.primary.model,
        apiKey: process.env.LLM_API_KEY // Use environment variable for API key
      });
      
      // Convert the job configuration to KaibanJS inputs
      const kaibanInputs = {
        topic: job.topic,
        maxSources: job.config.maxParallelSearches,
        maxDepth: job.config.maxIterations,
        reportFormat: 'detailed' as 'detailed',
        domainFilters: job.search.domainFilters,
        modelConfig: {
          provider: job.models.primary.provider,
          model: job.models.primary.model,
          temperature: job.models.primary.temperature
        }
      };
      
      logger.info(`Using model: ${job.models.primary.model} with provider: ${job.models.primary.provider}`);
      
      // Execute the research workflow with the job-specific orchestrator
      const result = await jobOrchestrator.executeResearch(kaibanInputs);
      
      if (result.status === 'SUCCESS') {
        logger.info(`Job ${job.id} completed successfully with KaibanJS`);
        
        // Save the report
        const reportId = await this.saveReport(job.id, job.topic, result.report);
        
        // Update job with report ID
        job.reportId = reportId;
        
        return;
      } else if (result.status === 'PARTIAL') {
        logger.warn(`Job ${job.id} completed partially with KaibanJS: ${result.status}`);
        
        // Save partial results if available
        if (result.researchResults) {
          const reportId = await this.saveReport(job.id, job.topic, result.researchResults, true);
          job.reportId = reportId;
        }
        
        throw new Error(`Job completed with partial results: ${result.status}`);
      } else {
        logger.error(`Job ${job.id} failed with KaibanJS: ${result.status}`);
        throw new Error(`Job failed with status: ${result.status}`);
      }
    } catch (error) {
      logger.error(`Error processing job ${job.id} with KaibanJS: ${error}`);
      throw error;
    }
  }

  /**
   * Save a report to the file system
   */
  private async saveReport(
    jobId: string, 
    topic: string, 
    report: any, 
    isPartial: boolean = false
  ): Promise<string> {
    try {
      // Use the report service to save the report
      const savedReport = await reportService.saveReport(jobId, topic, report);
      
      logger.info(`Saved report ${savedReport.id} for job ${jobId}`);
      
      return savedReport.id;
    } catch (error) {
      logger.error(`Failed to save report for job ${jobId}: ${error}`);
      throw error;
    }
  }

  /**
   * Get a report by ID
   */
  public getReport(reportId: string): any {
    try {
      // Use the report service to get the report
      const report = reportService.getReport(reportId);
      
      if (!report) {
        logger.error(`Report ${reportId} not found`);
        return null;
      }
      
      return report;
    } catch (error) {
      logger.error(`Failed to read report ${reportId}: ${error}`);
      return null;
    }
  }

  /**
   * Export a report in the specified format
   */
  public exportReport(reportId: string, format: ReportFormat = ReportFormat.PDF): any {
    try {
      // Create export options
      const options: ExportOptions = {
        format,
        includeSources: true,
        summarizeSources: true
      };
      
      // Use the report service to export the report
      const exportedReport = reportService.exportReport(reportId, options);
      
      if (!exportedReport) {
        throw new Error(`Failed to export report ${reportId}`);
      }
      
      return {
        reportId,
        format,
        data: reportService.getReport(reportId)
      };
    } catch (error) {
      logger.error(`Failed to export report ${reportId}: ${error}`);
      throw error;
    }
  }
}

// Create and export singleton instance
export const kaibanJobService = new KaibanJobService();