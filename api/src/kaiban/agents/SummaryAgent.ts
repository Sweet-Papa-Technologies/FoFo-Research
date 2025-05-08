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

      // Convert tools to the format expected by KaibanJS
      const toolsForAgent = [
        {
          name: this.qualityAssessorTool.name,
          description: this.qualityAssessorTool.description,
          func: async (args: any) => this.qualityAssessorTool._call(args)
        },
        {
          name: this.reportFormatterTool.name,
          description: this.reportFormatterTool.description,
          func: async (args: any) => this.reportFormatterTool._call(args)
        }
      ];

      // Initialize the agent with the tools
      this.agent = new Agent({
        name: 'Synthesizer',
        role: 'Research Synthesizer',
        goal: 'Synthesize information from multiple sources into coherent, structured reports',
        background: 'Expert in information synthesis, knowledge distillation, and clear communication',
        tools: toolsForAgent as any,
        llmConfig: llmConfig
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