import Bull from 'bull';
import { config } from '../config';
import { logger } from './logger';

export interface ResearchJobData {
  sessionId: string;
  topic: string;
  parameters: {
    maxSources: number;
    minSources: number;
    reportLength: 'short' | 'medium' | 'long' | 'comprehensive';
    allowedDomains?: string[];
    blockedDomains?: string[];
    depth: 'surface' | 'standard' | 'comprehensive';
    language?: string;
    dateRange?: string;
  };
  userId: string;
}

export let researchQueue: Bull.Queue<ResearchJobData>;
export let searchQueue: Bull.Queue;

export async function initializeQueues(): Promise<void> {
  // Parse Redis URL if available, otherwise use individual settings
  let redisConfig: any;
  
  if (config.redis.url) {
    // If REDIS_URL is provided, use it directly
    logger.info(`Initializing queues with Redis URL: ${config.redis.url.replace(/:[^:@]+@/, ':****@')}`);
    redisConfig = config.redis.url;
  } else {
    redisConfig = {
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
    };
    logger.info(`Initializing queues with Redis config: host=${redisConfig.host}, port=${redisConfig.port}`);
  }

  researchQueue = new Bull('research', {
    redis: redisConfig,
    defaultJobOptions: {
      removeOnComplete: false,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  });

  searchQueue = new Bull('search', {
    redis: redisConfig,
    defaultJobOptions: {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 2,
    },
  });

  researchQueue.on('completed', (job) => {
    logger.info(`Research job ${job.id} completed for session ${job.data.sessionId}`);
  });

  researchQueue.on('failed', (job, err) => {
    logger.error(`Research job ${job.id} failed:`, err);
  });

  searchQueue.on('completed', (job) => {
    logger.info(`Search job ${job.id} completed`);
  });

  searchQueue.on('failed', (job, err) => {
    logger.error(`Search job ${job.id} failed:`, err);
  });

  logger.info('Job queues initialized');
}

export async function closeQueues(): Promise<void> {
  if (researchQueue) {
    await researchQueue.close();
  }
  if (searchQueue) {
    await searchQueue.close();
  }
  logger.info('Job queues closed');
}