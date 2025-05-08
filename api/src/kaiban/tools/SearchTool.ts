import { DynamicTool } from "@langchain/core/tools";
import { searchService } from "../../services/searchService";
import { logger } from "../../utils/logger";

/**
 * Custom tool for performing web searches to find research information
 * Wraps the application search service in a KaibanJS-compatible tool
 */
export class SearchTool extends DynamicTool {
  constructor() {
    super({
      name: "search",
      description: "Search for information using a search engine. Input should be a search query string.",
      func: async (input: string): Promise<string> => {
        try {
          // Handle undefined or empty input
          if (!input || input === "undefined") {
            logger.error("SearchTool received undefined or empty input");
            return JSON.stringify({
              error: "Invalid input",
              message: "Search query is required"
            });
          }
          
          // Process input - try to extract query from JSON if possible, otherwise use as is
          let query = input;
          let maxResults = 5;
          
          try {
            // Check if input is JSON
            if (input.trim().startsWith('{')) {
              const parsed = JSON.parse(input);
              if (parsed.query) {
                query = parsed.query;
                maxResults = parsed.maxResults || 5;
              }
            }
          } catch (e) {
            // If parsing fails, use input as is
            logger.info(`Using raw input as search query: "${input}"`);
          }
          
          logger.info(`SearchTool executing search query: "${query}"`);
          const results = await searchService.search(query, { maxResults });
          return JSON.stringify(results);
        } catch (error) {
          logger.error(`Error in SearchTool: ${error}`);
          return JSON.stringify({
            error: "Search failed",
            message: error instanceof Error ? error.message : String(error)
          });
        }
      }
    });
  }
}
