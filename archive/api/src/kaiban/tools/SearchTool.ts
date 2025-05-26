import { Tool } from "@langchain/core/tools";
import { searchService } from "../../services/searchService";
import { logger } from "../../utils/logger";
import { z } from "zod";

/**
 * Custom tool for performing web searches to find research information
 * Wraps the application search service in a KaibanJS-compatible tool
 */

export class SearchTool extends Tool {
  name: string;
  description: string;

   constructor(fields?: any) {
    super(fields);
    this.name = "search";
    this.description = "Search for information using a search engine. Input should be a search query string.";

    this.schema = z.object({
      query: z.string().describe("Search query"),
      maxResults: z.number().optional().describe("Maximum number of results")
    }) as any

  }

  async _call(searchQuery: string | object): Promise<string> {
    try {
      // Handle undefined or empty input
      if (!searchQuery || searchQuery === "undefined") {
        logger.error("SearchTool received undefined or empty input");
        return JSON.stringify({
          error: "Invalid input",
          message: "Search query is required"
        });
      }
      
      // Process input - handle both string and object inputs
      let query: string;
      let maxResults = 5;
      
      // Log the input type to help with debugging
      logger.info(`SearchTool received input type: ${typeof searchQuery}`);
      
      if (typeof searchQuery === 'object') {
        // Handle object input directly
        const queryObj = searchQuery as any;
        
        // Careful object stringifying to avoid [object Object] issues
        try {
          logger.info(`SearchTool received object input: ${JSON.stringify(queryObj, null, 2)}`);
        } catch (e) {
          logger.error(`Failed to stringify object input: ${e}`);
        }
        
        if (queryObj.query) {
          query = queryObj.query;
          maxResults = queryObj.maxResults || 5;
          logger.info(`Extracted from object - query: "${query}", maxResults: ${maxResults}`);
        } else {
          // Check if it might be a "raw" object that IS the query
          const objAsString = String(queryObj);
          if (objAsString && objAsString !== '[object Object]') {
            logger.info(`Using object converted to string as query: "${objAsString}"`);
            query = objAsString;
          } else {
            logger.error("SearchTool received object without query property");
            return JSON.stringify({
              error: "Invalid input",
              message: "Object input must contain a 'query' property or be a valid string"
            });
          }
        }
      } else {
        // Handle string input
        const stringInput = String(searchQuery);
        
        try {
          // Check if input is JSON string
          if (stringInput.trim().startsWith('{')) {
            logger.info(`Attempting to parse JSON string: "${stringInput}"`);
            try {
              const parsed = JSON.parse(stringInput);
              if (parsed.query) {
                query = parsed.query;
                maxResults = parsed.maxResults || 5;
                logger.info(`Extracted from JSON string - query: "${query}", maxResults: ${maxResults}`);
              } else {
                logger.info(`JSON string doesn't contain query property, using as raw query: "${stringInput}"`);
                query = stringInput;
              }
            } catch (jsonError) {
              logger.warn(`Failed to parse as JSON, using as raw query: "${stringInput}" - Error: ${jsonError}`);
              query = stringInput;
            }
          } else {
            logger.info(`Using string input as raw query: "${stringInput}"`);
            query = stringInput;
          }
        } catch (e) {
          // If any processing fails, use input as is
          query = String(searchQuery);
          logger.info(`Using raw input as search query: "${query}"`);
        }
      }
      
      // Final sanity check
      if (!query || query === '[object Object]') {
        logger.error(`Invalid query detected: "${query}"`);
        return JSON.stringify({
          error: "Invalid query",
          message: "Search query is malformed. Please provide a valid string or an object with a 'query' property."
        });
      }
      
      logger.info(`SearchTool executing search query: "${query}"`);
      const results = await searchService.search(query, { maxResults });
      return JSON.stringify(results);
    } catch (error) {
      logger.error(`Error in SearchTool: ${error}`, { error });
      return JSON.stringify({
        error: "Search failed",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
}