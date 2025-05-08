"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportResearchReport = exports.updateResearchJob = exports.getResearchJob = exports.getAllResearchJobs = exports.createResearchJob = void 0;
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../utils/errorHandler");
const job_1 = require("../models/job");
const report_1 = require("../models/report");
const jobQueueService_1 = require("../services/jobQueueService");
const kaibanJobService_1 = require("../services/kaibanJobService");
/**
 * Create a new research job
 */
const createResearchJob = async (req, res, next) => {
    try {
        const jobRequest = req.body;
        if (!jobRequest.topic) {
            throw new errorHandler_1.AppError('Research topic is required', 400);
        }
        // Create and add job to the queue
        const job = await jobQueueService_1.jobQueueService.addJob({
            topic: jobRequest.topic,
            config: jobRequest.config,
            search: jobRequest.search,
            models: jobRequest.models,
            priority: jobQueueService_1.JobPriority.NORMAL
        });
        logger_1.logger.info(`Created research job ${job.id} for topic: ${jobRequest.topic}`);
        res.status(201).json({
            status: 'success',
            data: {
                jobId: job.id,
                message: 'Research job created successfully'
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createResearchJob = createResearchJob;
/**
 * Get all research jobs
 */
const getAllResearchJobs = async (req, res, next) => {
    try {
        const jobs = jobQueueService_1.jobQueueService.getAllJobs();
        // Map jobs to a more client-friendly format
        const jobsList = jobs.map(job => ({
            id: job.id,
            topic: job.topic,
            status: job.status,
            progress: job.progress,
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
            completedAt: job.completedAt
        }));
        res.status(200).json({
            status: 'success',
            data: {
                jobs: jobsList
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllResearchJobs = getAllResearchJobs;
/**
 * Get a specific research job
 */
const getResearchJob = async (req, res, next) => {
    try {
        const { id } = req.params;
        const job = jobQueueService_1.jobQueueService.getJob(id);
        if (!job) {
            throw new errorHandler_1.AppError(`Research job not found with ID: ${id}`, 404);
        }
        res.status(200).json({
            status: 'success',
            data: {
                job
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getResearchJob = getResearchJob;
/**
 * Update a research job (pause/resume)
 */
const updateResearchJob = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { action } = req.body;
        const job = jobQueueService_1.jobQueueService.getJob(id);
        if (!job) {
            throw new errorHandler_1.AppError(`Research job not found with ID: ${id}`, 404);
        }
        let success = false;
        switch (action) {
            case 'pause':
                success = jobQueueService_1.jobQueueService.pauseJob(id);
                if (!success) {
                    throw new errorHandler_1.AppError(`Cannot pause job in ${job.status} state`, 400);
                }
                break;
            case 'resume':
                success = jobQueueService_1.jobQueueService.resumeJob(id);
                if (!success) {
                    throw new errorHandler_1.AppError(`Cannot resume job in ${job.status} state`, 400);
                }
                break;
            case 'cancel':
                success = jobQueueService_1.jobQueueService.cancelJob(id);
                if (!success) {
                    throw new errorHandler_1.AppError(`Cannot cancel job in ${job.status} state`, 400);
                }
                break;
            default:
                throw new errorHandler_1.AppError(`Invalid action: ${action}`, 400);
        }
        // Get updated job
        const updatedJob = jobQueueService_1.jobQueueService.getJob(id);
        res.status(200).json({
            status: 'success',
            data: {
                job: updatedJob
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateResearchJob = updateResearchJob;
/**
 * Export a research report
 */
const exportResearchReport = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { format = report_1.ReportFormat.PDF } = req.body;
        const job = jobQueueService_1.jobQueueService.getJob(id);
        if (!job) {
            throw new errorHandler_1.AppError(`Research job not found with ID: ${id}`, 404);
        }
        if (job.status !== job_1.JobStatus.COMPLETED) {
            throw new errorHandler_1.AppError(`Research job ${id} is not completed yet`, 400);
        }
        if (!job.reportId) {
            throw new errorHandler_1.AppError(`No report available for job ${id}`, 404);
        }
        // Use KaibanJobService to export the report
        const report = kaibanJobService_1.kaibanJobService.exportReport(job.reportId, format);
        if (!report) {
            throw new errorHandler_1.AppError(`Failed to export report for job ${id}`, 500);
        }
        res.status(200).json({
            status: 'success',
            data: {
                message: `Report exported in ${format} format`,
                downloadUrl: `/api/reports/${job.reportId}/download?format=${format}`,
                report: report.data
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.exportResearchReport = exportResearchReport;
