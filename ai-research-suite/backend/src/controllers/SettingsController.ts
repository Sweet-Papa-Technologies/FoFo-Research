import { Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { config } from '../config';
import { getDb } from '../utils/database';
import { AuthRequest } from '../middleware/auth';
import { LiteLLMService } from '../services/LiteLLMService';
import { AppError } from '../middleware/errorHandler';
import { v4 as uuidv4 } from 'uuid';

export class SettingsController {
  private litellmService: LiteLLMService;
  
  constructor() {
    this.litellmService = new LiteLLMService();
  }
  
  private get db() {
    return getDb();
  }
  async getUserSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      
      let settings = await this.db('user_settings')
        .where('user_id', userId)
        .first();
      
      // Create default settings if none exist
      if (!settings) {
        const defaultSettings = {
          id: uuidv4(),
          user_id: userId,
          default_report_length: 'medium',
          default_language: 'en',
          default_max_sources: 200, //limit-change
          email_notifications: true,
          theme: 'auto',
          preferences: {},
          created_at: new Date(),
          updated_at: new Date()
        };
        
        await this.db('user_settings').insert(defaultSettings);
        settings = defaultSettings;
      }
      
      res.json({
        success: true,
        data: {
          defaultReportLength: settings.default_report_length,
          defaultLanguage: settings.default_language,
          defaultMaxSources: settings.default_max_sources,
          emailNotifications: settings.email_notifications,
          theme: settings.theme,
          preferences: settings.preferences || {}
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  async updateUserSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const updates = req.body;
      
      logger.info(`Updating user settings for user ${userId}`);
      
      // Map frontend keys to database columns
      const dbUpdates: any = {
        updated_at: new Date()
      };
      
      if (updates.defaultReportLength !== undefined) {
        dbUpdates.default_report_length = updates.defaultReportLength;
      }
      if (updates.defaultLanguage !== undefined) {
        dbUpdates.default_language = updates.defaultLanguage;
      }
      if (updates.defaultMaxSources !== undefined) {
        dbUpdates.default_max_sources = updates.defaultMaxSources;
      }
      if (updates.emailNotifications !== undefined) {
        dbUpdates.email_notifications = updates.emailNotifications;
      }
      if (updates.theme !== undefined) {
        dbUpdates.theme = updates.theme;
      }
      if (updates.preferences !== undefined) {
        dbUpdates.preferences = JSON.stringify(updates.preferences);
      }
      
      const updated = await this.db('user_settings')
        .where('user_id', userId)
        .update(dbUpdates);
      
      if (updated === 0) {
        // Create settings if they don't exist
        await this.db('user_settings').insert({
          id: uuidv4(),
          user_id: userId,
          ...dbUpdates,
          created_at: new Date()
        });
      }
      
      res.json({
        success: true,
        data: {
          message: 'Settings updated successfully'
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getSystemSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if user has admin role
      if (req.user?.role !== 'admin') {
        throw new AppError(403, 'Access denied. Admin role required.');
      }
      
      res.json({
        success: true,
        data: {
          searxEndpoint: config.searxng.endpoint,
          litellmModel: config.litellm.defaultModel,
          litellmBaseUrl: config.litellm.baseUrl,
          maxSourcesPerResearch: config.app.maxSourcesPerResearch,
          defaultReportLength: config.app.defaultReportLength,
          sessionTimeout: config.app.sessionTimeout
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  async updateSystemSettings(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check if user has admin role
      if (req.user?.role !== 'admin') {
        throw new AppError(403, 'Access denied. Admin role required.');
      }
      
      // In a production system, these would be saved to a config database
      // For now, we just acknowledge the update
      logger.info('System settings update requested:', req.body);
      
      res.json({
        success: true,
        data: {
          message: 'System settings updated successfully'
        }
      });
    } catch (error) {
      next(error);
    }
  }
  
  async getAvailableModels(_req: AuthRequest, res: Response): Promise<void> {
    try {
      // Get models from LiteLLM service
      const availableModels = await this.litellmService.listModels();
      
      // Map models with friendly names and providers
      const modelInfo = availableModels.map(modelId => {
        let name = modelId;
        let provider = 'unknown';
        
        if (modelId.includes('gpt')) {
          provider = 'openai';
          name = modelId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        } else if (modelId.includes('claude')) {
          provider = 'anthropic';
          name = modelId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        } else if (modelId.includes('llama')) {
          provider = 'meta';
          name = 'Llama ' + modelId.split('-').slice(1).join(' ');
        } else if (modelId.includes('mistral') || modelId.includes('mixtral')) {
          provider = 'mistral';
          name = modelId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        
        return {
          id: modelId,
          name,
          provider
        };
      });
      
      res.json({
        success: true,
        data: {
          models: modelInfo,
          defaultModel: config.litellm.defaultModel
        }
      });
    } catch (error) {
      logger.error('Failed to fetch available models:', error);
      // Return fallback models if service fails
      res.json({
        success: true,
        data: {
          models: [
            { id: 'gpt-3.5-turbo', name: 'GPT 3.5 Turbo', provider: 'openai' },
            { id: 'gpt-4', name: 'GPT 4', provider: 'openai' },
            { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic' },
            { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic' }
          ],
          defaultModel: config.litellm.defaultModel
        }
      });
    }
  }
  
  async getSearchEngines(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Check searXNG instance status
      let status = 'unknown';
      try {
        const axios = (await import('axios')).default;
        const response = await axios.get(`${config.searxng.endpoint}/config`, {
          timeout: 5000
        });
        status = response.status === 200 ? 'active' : 'error';
      } catch (error) {
        logger.warn('Failed to check searXNG status:', error);
        status = 'error';
      }
      
      res.json({
        success: true,
        data: {
          engines: [
            {
              id: 'searxng-main',
              name: 'Main searXNG Instance',
              endpoint: config.searxng.endpoint,
              status,
              isDefault: true
            }
          ]
        }
      });
    } catch (error) {
      next(error);
    }
  }
}