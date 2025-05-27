import { DynamicTool } from '@langchain/core/tools';
import { ResearchDataService } from '../../services/ResearchDataService';
import { logger } from '../../utils/logger';

/**
 * A flexible database tool that accepts both string and object inputs
 * without strict schema validation
 */
export class FlexibleDatabaseTool extends DynamicTool {
  private dataService: ResearchDataService;

  constructor() {
    super({
      name: 'database_tool',
      description: `Store or retrieve research data in the database. 
Actions: 
- store: Store research data (requires: action, sessionId, data object with dataType, content, etc.)
- retrieve_sources: Get stored sources (requires: action, sessionId, optional: limit)
- retrieve_analysis: Get analysis data (requires: action, sessionId, optional: limit)
- get_summary: Get session summary (requires: action, sessionId)`,
      func: async (input: string) => {
        return this.execute(input);
      }
    });
    this.dataService = new ResearchDataService();
  }

  async execute(input: string): Promise<string> {
    try {
      // Log raw input
      logger.debug('FlexibleDatabaseTool: Raw input type:', typeof input);
      logger.debug('FlexibleDatabaseTool: Raw input:', input);
      
      // Parse the input - it might be a JSON string or already parsed by LangChain
      let parsedInput: any;
      
      try {
        // First try to parse as JSON
        parsedInput = typeof input === 'string' ? JSON.parse(input) : input;
      } catch (e) {
        // If parsing fails, assume it's already an object
        parsedInput = input;
      }

      logger.debug('FlexibleDatabaseTool: Parsed input:', JSON.stringify(parsedInput, null, 2));

      // Handle undefined or null input
      if (!parsedInput) {
        logger.error('FlexibleDatabaseTool: Received undefined or null input');
        return JSON.stringify({
          success: false,
          error: 'Invalid input: received undefined or null'
        });
      }

      const { action, sessionId, data, limit } = parsedInput;
      
      // Validate required fields
      if (!action) {
        logger.error('FlexibleDatabaseTool: Missing required field: action');
        return JSON.stringify({
          success: false,
          error: 'Missing required field: action'
        });
      }
      
      if (!sessionId) {
        logger.error('FlexibleDatabaseTool: Missing required field: sessionId');
        return JSON.stringify({
          success: false,
          error: 'Missing required field: sessionId'
        });
      }
      
      logger.info(`Database tool action: ${action} for session: ${sessionId}`);
      
      switch (action) {
        case 'store': {
          if (!data) {
            throw new Error('Data is required for store action');
          }
          
          const storedId = await this.dataService.storeResearchData({
            sessionId,
            dataType: data.dataType,
            query: data.query || '',
            title: data.source?.title || 'Untitled',
            content: data.content,
            metadata: {
              url: data.source?.url,
              author: data.source?.author,
              publishedDate: data.source?.publishedDate,
              summary: data.summary,
              ...data.metadata
            },
            relevanceScore: data.metadata?.relevanceScore || 0.8
          });
          
          logger.info(`Stored ${data.dataType} with ID: ${storedId}`);
          
          return JSON.stringify({
            success: true,
            message: `Data stored successfully`,
            id: storedId,
            dataType: data.dataType
          });
        }
        
        case 'retrieve_sources': {
          const sources = await this.dataService.getSessionResearchData(
            sessionId,
            'source_content',
            limit || 20
          );
          
          // Also get extracted content
          const extractedContent = await this.dataService.getSessionResearchData(
            sessionId,
            'extracted_content',
            limit || 20
          );
          
          const allContent = [...sources, ...extractedContent];
          
          logger.info(`Retrieved ${allContent.length} sources for session ${sessionId}`);
          
          return JSON.stringify({
            success: true,
            sources: allContent,
            count: allContent.length
          });
        }
        
        case 'retrieve_analysis': {
          const analysis = await this.dataService.getSessionResearchData(
            sessionId,
            'analysis',
            limit || 10
          );
          
          return JSON.stringify({
            success: true,
            analysis: analysis,
            count: analysis.length
          });
        }
        
        case 'get_summary': {
          // Get all data types for the session
          const sources = await this.dataService.getSessionResearchData(sessionId, 'source_content');
          const analysis = await this.dataService.getSessionResearchData(sessionId, 'analysis');
          const searchResults = await this.dataService.getSessionResearchData(sessionId, 'search_results');
          
          return JSON.stringify({
            success: true,
            summary: {
              totalSources: sources.length,
              totalAnalysis: analysis.length,
              totalSearchResults: searchResults.length,
              sources: sources,
              analysis: analysis,
              searchResults: searchResults
            }
          });
        }
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error: any) {
      logger.error('FlexibleDatabaseTool error:', error);
      return JSON.stringify({
        success: false,
        error: error?.message || 'An error occurred'
      });
    }
  }
}