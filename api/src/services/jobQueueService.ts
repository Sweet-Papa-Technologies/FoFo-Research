import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errorHandler';
import { captureService, CaptureBatchResult } from './captureService';
import { searchService } from './searchService';
import { kaibanJobService } from './kaibanJobService';
import { JobStatus, ResearchJob, DEFAULT_JOB_CONFIG, DEFAULT_SEARCH_SETTINGS, DEFAULT_MODEL_SETTINGS } from '../models/job';
import EventEmitter from 'events';

class JobQueueEvents extends EventEmitter {}

enum JobPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2
}

interface QueuedJob {
  job: ResearchJob;
  priority: JobPriority;
  added: Date;
}

/**
 * Service for managing the job queue
 */
class JobQueueService {
  private jobsDir: string;
  private queue: QueuedJob[];
  private runningJobs: Map<string, ResearchJob>;
  private completedJobs: Map<string, ResearchJob>;
  private jobEmitter: JobQueueEvents;
  private maxConcurrentJobs: number;
  private processingEnabled: boolean;
  private jobStorage: Map<string, ResearchJob>;

  constructor() {
    this.jobsDir = path.join(process.cwd(), 'data', 'jobs');
    this.queue = [];
    this.runningJobs = new Map();
    this.completedJobs = new Map();
    this.jobEmitter = new JobQueueEvents();
    this.maxConcurrentJobs = 5; // Default, will be updated from config
    this.processingEnabled = true;
    this.jobStorage = new Map();

    // Create jobs directory if it doesn't exist
    fs.mkdirSync(this.jobsDir, { recursive: true });
    
    // Load existing jobs from storage
    this.loadJobs();
  }

  /**
   * Load jobs from file storage
   */
  private loadJobs(): void {
    try {
      const files = fs.readdirSync(this.jobsDir).filter(file => file.endsWith('.json'));
      
      files.forEach(file => {
        try {
          const jobPath = path.join(this.jobsDir, file);
          const jobData = JSON.parse(fs.readFileSync(jobPath, 'utf8')) as ResearchJob;
          
          this.jobStorage.set(jobData.id, jobData);
          
          // Add jobs to the appropriate collections based on status
          if (jobData.status === JobStatus.PENDING) {
            this.queue.push({
              job: jobData,
              priority: JobPriority.NORMAL,
              added: new Date(jobData.createdAt)
            });
          } else if (jobData.status === JobStatus.RUNNING || jobData.status === JobStatus.PAUSED) {
            this.runningJobs.set(jobData.id, jobData);
          } else if (jobData.status === JobStatus.COMPLETED || jobData.status === JobStatus.FAILED) {
            this.completedJobs.set(jobData.id, jobData);
          }
        } catch (error) {
          logger.error(`Failed to load job file ${file}: ${error}`);
        }
      });
      
      logger.info(`Loaded ${this.jobStorage.size} jobs from storage`);
    } catch (error) {
      logger.error(`Failed to load jobs from storage: ${error}`);
    }
  }

  /**
   * Save a job to storage
   */
  private saveJob(job: ResearchJob): void {
    try {
      const jobPath = path.join(this.jobsDir, `${job.id}.json`);
      fs.writeFileSync(jobPath, JSON.stringify(job, null, 2));
      
      // Update in-memory storage
      this.jobStorage.set(job.id, job);
    } catch (error) {
      logger.error(`Failed to save job ${job.id}: ${error}`);
    }
  }

  /**
   * Set the maximum number of concurrent jobs
   */
  public setMaxConcurrentJobs(max: number): void {
    this.maxConcurrentJobs = max;
    logger.info(`Max concurrent jobs set to ${max}`);
  }

  /**
   * Start processing jobs in the queue
   */
  public startProcessing(): void {
    this.processingEnabled = true;
    this.processNextJob();
    logger.info('Job queue processing started');
  }

  /**
   * Stop processing jobs in the queue
   */
  public stopProcessing(): void {
    this.processingEnabled = false;
    logger.info('Job queue processing stopped');
  }

  /**
   * Add a job to the queue
   */
  public async addJob(jobRequest: {
    topic: string;
    config?: Partial<ResearchJob['config']>;
    search?: Partial<ResearchJob['search']>;
    models?: Partial<ResearchJob['models']>;
    priority?: JobPriority;
  }): Promise<ResearchJob> {
    const jobId = uuidv4();
    const now = new Date();
    
    // Create new job with default values
    const newJob: ResearchJob = {
      id: jobId,
      topic: jobRequest.topic,
      status: JobStatus.PENDING,
      config: {
        ...DEFAULT_JOB_CONFIG,
        ...jobRequest.config
      },
      search: {
        ...DEFAULT_SEARCH_SETTINGS,
        ...jobRequest.search
      },
      models: {
        primary: {
          ...DEFAULT_MODEL_SETTINGS,
          ...jobRequest.models?.primary
        },
        fallback: jobRequest.models?.fallback,
        vision: jobRequest.models?.vision
      },
      progress: {
        currentIteration: 0,
        processedUrls: 0,
        totalUrls: 0
      },
      createdAt: now,
      updatedAt: now
    };
    
    // Save job
    this.saveJob(newJob);
    
    // Add to queue
    this.queue.push({
      job: newJob,
      priority: jobRequest.priority || JobPriority.NORMAL,
      added: now
    });
    
    // Sort queue by priority (highest first) and then by time added (oldest first)
    this.sortQueue();
    
    logger.info(`Added job ${jobId} to queue with topic: ${jobRequest.topic}`);
    
    // Try to process next job
    this.processNextJob();
    
    return newJob;
  }

  /**
   * Sort the queue by priority and time added
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // Sort by priority (highest first)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      
      // Then by time added (oldest first)
      return a.added.getTime() - b.added.getTime();
    });
  }

  /**
   * Process the next job in the queue
   */
  private async processNextJob(): Promise<void> {
    // Check if processing is enabled
    if (!this.processingEnabled) {
      return;
    }
    
    // Check if we can run more jobs
    if (this.runningJobs.size >= this.maxConcurrentJobs) {
      return;
    }
    
    // Check if there are jobs in the queue
    if (this.queue.length === 0) {
      return;
    }
    
    // Get the next job
    const queuedJob = this.queue.shift();
    if (!queuedJob) {
      return;
    }
    
    const job = queuedJob.job;
    
    // Update job status
    job.status = JobStatus.RUNNING;
    job.updatedAt = new Date();
    this.saveJob(job);
    
    // Add to running jobs
    this.runningJobs.set(job.id, job);
    
    // Emit event
    this.jobEmitter.emit('jobStarted', job);
    
    try {
      logger.info(`Starting job ${job.id}: ${job.topic}`);
      
      // Process job in the background
      this.processJob(job).catch(error => {
        logger.error(`Job ${job.id} failed: ${error}`);
        
        // Update job status
        job.status = JobStatus.FAILED;
        job.updatedAt = new Date();
        this.saveJob(job);
        
        // Remove from running jobs
        this.runningJobs.delete(job.id);
        
        // Add to completed jobs
        this.completedJobs.set(job.id, job);
        
        // Emit event
        this.jobEmitter.emit('jobFailed', job, error);
      });
      
      // Try to process next job
      this.processNextJob();
      
    } catch (error) {
      logger.error(`Failed to start job ${job.id}: ${error}`);
      
      // Update job status
      job.status = JobStatus.FAILED;
      job.updatedAt = new Date();
      this.saveJob(job);
      
      // Remove from running jobs
      this.runningJobs.delete(job.id);
      
      // Add to completed jobs
      this.completedJobs.set(job.id, job);
      
      // Emit event
      this.jobEmitter.emit('jobFailed', job, error);
      
      // Try to process next job
      this.processNextJob();
    }
  }

  /**
   * Process a job (this runs asynchronously)
   */
  private async processJob(job: ResearchJob): Promise<void> {
    try {
      // Check if job is still running (might have been paused or cancelled)
      if (job.status !== JobStatus.RUNNING) {
        logger.info(`Job ${job.id} is no longer running (status: ${job.status})`);
        return;
      }
      
      // Set initial progress
      job.progress = {
        currentIteration: 0,
        processedUrls: 0,
        totalUrls: 0
      };
      
      job.updatedAt = new Date();
      this.saveJob(job);
      
      // Use KaibanJS to process the job
      logger.info(`Processing job ${job.id} using KaibanJS orchestrator`);
      
      // Process the job
      await kaibanJobService.processJob(job);
      
      // Job completed successfully
      job.status = JobStatus.COMPLETED;
      job.updatedAt = new Date();
      job.completedAt = new Date();
      
      // Set final progress
      job.progress.currentIteration = job.config.maxIterations;
      job.progress.processedUrls = job.progress.totalUrls; // All URLs processed
      
      this.saveJob(job);
      
      // Remove from running jobs
      this.runningJobs.delete(job.id);
      
      // Add to completed jobs
      this.completedJobs.set(job.id, job);
      
      // Emit event
      this.jobEmitter.emit('jobCompleted', job);
      
      logger.info(`Job ${job.id} completed successfully`);
      
      // Try to process next job
      this.processNextJob();
      
    } catch (error) {
      logger.error(`Job ${job.id} failed: ${error}`);
      
      // Update job status
      job.status = JobStatus.FAILED;
      job.updatedAt = new Date();
      this.saveJob(job);
      
      // Remove from running jobs
      this.runningJobs.delete(job.id);
      
      // Add to completed jobs
      this.completedJobs.set(job.id, job);
      
      // Emit event
      this.jobEmitter.emit('jobFailed', job, error);
      
      // Try to process next job
      this.processNextJob();
      
      throw error;
    }
  }

  /**
   * Pause a running job
   */
  public pauseJob(jobId: string): boolean {
    const job = this.runningJobs.get(jobId);
    
    if (!job) {
      logger.warn(`Cannot pause job ${jobId}: job not found or not running`);
      return false;
    }
    
    if (job.status !== JobStatus.RUNNING) {
      logger.warn(`Cannot pause job ${jobId}: job status is ${job.status}`);
      return false;
    }
    
    // Update job status
    job.status = JobStatus.PAUSED;
    job.updatedAt = new Date();
    this.saveJob(job);
    
    // Emit event
    this.jobEmitter.emit('jobPaused', job);
    
    logger.info(`Job ${jobId} paused`);
    
    return true;
  }

  /**
   * Resume a paused job
   */
  public resumeJob(jobId: string): boolean {
    const job = this.runningJobs.get(jobId);
    
    if (!job) {
      logger.warn(`Cannot resume job ${jobId}: job not found`);
      return false;
    }
    
    if (job.status !== JobStatus.PAUSED) {
      logger.warn(`Cannot resume job ${jobId}: job status is ${job.status}`);
      return false;
    }
    
    // Update job status
    job.status = JobStatus.RUNNING;
    job.updatedAt = new Date();
    this.saveJob(job);
    
    // Emit event
    this.jobEmitter.emit('jobResumed', job);
    
    logger.info(`Job ${jobId} resumed`);
    
    // Continue processing the job
    this.processJob(job).catch(error => {
      logger.error(`Resumed job ${job.id} failed: ${error}`);
    });
    
    return true;
  }

  /**
   * Cancel a job
   */
  public cancelJob(jobId: string): boolean {
    // Check if job is in the queue
    const queueIndex = this.queue.findIndex(item => item.job.id === jobId);
    
    if (queueIndex !== -1) {
      // Remove from queue
      const [removedJob] = this.queue.splice(queueIndex, 1);
      
      // Update job status
      removedJob.job.status = JobStatus.FAILED;
      removedJob.job.updatedAt = new Date();
      this.saveJob(removedJob.job);
      
      // Add to completed jobs
      this.completedJobs.set(removedJob.job.id, removedJob.job);
      
      // Emit event
      this.jobEmitter.emit('jobCancelled', removedJob.job);
      
      logger.info(`Job ${jobId} cancelled from queue`);
      
      return true;
    }
    
    // Check if job is running
    const runningJob = this.runningJobs.get(jobId);
    
    if (runningJob) {
      // Update job status
      runningJob.status = JobStatus.FAILED;
      runningJob.updatedAt = new Date();
      this.saveJob(runningJob);
      
      // Remove from running jobs
      this.runningJobs.delete(jobId);
      
      // Add to completed jobs
      this.completedJobs.set(runningJob.id, runningJob);
      
      // Emit event
      this.jobEmitter.emit('jobCancelled', runningJob);
      
      logger.info(`Running job ${jobId} cancelled`);
      
      // Try to process next job
      this.processNextJob();
      
      return true;
    }
    
    logger.warn(`Cannot cancel job ${jobId}: job not found in queue or running jobs`);
    return false;
  }

  /**
   * Get a job by ID
   */
  public getJob(jobId: string): ResearchJob | undefined {
    return this.jobStorage.get(jobId);
  }

  /**
   * Get all jobs
   */
  public getAllJobs(): ResearchJob[] {
    return Array.from(this.jobStorage.values());
  }

  /**
   * Get pending jobs
   */
  public getPendingJobs(): ResearchJob[] {
    return this.queue.map(item => item.job);
  }

  /**
   * Get running jobs
   */
  public getRunningJobs(): ResearchJob[] {
    return Array.from(this.runningJobs.values());
  }

  /**
   * Get completed jobs
   */
  public getCompletedJobs(): ResearchJob[] {
    return Array.from(this.completedJobs.values());
  }

  /**
   * Subscribe to job events
   */
  public on(event: string, listener: (...args: any[]) => void): void {
    this.jobEmitter.on(event, listener);
  }

  /**
   * Get the number of jobs in the queue
   */
  public getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * Get the number of running jobs
   */
  public getRunningJobCount(): number {
    return this.runningJobs.size;
  }
}

// Create and export singleton instance
export const jobQueueService = new JobQueueService();
export { JobPriority };