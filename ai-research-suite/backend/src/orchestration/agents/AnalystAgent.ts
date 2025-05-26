import { Agent } from 'kaiban';
import { AnalysisTool } from '../tools/AnalysisTool';
import { FactCheckTool } from '../tools/FactCheckTool';
import { RelevanceScoringTool } from '../tools/RelevanceScoringTool';
import { logger } from '../../utils/logger';

export interface AnalystAgentConfig {
  name?: string;
  llmConfig: {
    provider: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export function createAnalystAgent(config: AnalystAgentConfig): Agent {
  return new Agent({
    name: config.name || 'AnalystAgent',
    role: 'Research Data Analyst',
    goal: 'Analyze research findings for accuracy, relevance, and insights. Identify patterns, validate information, and extract key findings.',
    backstory: 'A meticulous data analyst specialized in validating research findings, cross-referencing sources, and identifying meaningful patterns in data.',
    tools: [
      new AnalysisTool(),
      new FactCheckTool(),
      new RelevanceScoringTool()
    ],
    llm: {
      provider: config.llmConfig.provider,
      model: config.llmConfig.model,
      temperature: config.llmConfig.temperature || 0.3,
      maxTokens: config.llmConfig.maxTokens || 2000
    },
    verbose: true
  });
}

export class AnalystAgentExecutor {
  private agent: Agent;
  
  constructor(agent: Agent) {
    this.agent = agent;
  }
  
  async analyzeFindings(sources: any[], topic: string, focusAreas?: string[]): Promise<any> {
    logger.info('AnalystAgent starting analysis of research findings');
    
    const prompt = `
    Analyze the following research findings for the topic: ${topic}
    
    Sources to analyze:
    ${JSON.stringify(sources, null, 2)}
    
    ${focusAreas ? `Focus areas: ${focusAreas.join(', ')}` : ''}
    
    Your analysis should:
    1. Validate the credibility and accuracy of sources
    2. Identify key patterns and themes
    3. Score the relevance of each source
    4. Cross-reference information between sources
    5. Highlight any contradictions or inconsistencies
    6. Extract the most important findings
    7. Provide confidence scores for major claims
    `;
    
    try {
      const result = await this.agent.execute(prompt);
      logger.info('AnalystAgent completed analysis');
      return result;
    } catch (error) {
      logger.error('AnalystAgent execution error:', error);
      throw error;
    }
  }
}