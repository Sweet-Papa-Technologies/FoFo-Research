import { researchQueue } from '../utils/queues';
import { ResearchService } from '../services/ResearchService';
import { logger } from '../utils/logger';

export async function startResearchWorker(): Promise<void> {
  const researchService = new ResearchService();
  
  researchQueue.process('research', async (job) => {
    logger.info(`Processing research job ${job.id}`);
    
    try {
      await researchService.processResearchJob(job);
      logger.info(`Research job ${job.id} completed successfully`);
    } catch (error) {
      logger.error(`Research job ${job.id} failed:`, error);
      throw error;
    }
  });
  
  researchQueue.on('completed', (job) => {
    logger.info(`Job ${job.id} completed`);
  });
  
  researchQueue.on('failed', (job, err) => {
    logger.error(`Job ${job.id} failed:`, err);
  });
  
  researchQueue.on('stalled', (job) => {
    logger.warn(`Job ${job.id} stalled`);
  });
  
  logger.info('Research worker started');
}