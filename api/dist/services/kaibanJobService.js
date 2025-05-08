"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kaibanJobService = exports.KaibanJobService = void 0;
const ResearchOrchestrator_1 = require("../kaiban/teams/ResearchOrchestrator");
const report_1 = require("../models/report");
const logger_1 = require("../utils/logger");
const reportService_1 = require("./reportService");
/**
 * Service for processing research jobs using KaibanJS
 */
class KaibanJobService {
    constructor() {
        // Initialize the research orchestrator
        this.orchestrator = new ResearchOrchestrator_1.ResearchOrchestrator();
        logger_1.logger.info('KaibanJobService initialized successfully');
    }
    /**
     * Process a research job using KaibanJS
     */
    async processJob(job) {
        try {
            logger_1.logger.info(`Processing job ${job.id} with KaibanJS: ${job.topic}`);
            // Convert the job configuration to KaibanJS inputs
            const kaibanInputs = {
                topic: job.topic,
                maxSources: job.config.maxParallelSearches,
                maxDepth: job.config.maxIterations,
                reportFormat: 'detailed',
                domainFilters: job.search.domainFilters,
                modelConfig: {
                    provider: job.models.primary.provider,
                    model: job.models.primary.model,
                    temperature: job.models.primary.temperature
                }
            };
            // Execute the research workflow
            const result = await this.orchestrator.executeResearch(kaibanInputs);
            if (result.status === 'SUCCESS') {
                logger_1.logger.info(`Job ${job.id} completed successfully with KaibanJS`);
                // Save the report
                const reportId = await this.saveReport(job.id, job.topic, result.report);
                // Update job with report ID
                job.reportId = reportId;
                return;
            }
            else if (result.status === 'PARTIAL') {
                logger_1.logger.warn(`Job ${job.id} completed partially with KaibanJS: ${result.status}`);
                // Save partial results if available
                if (result.researchResults) {
                    const reportId = await this.saveReport(job.id, job.topic, result.researchResults, true);
                    job.reportId = reportId;
                }
                throw new Error(`Job completed with partial results: ${result.status}`);
            }
            else {
                logger_1.logger.error(`Job ${job.id} failed with KaibanJS: ${result.status}`);
                throw new Error(`Job failed with status: ${result.status}`);
            }
        }
        catch (error) {
            logger_1.logger.error(`Error processing job ${job.id} with KaibanJS: ${error}`);
            throw error;
        }
    }
    /**
     * Save a report to the file system
     */
    async saveReport(jobId, topic, report, isPartial = false) {
        try {
            // Use the report service to save the report
            const savedReport = await reportService_1.reportService.saveReport(jobId, topic, report);
            logger_1.logger.info(`Saved report ${savedReport.id} for job ${jobId}`);
            return savedReport.id;
        }
        catch (error) {
            logger_1.logger.error(`Failed to save report for job ${jobId}: ${error}`);
            throw error;
        }
    }
    /**
     * Get a report by ID
     */
    getReport(reportId) {
        try {
            // Use the report service to get the report
            const report = reportService_1.reportService.getReport(reportId);
            if (!report) {
                logger_1.logger.error(`Report ${reportId} not found`);
                return null;
            }
            return report;
        }
        catch (error) {
            logger_1.logger.error(`Failed to read report ${reportId}: ${error}`);
            return null;
        }
    }
    /**
     * Export a report in the specified format
     */
    exportReport(reportId, format = report_1.ReportFormat.PDF) {
        try {
            // Create export options
            const options = {
                format,
                includeSources: true,
                summarizeSources: true
            };
            // Use the report service to export the report
            const exportedReport = reportService_1.reportService.exportReport(reportId, options);
            if (!exportedReport) {
                throw new Error(`Failed to export report ${reportId}`);
            }
            return {
                reportId,
                format,
                data: reportService_1.reportService.getReport(reportId)
            };
        }
        catch (error) {
            logger_1.logger.error(`Failed to export report ${reportId}: ${error}`);
            throw error;
        }
    }
}
exports.KaibanJobService = KaibanJobService;
// Create and export singleton instance
exports.kaibanJobService = new KaibanJobService();
