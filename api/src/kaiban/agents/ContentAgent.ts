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

      // Initialize the agent with the tools
      this.agent = new Agent({
        name: 'Visioneer',
        role: 'Content Analyst',
        goal: 'Extract and analyze information from web content screenshots, evaluate credibility, and identify key insights',
        background: 'Expert in visual content analysis, information extraction, and source evaluation',
        tools: [
          this.screenshotAnalyzerTool,
          this.credibilityEvaluatorTool
        ],
        llmConfig: llmConfig
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