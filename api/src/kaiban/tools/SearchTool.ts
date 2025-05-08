import { Tool } from "@langchain/core/tools";
import { searchService } from "../../services/searchService";
import { logger } from "../../utils/logger";
import { z } from 'zod';

/**
 * Custom tool for performing web searches to find research information
 * Wraps the application search service in a KaibanJS-compatible tool
 */
export class SearchTool extends Tool {
  static schema = z.object({
    input: z.string().describe("JSON string containing query and optional maxResults")
  });

  name: string;
  description: string;

  constructor() {
    super();
    this.name = "search";
    this.description = "Search for information using the DuckDuckGo search engine. Input should be a JSON string with query (required) and maxResults (optional, defaults to 5).";
  }

  async _call(input: string): Promise<string> {
    try {
      const parsedInput = JSON.parse(input);
      const { query, maxResults = 5 } = parsedInput;
      logger.info(`SearchTool executing search query: "${query}"`);
      
      try {
        const results = await searchService.search(query, { maxResults });
        return JSON.stringify(results);
      } catch (error) {
        logger.error(`Search error: ${error}`);
        return JSON.stringify({ 
          error: "Search failed", 
          message: error instanceof Error ? error.message : String(error) 
        });
      }
    } catch (error) {
      logger.error(`Error parsing input in SearchTool: ${error}`);
      return JSON.stringify({
        error: "Failed to parse input",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
}