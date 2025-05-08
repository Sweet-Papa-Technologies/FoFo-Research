import { Agent } from 'kaibanjs';
import { searchService } from '../../services/searchService';
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
  private searchTool: any; // Type declaration simplified for example

  constructor(config?: { 
    apiKey?: string;
    model?: string;
    provider?: string;
  }) {
    try {
      // Initialize search tool - in this app we have our own searchService
      // but we wrap it as a LangChain-compatible tool
      this.searchTool = {
        name: "search",
        description: "Search for information using the DuckDuckGo search engine",
        schema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query"
            },
            maxResults: {
              type: "number",
              description: "Maximum number of results to return"
            }
          },
          required: ["query"]
        },
        _call: async (input: any) => {
          const { query, maxResults = 5 } = input;
          logger.info(`SearchAgent performing search: "${query}"`);
          
          try {
            const results = await searchService.search(query, { maxResults });
            return JSON.stringify(results);
          } catch (error) {
            logger.error(`Search error: ${error}`);
            return JSON.stringify({ error: "Search failed", message: error instanceof Error ? error.message : String(error) });
          }
        }
      };

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
        tools: [this.searchTool],
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