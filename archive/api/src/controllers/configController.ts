import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errorHandler';
import { AppConfig, ModelInfo, ProviderInfo } from '../models/config';

// Default config path
const CONFIG_PATH = path.join(__dirname, '../config/default.yaml');
const MODELS_PATH = path.join(__dirname, '../config/models.yaml');

/**
 * Get available LLM models
 */
export const getAvailableModels = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // In a real implementation, we would read from the models.yaml file
    // For now, return mock data
    const providers: ProviderInfo[] = [
      {
        id: 'openai',
        name: 'LM Studio',
        models: [
          {
            id: 'gemma-3-27b-it-abliterated',
            provider: 'openai',
            name: 'Gemma3 27b',
            capabilities: ['text', 'vision'],
            defaultParameters: {
              temperature: 0.3,
              topP: 0.95,
              maxTokens: 12000
            }
          }
        ]
      },
      {
        id: 'openai',
        name: 'OpenAI',
        models: [
          {
            id: 'gpt-4o',
            provider: 'openai',
            name: 'GPT-4o',
            capabilities: ['text', 'vision'],
            defaultParameters: {
              temperature: 0.2,
              maxTokens: 1000
            }
          }
        ]
      },
      {
        id: 'openai',
        name: 'LM Studio',
        models: [
          {
            id: 'gemma-3-27b-it-abliterated',
            provider: 'openai',
            name: 'Gemma3 27b',
            capabilities: ['text', 'vision'],
            defaultParameters: {
              temperature: 0.5,
              topP: 0.9,
              maxTokens: 12000
            }
          },
          {
            id: 'phi-4-reasoning',
            provider: 'openai',
            name: 'Phi-4 Reasoning',
            capabilities: ['text', 'vision'],
            defaultParameters: {
              temperature: 0.4,
              topP: 0.9,
              maxTokens: 2000
            }
          }
        ]
      }
    ];
    
    res.status(200).json({
      status: 'success',
      data: {
        providers
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get current system configuration
 */
export const getSystemConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // In a real implementation, we would read from the config file
    // For now, return mock data
    const config: AppConfig = {
      research: {
        maxIterations: 5,
        maxParallelSearches: 10,
        followLinks: true,
        maxLinksPerPage: 3,
        informationGainThreshold: 0.2
      },
      models: {
        primary: {
          provider: 'openai',
          model: 'gemma-3-27b-it-abliterated',
          temperature: 0.3,
          topP: 0.95,
          maxTokens: 12000
        },
        fallback: {
          provider: 'openai',
          model: 'gemma3-27b',
          temperature: 0.5,
          topP: 0.9,
          maxTokens: 2000
        },
        vision: {
          provider: 'openai',
          model: 'gpt-4o',
          temperature: 0.2,
          maxTokens: 1000
        }
      },
      search: {
        engine: 'duckduckgo',
        resultsPerQuery: 8,
        domainFilters: {
          include: ['.edu', '.gov', '.org'],
          exclude: ['pinterest.com', 'quora.com']
        }
      },
      reporting: {
        format: 'markdown',
        includeSources: true,
        summarizeSources: true,
        maxReportLength: 5000
      },
      system: {
        maxConcurrentJobs: 5,
        storageDirectory: './data',
        loggingLevel: 'info'
      }
    };
    
    res.status(200).json({
      status: 'success',
      data: {
        config
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update system configuration
 */
export const updateSystemConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const updatedConfig = req.body;
    
    // In a real implementation, we would validate and save the config
    logger.info('System configuration updated');
    
    res.status(200).json({
      status: 'success',
      data: {
        message: 'Configuration updated successfully',
        config: updatedConfig
      }
    });
  } catch (error) {
    next(error);
  }
};