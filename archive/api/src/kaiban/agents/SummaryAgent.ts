import { Agent } from 'kaibanjs';
import { QualityAssessorTool } from '../tools/QualityAssessorTool';
import { ReportFormatterTool } from '../tools/ReportFormatterTool';
import { logger } from '../../utils/logger';
import { llmConfig } from './llmConfig';

/**
 * SummaryAgent is responsible for:
 * 1. Synthesizing information from multiple sources
 * 2. Creating coherent summaries
 * 3. Formatting research reports
 */
export class SummaryAgent {
  private agent: Agent;
  private qualityAssessorTool: QualityAssessorTool;
  private reportFormatterTool: ReportFormatterTool;

  constructor(config?: { 
    model?: string;
    provider?: string;
  }) {
    try {
      // Initialize tools
      this.qualityAssessorTool = new QualityAssessorTool();
      this.reportFormatterTool = new ReportFormatterTool();

      // Create a custom llmConfig with the provided model parameters if available
      const agentLlmConfig = {
        provider: config?.provider || llmConfig.provider,
        model: config?.model || llmConfig.model,
        apiKey: llmConfig.apiKey,
        apiBaseUrl: llmConfig.apiBaseUrl
      };
      
      logger.info(`SummaryAgent initializing with model: ${agentLlmConfig.model}, provider: ${agentLlmConfig.provider}`);
      
      // Initialize the agent with the tools and custom llmConfig
      // Pass the tool instances directly to the agent with type casting
      this.agent = new Agent({
        name: 'Synthesizer',
        role: 'Research Synthesizer',
        goal: 'Synthesize information from multiple sources into coherent, structured reports',
        background: 'Expert in information synthesis, knowledge distillation, and clear communication',
        tools: [
          this.qualityAssessorTool,
          this.reportFormatterTool
        ] as any, // Type cast as any to avoid TypeScript errors
        llmConfig: agentLlmConfig
      });

      logger.info('SummaryAgent initialized successfully');
    } catch (error) {
      logger.error(`Failed to initialize SummaryAgent: ${error}`);
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