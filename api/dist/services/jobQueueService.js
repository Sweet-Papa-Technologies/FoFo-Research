"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobPriority = exports.jobQueueService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const logger_1 = require("../utils/logger");
const kaibanJobService_1 = require("./kaibanJobService");
const job_1 = require("../models/job");
const events_1 = __importDefault(require("events"));
class JobQueueEvents extends events_1.default {
}
var JobPriority;
(function (JobPriority) {
    JobPriority[JobPriority["LOW"] = 0] = "LOW";
    JobPriority[JobPriority["NORMAL"] = 1] = "NORMAL";
    JobPriority[JobPriority["HIGH"] = 2] = "HIGH";
})(JobPriority || (exports.JobPriority = JobPriority = {}));
/**
 * Service for managing the job queue
 */
class JobQueueService {
    constructor() {
        this.jobsDir = path_1.default.join(process.cwd(), 'data', 'jobs');
        this.queue = [];
        this.runningJobs = new Map();
        this.completedJobs = new Map();
        this.jobEmitter = new JobQueueEvents();
        this.maxConcurrentJobs = 5; // Default, will be updated from config
        this.processingEnabled = true;
        this.jobStorage = new Map();
        // Create jobs directory if it doesn't exist
        fs_1.default.mkdirSync(this.jobsDir, { recursive: true });
        // Load existing jobs from storage
        this.loadJobs();
    }
    /**
     * Load jobs from file storage
     */
    loadJobs() {
        try {
            const files = fs_1.default.readdirSync(this.jobsDir).filter(file => file.endsWith('.json'));
            files.forEach(file => {
                try {
                    const jobPath = path_1.default.join(this.jobsDir, file);
                    const jobData = JSON.parse(fs_1.default.readFileSync(jobPath, 'utf8'));
                    this.jobStorage.set(jobData.id, jobData);
                    // Add jobs to the appropriate collections based on status
                    if (jobData.status === job_1.JobStatus.PENDING) {
                        this.queue.push({
                            job: jobData,
                            priority: JobPriority.NORMAL,
                            added: new Date(jobData.createdAt)
                        });
                    }
                    else if (jobData.status === job_1.JobStatus.RUNNING || jobData.status === job_1.JobStatus.PAUSED) {
                        this.runningJobs.set(jobData.id, jobData);
                    }
                    else if (jobData.status === job_1.JobStatus.COMPLETED || jobData.status === job_1.JobStatus.FAILED) {
                        this.completedJobs.set(jobData.id, jobData);
                    }
                }
                catch (error) {
                    logger_1.logger.error(`Failed to load job file ${file}: ${error}`);
                }
            });
            logger_1.logger.info(`Loaded ${this.jobStorage.size} jobs from storage`);
        }
        catch (error) {
            logger_1.logger.error(`Failed to load jobs from storage: ${error}`);
        }
    }
    /**
     * Save a job to storage
     */
    saveJob(job) {
        try {
            const jobPath = path_1.default.join(this.jobsDir, `${job.id}.json`);
            fs_1.default.writeFileSync(jobPath, JSON.stringify(job, null, 2));
            // Update in-memory storage
            this.jobStorage.set(job.id, job);
        }
        catch (error) {
            logger_1.logger.error(`Failed to save job ${job.id}: ${error}`);
        }
    }
    /**
     * Set the maximum number of concurrent jobs
     */
    setMaxConcurrentJobs(max) {
        this.maxConcurrentJobs = max;
        logger_1.logger.info(`Max concurrent jobs set to ${max}`);
    }
    /**
     * Start processing jobs in the queue
     */
    startProcessing() {
        this.processingEnabled = true;
        this.processNextJob();
        logger_1.logger.info('Job queue processing started');
    }
    /**
     * Stop processing jobs in the queue
     */
    stopProcessing() {
        this.processingEnabled = false;
        logger_1.logger.info('Job queue processing stopped');
    }
    /**
     * Add a job to the queue
     */
    async addJob(jobRequest) {
        const jobId = (0, uuid_1.v4)();
        const now = new Date();
        // Create new job with default values
        const newJob = {
            id: jobId,
            topic: jobRequest.topic,
            status: job_1.JobStatus.PENDING,
            config: {
                ...job_1.DEFAULT_JOB_CONFIG,
                ...jobRequest.config
            },
            search: {
                ...job_1.DEFAULT_SEARCH_SETTINGS,
                ...jobRequest.search
            },
            models: {
                primary: {
                    ...job_1.DEFAULT_MODEL_SETTINGS,
                    ...(jobRequest.models?.primary || {})
                },
                fallback: jobRequest.models?.fallback ? {
                    ...job_1.DEFAULT_MODEL_SETTINGS,
                    ...jobRequest.models.fallback
                } : undefined,
                vision: jobRequest.models?.vision ? {
                    ...job_1.DEFAULT_MODEL_SETTINGS,
                    ...jobRequest.models.vision
                } : undefined
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
        logger_1.logger.info(`Added job ${jobId} to queue with topic: ${jobRequest.topic}`);
        // Try to process next job
        this.processNextJob();
        return newJob;
    }
    /**
     * Sort the queue by priority and time added
     */
    sortQueue() {
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
    async processNextJob() {
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
        job.status = job_1.JobStatus.RUNNING;
        job.updatedAt = new Date();
        this.saveJob(job);
        // Add to running jobs
        this.runningJobs.set(job.id, job);
        // Emit event
        this.jobEmitter.emit('jobStarted', job);
        try {
            logger_1.logger.info(`Starting job ${job.id}: ${job.topic}`);
            // Process job in the background
            this.processJob(job).catch(error => {
                logger_1.logger.error(`Job ${job.id} failed: ${error}`);
                // Update job status
                job.status = job_1.JobStatus.FAILED;
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
        }
        catch (error) {
            logger_1.logger.error(`Failed to start job ${job.id}: ${error}`);
            // Update job status
            job.status = job_1.JobStatus.FAILED;
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
    async processJob(job) {
        try {
            // Check if job is still running (might have been paused or cancelled)
            if (job.status !== job_1.JobStatus.RUNNING) {
                logger_1.logger.info(`Job ${job.id} is no longer running (status: ${job.status})`);
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
            logger_1.logger.info(`Processing job ${job.id} using KaibanJS orchestrator`);
            // Process the job
            await kaibanJobService_1.kaibanJobService.processJob(job);
            // Job completed successfully
            job.status = job_1.JobStatus.COMPLETED;
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
            logger_1.logger.info(`Job ${job.id} completed successfully`);
            // Try to process next job
            this.processNextJob();
        }
        catch (error) {
            logger_1.logger.error(`Job ${job.id} failed: ${error}`);
            // Update job status
            job.status = job_1.JobStatus.FAILED;
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
    pauseJob(jobId) {
        const job = this.runningJobs.get(jobId);
        if (!job) {
            logger_1.logger.warn(`Cannot pause job ${jobId}: job not found or not running`);
            return false;
        }
        if (job.status !== job_1.JobStatus.RUNNING) {
            logger_1.logger.warn(`Cannot pause job ${jobId}: job status is ${job.status}`);
            return false;
        }
        // Update job status
        job.status = job_1.JobStatus.PAUSED;
        job.updatedAt = new Date();
        this.saveJob(job);
        // Emit event
        this.jobEmitter.emit('jobPaused', job);
        logger_1.logger.info(`Job ${jobId} paused`);
        return true;
    }
    /**
     * Resume a paused job
     */
    resumeJob(jobId) {
        const job = this.runningJobs.get(jobId);
        if (!job) {
            logger_1.logger.warn(`Cannot resume job ${jobId}: job not found`);
            return false;
        }
        if (job.status !== job_1.JobStatus.PAUSED) {
            logger_1.logger.warn(`Cannot resume job ${jobId}: job status is ${job.status}`);
            return false;
        }
        // Update job status
        job.status = job_1.JobStatus.RUNNING;
        job.updatedAt = new Date();
        this.saveJob(job);
        // Emit event
        this.jobEmitter.emit('jobResumed', job);
        logger_1.logger.info(`Job ${jobId} resumed`);
        // Continue processing the job
        this.processJob(job).catch(error => {
            logger_1.logger.error(`Resumed job ${job.id} failed: ${error}`);
        });
        return true;
    }
    /**
     * Cancel a job
     */
    cancelJob(jobId) {
        // Check if job is in the queue
        const queueIndex = this.queue.findIndex(item => item.job.id === jobId);
        if (queueIndex !== -1) {
            // Remove from queue
            const [removedJob] = this.queue.splice(queueIndex, 1);
            // Update job status
            removedJob.job.status = job_1.JobStatus.FAILED;
            removedJob.job.updatedAt = new Date();
            this.saveJob(removedJob.job);
            // Add to completed jobs
            this.completedJobs.set(removedJob.job.id, removedJob.job);
            // Emit event
            this.jobEmitter.emit('jobCancelled', removedJob.job);
            logger_1.logger.info(`Job ${jobId} cancelled from queue`);
            return true;
        }
        // Check if job is running
        const runningJob = this.runningJobs.get(jobId);
        if (runningJob) {
            // Update job status
            runningJob.status = job_1.JobStatus.FAILED;
            runningJob.updatedAt = new Date();
            this.saveJob(runningJob);
            // Remove from running jobs
            this.runningJobs.delete(jobId);
            // Add to completed jobs
            this.completedJobs.set(runningJob.id, runningJob);
            // Emit event
            this.jobEmitter.emit('jobCancelled', runningJob);
            logger_1.logger.info(`Running job ${jobId} cancelled`);
            // Try to process next job
            this.processNextJob();
            return true;
        }
        logger_1.logger.warn(`Cannot cancel job ${jobId}: job not found in queue or running jobs`);
        return false;
    }
    /**
     * Get a job by ID
     */
    getJob(jobId) {
        return this.jobStorage.get(jobId);
    }
    /**
     * Get all jobs
     */
    getAllJobs() {
        return Array.from(this.jobStorage.values());
    }
    /**
     * Get pending jobs
     */
    getPendingJobs() {
        return this.queue.map(item => item.job);
    }
    /**
     * Get running jobs
     */
    getRunningJobs() {
        return Array.from(this.runningJobs.values());
    }
    /**
     * Get completed jobs
     */
    getCompletedJobs() {
        return Array.from(this.completedJobs.values());
    }
    /**
     * Subscribe to job events
     */
    on(event, listener) {
        this.jobEmitter.on(event, listener);
    }
    /**
     * Get the number of jobs in the queue
     */
    getQueueLength() {
        return this.queue.length;
    }
    /**
     * Get the number of running jobs
     */
    getRunningJobCount() {
        return this.runningJobs.size;
    }
}
// Create and export singleton instance
exports.jobQueueService = new JobQueueService();
