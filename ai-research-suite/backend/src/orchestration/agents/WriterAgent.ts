import { Agent } from 'kaiban';
import { ReportFormatterTool } from '../tools/ReportFormatterTool';
import { CitationTool } from '../tools/CitationTool';
import { SummarizationTool } from '../tools/SummarizationTool';
import { logger } from '../../utils/logger';
import { createLLMConfig } from './AgentConfig';

export interface WriterAgentConfig {
  name?: string;
  llmConfig: {
    provider: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export function createWriterAgent(config: WriterAgentConfig): Agent {
  return new Agent({
    name: config.name || 'WriterAgent',
    role: 'Research Report Writer',
    goal: 'Create comprehensive, well-structured research reports that present findings clearly with proper citations and formatting.',
    backstory: 'An experienced technical writer who specializes in transforming complex research findings into clear, accessible, and professionally formatted reports.',
    tools: [
      new ReportFormatterTool(),
      new CitationTool(),
      new SummarizationTool()
    ],
    llm: createLLMConfig({
      provider: config.llmConfig.provider,
      model: config.llmConfig.model,
      temperature: config.llmConfig.temperature || 0.5,
      maxTokens: config.llmConfig.maxTokens || 4000
    }),
    verbose: true
  });
}

export class WriterAgentExecutor {
  private agent: Agent;
  
  constructor(agent: Agent) {
    this.agent = agent;
  }
  
  async writeReport(analysis: any, reportFormat: string, reportLength: string): Promise<any> {
    logger.info('WriterAgent starting report generation');
    
    const prompt = `
    Create a comprehensive research report based on the following analysis:
    
    ${JSON.stringify(analysis, null, 2)}
    
    Report specifications:
    - Format: ${reportFormat || 'markdown'}
    - Length: ${reportLength}
    - Style: Professional, clear, and accessible
    
    The report should include:
    1. Executive Summary
    2. Introduction with research objectives
    3. Methodology (brief overview of research approach)
    4. Key Findings (organized by theme or importance)
    5. Detailed Analysis
    6. Conclusions
    7. References (with proper citations)
    
    Guidelines:
    - Use clear headings and subheadings
    - Include bullet points for key findings
    - Ensure all claims are properly cited
    - Maintain an objective, professional tone
    - ${reportLength === 'short' ? 'Keep it concise (1000-1500 words)' : ''}
    - ${reportLength === 'medium' ? 'Aim for 2000-3000 words' : ''}
    - ${reportLength === 'long' ? 'Provide detailed coverage (4000-5000 words)' : ''}
    - ${reportLength === 'comprehensive' ? 'Include exhaustive detail (6000+ words)' : ''}
    `;
    
    try {
      const result = await this.agent.execute(prompt);
      logger.info('WriterAgent completed report generation');
      return result;
    } catch (error) {
      logger.error('WriterAgent execution error:', error);
      throw error;
    }
  }
}