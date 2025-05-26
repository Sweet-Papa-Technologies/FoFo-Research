import { Request, Response, NextFunction } from 'express';
import { ResearchService } from '../services/ResearchService';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export class ResearchController {
  private researchService: ResearchService;
  
  constructor() {
    this.researchService = new ResearchService();
  }
  
  async startResearch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { topic, parameters } = req.body;
      const userId = req.user?.id;
      
      logger.info(`Starting research for user ${userId} on topic: ${topic}`);
      
      const session = await this.researchService.startResearch({
        topic,
        parameters,
        userId: userId || ''
      });
      
      res.status(201).json({
        success: true,
        data: {
          sessionId: session.id,
          status: session.status,
          createdAt: session.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  async listResearch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const { status, page = 1, limit = 20 } = req.query;
      
      const sessions = await this.researchService.listUserSessions(
        userId || '',
        {
          status: status as string,
          page: Number(page),
          limit: Math.min(Number(limit), 100)
        }
      );
      
      res.json({
        success: true,
        data: sessions
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getResearch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;
      
      const session = await this.researchService.getSession(sessionId, userId || '');
      
      if (!session) {
        throw new AppError(404, 'Research session not found');
      }
      
      res.json({
        success: true,
        data: session
      });
    } catch (error) {
      next(error);
    }
  }
  
  async cancelResearch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;
      
      await this.researchService.cancelResearch(sessionId, userId || '');
      
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
  
  async getProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;
      
      const progress = await this.researchService.getProgress(sessionId, userId || '');
      
      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      next(error);
    }
  }
  
  async retryResearch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sessionId } = req.params;
      const userId = req.user?.id;
      
      const newSession = await this.researchService.retryResearch(sessionId, userId || '');
      
      res.json({
        success: true,
        data: {
          sessionId: newSession.id,
          status: newSession.status,
          createdAt: newSession.createdAt
        }
      });
    } catch (error) {
      next(error);
    }
  }
}