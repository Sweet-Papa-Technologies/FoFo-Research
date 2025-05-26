import { Agent } from 'kaiban';
import { SearchTool } from '../tools/SearchTool';
import { AnalysisTool } from '../tools/AnalysisTool';
import { SummarizationTool } from '../tools/SummarizationTool';
import { CitationTool } from '../tools/CitationTool';
import { logger } from '../../utils/logger';
import { createLLMConfig } from './AgentConfig';

export interface ResearchAgentConfig {
  name?: string;
  llmConfig: {
    provider: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export function createResearchAgent(config: ResearchAgentConfig): Agent {
  return new Agent({
    name: config.name || 'ResearchAgent',
    role: 'Senior Research Analyst',
    goal: 'Conduct comprehensive research on the given topic by finding relevant sources, analyzing information, and extracting key insights',
    backstory: 'An experienced research analyst with expertise in finding, evaluating, and synthesizing information from various sources.',
    tools: [
      new SearchTool(),
      new AnalysisTool(),
      new SummarizationTool(),
      new CitationTool()
    ],
    llm: createLLMConfig({
      provider: config.llmConfig.provider,
      model: config.llmConfig.model,
      temperature: config.llmConfig.temperature || 0.7,
      maxTokens: config.llmConfig.maxTokens || 2000
    }),
    verbose: true
  });
}

export class ResearchAgentExecutor {
  private agent: Agent;
  
  constructor(agent: Agent) {
    this.agent = agent;
  }
  
  async executeResearch(topic: string, parameters: any): Promise<any> {
    logger.info(`ResearchAgent starting research on topic: ${topic}`);
    
    const prompt = `
    Research the following topic comprehensively: ${topic}
    
    Parameters:
    - Maximum sources: ${parameters.maxSources}
    - Minimum sources: ${parameters.minSources}
    - Report depth: ${parameters.depth}
    - Language: ${parameters.language || 'en'}
    ${parameters.allowedDomains ? `- Allowed domains: ${parameters.allowedDomains.join(', ')}` : ''}
    ${parameters.blockedDomains ? `- Blocked domains: ${parameters.blockedDomains.join(', ')}` : ''}
    
    Your task:
    1. Search for relevant and authoritative sources
    2. Analyze the information found
    3. Extract key insights and findings
    4. Ensure proper citation of all sources
    5. Focus on accuracy and comprehensiveness
    `;
    
    try {
      const result = await this.agent.execute(prompt);
      logger.info('ResearchAgent completed initial research phase');
      return result;
    } catch (error) {
      logger.error('ResearchAgent execution error:', error);
      throw error;
    }
  }
}