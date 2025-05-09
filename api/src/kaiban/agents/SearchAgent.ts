import { Agent } from 'kaibanjs';
import { SearchTool } from '../tools/SearchTool';
import { logger } from '../../utils/logger';
import { llmConfig } from './llmConfig';

/**
 * SearchAgent is responsible for:
 * 1. Generating search queries
 * 2. Evaluating search results
 * 3. Identifying follow-up queries
 */
export class SearchAgent {
  private agent: Agent;
  private searchTool: SearchTool;

  constructor(config?: { 
    apiKey?: string;
    model?: string;
    provider?: string;
  }) {
    try {
      // Initialize search tool using our proper Tool implementation
      this.searchTool = new SearchTool();

      // Create a custom llmConfig with the provided model parameters if available
      const agentLlmConfig = {
        provider: config?.provider || llmConfig.provider,
        model: config?.model || llmConfig.model,
        apiKey: config?.apiKey || llmConfig.apiKey,
        apiBaseUrl: llmConfig.apiBaseUrl
      };
      
      logger.info(`SearchAgent initializing with model: ${agentLlmConfig.model}, provider: ${agentLlmConfig.provider}`);
      
      // Initialize the agent with the search tool and custom llmConfig
      this.agent = new Agent({
        name: 'Scout',
        role: 'Search Specialist',
        goal: 'Find the most relevant information about the research topic and identify valuable sources',
        background: 'Expert in search query formulation, source evaluation, and iterative research refinement',
        // systemMessage: `You are a research specialist with access to a custom "search" tool.
        //   IMPORTANT: Do NOT look for or try to use a tool named "tavily_search_results_json" - it does not exist.
          
        //   Instead, ALWAYS use the "search" tool for research tasks. The search tool works in two ways:
        //   1. With a simple string query: search("dogs")
        //   2. With a JSON object: search({"query": "dogs", "maxResults": 5})
          
        //   The search tool returns results in JSON format including title, url, and description of each result.
        //   After getting search results, analyze them directly - do not try to use other tools to process the results.
        //   Work with the JSON results as they are provided by the search tool.`,
        tools: [this.searchTool] as any, // Type cast as any to avoid TypeScript errors
        llmConfig: agentLlmConfig
      });

      logger.info('SearchAgent initialized successfully');
    } catch (error) {
      logger.error(`Failed to initialize SearchAgent: ${error}`);
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