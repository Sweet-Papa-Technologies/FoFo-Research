import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { ResearchDataService } from '../../services/ResearchDataService';
import { logger } from '../../utils/logger';

// Simplified schema with everything optional except action and sessionId
const simpleDatabaseSchema = z.object({
  action: z.string().describe('The action to perform: store, retrieve_sources, retrieve_analysis, or get_summary'),
  sessionId: z.string().describe('The session ID for the operation'),
  data: z.any().optional().describe('Data to store (only for store action)'),
  limit: z.number().optional().describe('Maximum number of items to retrieve'),
  dataType: z.string().optional().describe('Type of data to retrieve')
});

export class SimpleDatabaseTool extends StructuredTool<typeof simpleDatabaseSchema> {
  name = 'database_tool';
  description = 'Store or retrieve research data in the database for analysis and report writing';
  schema = simpleDatabaseSchema;
  private dataService: ResearchDataService;
  
  constructor() {
    super();
    this.dataService = new ResearchDataService();
  }

  async _call(input: z.infer<typeof simpleDatabaseSchema>): Promise<string> {
    try {
      const { action, sessionId, data, limit } = input;
      
      logger.info(`Database tool action: ${action} for session: ${sessionId}`);
      
      switch (action) {
        case 'store': {
          if (!data) {
            throw new Error('Data is required for store action');
          }
          
          // Extract fields from data - be flexible about structure
          const dataType = data.dataType || 'source_content';
          const content = data.content || JSON.stringify(data);
          const query = data.query || '';
          const title = data.source?.title || data.title || 'Untitled';
          const metadata = {
            url: data.source?.url || data.url,
            author: data.source?.author || data.author,
            publishedDate: data.source?.publishedDate || data.publishedDate,
            summary: data.summary,
            ...(data.metadata || {})
          };
          
          const storedId = await this.dataService.storeResearchData({
            sessionId,
            dataType,
            query,
            title,
            content,
            metadata,
            relevanceScore: data.relevanceScore || metadata.relevanceScore || 0.8
          });
          
          logger.info(`Stored ${dataType} with ID: ${storedId}`);
          
          return JSON.stringify({
            success: true,
            message: `Data stored successfully`,
            id: storedId,
            dataType
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
      logger.error('SimpleDatabaseTool error:', error);
      return JSON.stringify({
        success: false,
        error: error?.message || 'An error occurred'
      });
    }
  }
}