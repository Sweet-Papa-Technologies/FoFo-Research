import { Agent } from 'kaibanjs';
import { ScreenshotAnalyzerTool } from '../tools/ScreenshotAnalyzerTool';
import { CredibilityEvaluatorTool } from '../tools/CredibilityEvaluatorTool';
import { logger } from '../../utils/logger';
import { llmConfig } from './llmConfig';

/**
 * ContentAgent is responsible for:
 * 1. Processing screenshots
 * 2. Extracting information from visual content
 * 3. Evaluating source credibility
 */
export class ContentAgent {
  private agent: Agent;
  private screenshotAnalyzerTool: ScreenshotAnalyzerTool;
  private credibilityEvaluatorTool: CredibilityEvaluatorTool;

  constructor(config?: { 
    model?: string;
    provider?: string;
  }) {
    try {
      // Initialize tools
      this.screenshotAnalyzerTool = new ScreenshotAnalyzerTool();
      this.credibilityEvaluatorTool = new CredibilityEvaluatorTool();

      // Create a custom llmConfig with the provided model parameters if available
      const agentLlmConfig = {
        provider: config?.provider || llmConfig.provider,
        model: config?.model || llmConfig.model,
        apiKey: llmConfig.apiKey,
        apiBaseUrl: llmConfig.apiBaseUrl
      };
      
      logger.info(`ContentAgent initializing with model: ${agentLlmConfig.model}, provider: ${agentLlmConfig.provider}`);
      
      // Initialize the agent with the tools and custom llmConfig
      // Pass the tool instances directly to the agent with type casting
      this.agent = new Agent({
        name: 'Visioneer',
        role: 'Content Analyst',
        goal: 'Extract and analyze information from web content screenshots, evaluate credibility, and identify key insights',
        background: 'Expert in visual content analysis, information extraction, and source evaluation',
        tools: [
          this.screenshotAnalyzerTool,
          this.credibilityEvaluatorTool
        ] as any, // Type cast as any to avoid TypeScript errors
        llmConfig: agentLlmConfig
      });

      logger.info('ContentAgent initialized successfully');
    } catch (error) {
      logger.error(`Failed to initialize ContentAgent: ${error}`);
      throw error;
    }
  }

  /**
   * Get the KaibanJS agent instance
   */
  public getAgent(): Agent {
    return this.agent;
  }
}