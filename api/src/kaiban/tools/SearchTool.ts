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
      // Handle undefined or empty input
      if (!input || input === "undefined") {
        logger.error("SearchTool received undefined or empty input");
        return JSON.stringify({
          error: "Invalid input",
          message: "Search query is required"
        });
      }
      
      // Try to parse as JSON first
      try {
        const parsedInput = JSON.parse(input);
        const { query, maxResults = 5 } = parsedInput;
        
        if (!query) {
          return JSON.stringify({
            error: "Missing query",
            message: "Search query is required"
          });
        }
        
        logger.info(`SearchTool executing search query: "${query}"`);
        const results = await searchService.search(query, { maxResults });
        return JSON.stringify(results);
      } catch (jsonError) {
        // If JSON parsing fails, use the input directly as the query string
        logger.info(`SearchTool using raw input as query: "${input}"`);
        const results = await searchService.search(input, { maxResults: 5 });
        return JSON.stringify(results);
      }
    } catch (error) {
      logger.error(`Error in SearchTool: ${error}`);
      return JSON.stringify({
        error: "Search failed",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
}