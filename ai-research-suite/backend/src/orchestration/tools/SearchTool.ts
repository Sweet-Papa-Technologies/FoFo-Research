import { Tool } from 'kaiban';
import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export class SearchTool extends Tool {
  constructor() {
    super({
      name: 'search_tool',
      description: 'Search for information using the configured searXNG instance',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query'
          },
          maxResults: {
            type: 'number',
            description: 'Maximum number of results to return',
            default: 10
          },
          language: {
            type: 'string',
            description: 'Language for search results',
            default: 'en'
          },
          timeRange: {
            type: 'string',
            description: 'Time range for results (e.g., "day", "week", "month", "year")',
            default: ''
          }
        },
        required: ['query']
      },
      execute: async (params: any) => {
        return this.performSearch(params);
      }
    });
  }

  private async performSearch(params: any): Promise<any> {
    const { query, maxResults = 10, language = 'en', timeRange = '' } = params;
    
    try {
      logger.info(`Performing search for: ${query}`);
      
      const searchParams = new URLSearchParams({
        q: query,
        format: 'json',
        language,
        pageno: '1',
        safesearch: '0'
      });
      
      if (timeRange) {
        searchParams.append('time_range', timeRange);
      }
      
      const response = await axios.get(`${config.searxng.endpoint}/search`, {
        params: searchParams,
        headers: {
          'Accept': 'application/json'
        },
        timeout: 30000
      });
      
      const results = response.data.results.slice(0, maxResults);
      
      logger.info(`Search returned ${results.length} results`);
      
      return {
        query,
        totalResults: results.length,
        results: results.map((result: any) => ({
          url: result.url,
          title: result.title,
          content: result.content,
          engine: result.engine,
          score: result.score || 0
        }))
      };
    } catch (error) {
      logger.error('Search error:', error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }
}