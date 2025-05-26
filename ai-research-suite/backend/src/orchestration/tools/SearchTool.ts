import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';

const searchToolSchema = z.object({
  query: z.string().describe('The search query'),
  maxResults: z.number()
    .optional()
    .default(10)
    .describe('Maximum number of results to return'),
  language: z.string()
    .optional()
    .default('en')
    .describe('Language for search results'),
  timeRange: z.string()
    .optional()
    .default('')
    .describe('Time range for results (e.g., "day", "week", "month", "year")')
});

export class SearchTool extends StructuredTool<typeof searchToolSchema> {
  name = 'search_tool';
  description = 'Search for information using the configured searXNG instance';
  schema = searchToolSchema;

  async _call(input: z.infer<typeof searchToolSchema>): Promise<string> {
    const result = await this.performSearch(input);
    return JSON.stringify(result);
  }

  private async performSearch(params: z.infer<typeof searchToolSchema>): Promise<any> {
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
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}