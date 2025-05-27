import { v4 as uuidv4 } from 'uuid';
import { ResearchWorkflow } from '../orchestration/ResearchWorkflow';
import { researchQueue, ResearchJobData } from '../utils/queues';
import { getDb } from '../utils/database';
import { logger } from '../utils/logger';
import { AppError, NotFoundError, ConflictError } from '../middleware/errorHandler';
import { config } from '../config';

export interface ResearchSession {
  id: string;
  userId: string;
  topic: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  parameters: any;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  reportId?: string;
}

export interface StartResearchParams {
  topic: string;
  parameters: any;
  userId: string;
}

export class ResearchService {
  private get db() {
    return getDb();
  }
  
  async startResearch(params: StartResearchParams): Promise<ResearchSession> {
    const sessionId = uuidv4();
    const now = new Date();
    
    const session: ResearchSession = {
      id: sessionId,
      userId: params.userId,
      topic: params.topic,
      status: 'pending',
      parameters: params.parameters,
      createdAt: now
    };
    
    try {
      await this.db('research_sessions').insert({
        id: session.id,
        user_id: session.userId,
        topic: session.topic,
        status: session.status,
        parameters: JSON.stringify(session.parameters),
        created_at: session.createdAt
      });
      
      const jobData: ResearchJobData = {
        sessionId: session.id,
        topic: session.topic,
        parameters: session.parameters,
        userId: session.userId
      };
      
      logger.info(`Adding job to queue with data:`, jobData);
      
      try {
        const job = await researchQueue.add('research', jobData, {
          jobId: sessionId,
          removeOnComplete: false,
          removeOnFail: false,
          timeout: 3000000 // 50 minute timeout
        });
        
        logger.info(`Research session ${sessionId} created and queued with job ID: ${job.id}`);
      } catch (queueError: any) {
        logger.error(`Failed to add job to queue:`, queueError);
        throw new Error(`Queue error: ${queueError?.message || queueError}`);
      }
      
      return session;
    } catch (error) {
      logger.error('Failed to start research:', error);
      throw new AppError(500, 'Failed to start research session');
    }
  }
  
  async listUserSessions(userId: string, filters: any): Promise<any> {
    const { status, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;
    
    try {
      let query = this.db('research_sessions')
        .where('user_id', userId)
        .orderBy('created_at', 'desc');
      
      if (status) {
        query = query.where('status', status);
      }
      
      const [sessions, countResult] = await Promise.all([
        query.clone().limit(limit).offset(offset),
        query.clone().count('* as total').first()
      ]);
      
      const total = countResult?.total || 0;
      
      return {
        sessions: sessions.map(this.formatSession),
        pagination: {
          page,
          limit,
          total: Number(total),
          pages: Math.ceil(Number(total) / limit)
        }
      };
    } catch (error) {
      logger.error('Failed to list research sessions:', error);
      throw new AppError(500, 'Failed to retrieve research sessions');
    }
  }
  
  async getSession(sessionId: string, userId: string): Promise<ResearchSession | null> {
    try {
      const session = await this.db('research_sessions')
        .where({ id: sessionId, user_id: userId })
        .first();
      
      if (!session) {
        return null;
      }
      
      return this.formatSession(session);
    } catch (error) {
      logger.error('Failed to get research session:', error);
      throw new AppError(500, 'Failed to retrieve research session');
    }
  }
  
  async cancelResearch(sessionId: string, userId: string): Promise<void> {
    const session = await this.getSession(sessionId, userId);
    
    if (!session) {
      throw new NotFoundError('Research session not found');
    }
    
    if (session.status === 'completed' || session.status === 'cancelled') {
      throw new ConflictError('Cannot cancel a completed or already cancelled session');
    }
    
    try {
      const job = await researchQueue.getJob(sessionId);
      if (job && ['waiting', 'active', 'delayed'].includes(await job.getState())) {
        await job.remove();
      }
      
      await this.db('research_sessions')
        .where({ id: sessionId })
        .update({
          status: 'cancelled',
          updated_at: new Date()
        });
      
      logger.info(`Research session ${sessionId} cancelled`);
    } catch (error) {
      logger.error('Failed to cancel research:', error);
      throw new AppError(500, 'Failed to cancel research session');
    }
  }
  
  async getProgress(sessionId: string, userId: string): Promise<any> {
    const session = await this.getSession(sessionId, userId);
    
    if (!session) {
      throw new NotFoundError('Research session not found');
    }
    
    try {
      const job = await researchQueue.getJob(sessionId);
      
      if (!job) {
        return {
          sessionId,
          status: session.status,
          progress: session.status === 'completed' ? 100 : 0
        };
      }
      
      const progress = job.progress();
      const state = await job.getState();
      
      return {
        sessionId,
        status: session.status,
        jobState: state,
        progress: typeof progress === 'number' ? progress : 0,
        currentPhase: (job.data as any)?.currentPhase || 'initializing',
        estimatedTimeRemaining: job.opts?.delay ? job.opts.delay / 1000 : null
      };
    } catch (error) {
      logger.error('Failed to get progress:', error);
      throw new AppError(500, 'Failed to retrieve progress information');
    }
  }
  
  async retryResearch(sessionId: string, userId: string): Promise<ResearchSession> {
    const originalSession = await this.getSession(sessionId, userId);
    
    if (!originalSession) {
      throw new NotFoundError('Research session not found');
    }
    
    if (originalSession.status !== 'failed') {
      throw new ConflictError('Can only retry failed research sessions');
    }
    
    return this.startResearch({
      topic: originalSession.topic,
      parameters: originalSession.parameters,
      userId
    });
  }
  
  async processResearchJob(job: any): Promise<void> {
    const { sessionId, topic, parameters } = job.data;
    
    logger.info(`Processing research job: sessionId=${sessionId}, topic="${topic}"`);
    
    try {
      await this.updateSessionStatus(sessionId, 'processing', { startedAt: new Date() });
      
      const llmConfig = {
        provider: config.litellm.provider || this.extractProvider(config.litellm.defaultModel),
        model: config.litellm.defaultModel,
        apiKey: config.litellm.apiKey,
        baseUrl: config.litellm.baseUrl
      };
      
      logger.info(`Creating workflow with LLM config:`, llmConfig);
      
      const workflow = new ResearchWorkflow({
        sessionId,
        topic,
        parameters,
        llmConfig
      });
      
      const report = await workflow.execute();
      
      logger.debug('Workflow execute() returned:', JSON.stringify(report));
      
      const reportId = await this.saveReport(sessionId, report);
      
      await this.updateSessionStatus(sessionId, 'completed', {
        completedAt: new Date(),
        reportId
      });
      
      logger.info(`Research session ${sessionId} completed successfully`);
    } catch (error) {
      logger.error(`Research session ${sessionId} failed:`, error);
      
      await this.updateSessionStatus(sessionId, 'failed', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });
      
      throw error;
    }
  }
  
  private async updateSessionStatus(sessionId: string, status: string, updates: any = {}): Promise<void> {
    const updateData = {
      status,
      updated_at: new Date(),
      ...updates
    };
    
    if (updates.startedAt) updateData.started_at = updates.startedAt;
    if (updates.completedAt) updateData.completed_at = updates.completedAt;
    if (updates.errorMessage) updateData.error_message = updates.errorMessage;
    if (updates.reportId) updateData.report_id = updates.reportId;
    
    delete updateData.startedAt;
    delete updateData.completedAt;
    delete updateData.errorMessage;
    delete updateData.reportId;
    
    await this.db('research_sessions')
      .where({ id: sessionId })
      .update(updateData);
  }
  
  private async saveReport(sessionId: string, report: any): Promise<string> {
    const reportId = uuidv4();
    
    // Ensure content is a string - check both report.report and report.content for compatibility
    let content = report.report || report.content || report;
    if (typeof content !== 'string') {
      logger.warn('Report content is not a string, converting:', typeof content);
      content = JSON.stringify(content);
    }
    
    await this.db('reports').insert({
      id: reportId,
      session_id: sessionId,
      content: content,
      summary: report.summary || '',
      key_findings: JSON.stringify(report.keyFindings || []),
      word_count: content ? content.split(/\s+/).length : 0,
      created_at: new Date()
    });
    
    if (report.sources && report.sources.length > 0) {
      const sourcesToInsert = report.sources.map((source: any) => ({
        id: uuidv4(),
        session_id: sessionId,
        url: source.url,
        title: source.title,
        content: source.content,
        summary: source.summary,
        relevance_score: source.relevanceScore || 0.5,
        accessed_at: new Date(),
        metadata: JSON.stringify(source.metadata || {})
      }));
      
      await this.db('sources').insert(sourcesToInsert);
    }
    
    if (report.citations && report.citations.length > 0) {
      const citationsToInsert = report.citations.map((citation: any, index: number) => ({
        id: uuidv4(),
        report_id: reportId,
        source_id: null,
        quote: citation.text || citation.quote,
        context: citation.context || '',
        position: index
      }));
      
      await this.db('citations').insert(citationsToInsert);
    }
    
    return reportId;
  }
  
  private formatSession(dbSession: any): ResearchSession {
    return {
      id: dbSession.id,
      userId: dbSession.user_id,
      topic: dbSession.topic,
      status: dbSession.status,
      parameters: typeof dbSession.parameters === 'string' 
        ? JSON.parse(dbSession.parameters) 
        : dbSession.parameters,
      createdAt: dbSession.created_at,
      startedAt: dbSession.started_at,
      completedAt: dbSession.completed_at,
      errorMessage: dbSession.error_message,
      reportId: dbSession.report_id
    };
  }
  
  private extractProvider(model: string): string {
    // Extract provider from model name patterns
    if (model.startsWith('gpt')) return 'openai';
    if (model.startsWith('claude')) return 'anthropic';
    if (model.includes('llama')) return 'ollama';
    if (model.includes('mistral')) return 'ollama';
    if (model.includes('mixtral')) return 'ollama';
    
    // Check if using local endpoints
    if (config.litellm.baseUrl?.includes('ollama')) return 'ollama';
    if (config.litellm.baseUrl?.includes('localhost:1234')) return 'lmstudio';
    if (config.litellm.baseUrl?.includes('localhost:4000')) return 'litellm-proxy';
    
    // Default to OpenAI-compatible
    return 'openai';
  }
}