import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errorHandler';
import { JobStatus, JobCreateRequest, ResearchJob } from '../models/job';
import { ReportFormat } from '../models/report';
import { jobQueueService, JobPriority } from '../services/jobQueueService';
import { kaibanJobService } from '../services/kaibanJobService';

/**
 * Create a new research job
 */
export const createResearchJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobRequest: JobCreateRequest = req.body;
    
    if (!jobRequest.topic) {
      throw new AppError('Research topic is required', 400);
    }
    
    // Create and add job to the queue
    const job = await jobQueueService.addJob({
      topic: jobRequest.topic,
      config: jobRequest.config,
      search: jobRequest.search,
      models: jobRequest.models,
      priority: JobPriority.NORMAL
    });
    
    logger.info(`Created research job ${job.id} for topic: ${jobRequest.topic}`);
    
    res.status(201).json({
      status: 'success',
      data: {
        jobId: job.id,
        message: 'Research job created successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all research jobs
 */
export const getAllResearchJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const jobs = jobQueueService.getAllJobs();
    
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
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific research job
 */
export const getResearchJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const job = jobQueueService.getJob(id);
    if (!job) {
      throw new AppError(`Research job not found with ID: ${id}`, 404);
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        job
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a research job (pause/resume)
 */
export const updateResearchJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { action } = req.body;
    
    const job = jobQueueService.getJob(id);
    if (!job) {
      throw new AppError(`Research job not found with ID: ${id}`, 404);
    }
    
    let success = false;
    
    switch (action) {
      case 'pause':
        success = jobQueueService.pauseJob(id);
        if (!success) {
          throw new AppError(`Cannot pause job in ${job.status} state`, 400);
        }
        break;
        
      case 'resume':
        success = jobQueueService.resumeJob(id);
        if (!success) {
          throw new AppError(`Cannot resume job in ${job.status} state`, 400);
        }
        break;
        
      case 'cancel':
        success = jobQueueService.cancelJob(id);
        if (!success) {
          throw new AppError(`Cannot cancel job in ${job.status} state`, 400);
        }
        break;
        
      default:
        throw new AppError(`Invalid action: ${action}`, 400);
    }
    
    // Get updated job
    const updatedJob = jobQueueService.getJob(id);
    
    res.status(200).json({
      status: 'success',
      data: {
        job: updatedJob
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export a research report
 */
export const exportResearchReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { format = ReportFormat.PDF } = req.body;
    
    const job = jobQueueService.getJob(id);
    if (!job) {
      throw new AppError(`Research job not found with ID: ${id}`, 404);
    }
    
    if (job.status !== JobStatus.COMPLETED) {
      throw new AppError(`Research job ${id} is not completed yet`, 400);
    }
    
    if (!job.reportId) {
      throw new AppError(`No report available for job ${id}`, 404);
    }
    
    // Use KaibanJobService to export the report
    const report = kaibanJobService.exportReport(job.reportId, format);
    
    if (!report) {
      throw new AppError(`Failed to export report for job ${id}`, 500);
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        message: `Report exported in ${format} format`,
        downloadUrl: `/api/reports/${job.reportId}/download?format=${format}`,
        report: report.data
      }
    });
  } catch (error) {
    next(error);
  }
};