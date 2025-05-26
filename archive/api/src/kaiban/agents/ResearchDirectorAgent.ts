import { Agent } from 'kaibanjs';
import { logger } from '../../utils/logger';
import { llmConfig } from './llmConfig';

/**
 * ResearchDirectorAgent is responsible for:
 * 1. Orchestrating research
 * 2. Allocating resources
 * 3. Identifying knowledge gaps
 * 4. Maintaining research focus
 */
export class ResearchDirectorAgent {
  private agent: Agent;

  constructor(config?: { 
    model?: string;
    provider?: string;
  }) {
    try {
      // Create a custom llmConfig with the provided model parameters if available
      const agentLlmConfig = {
        provider: config?.provider || llmConfig.provider,
        model: config?.model || llmConfig.model,
        apiKey: llmConfig.apiKey,
        apiBaseUrl: llmConfig.apiBaseUrl
      };
      
      logger.info(`ResearchDirectorAgent initializing with model: ${agentLlmConfig.model}, provider: ${agentLlmConfig.provider}`);
      
      // Initialize the agent with custom llmConfig
      this.agent = new Agent({
        name: 'Director',
        role: 'Research Director',
        goal: 'Orchestrate the research process, ensure comprehensive coverage, and maintain focus on the research question',
        background: 'Expert in research methodology, project management, and knowledge gap analysis',
        tools: [], // Director doesn't need tools as it orchestrates other agents
        llmConfig: agentLlmConfig
      });

      logger.info('ResearchDirectorAgent initialized successfully');
    } catch (error) {
      logger.error(`Failed to initialize ResearchDirectorAgent: ${error}`);
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