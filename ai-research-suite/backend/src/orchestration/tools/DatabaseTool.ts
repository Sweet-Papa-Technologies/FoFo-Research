import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { ResearchDataService } from '../../services/ResearchDataService';
import { logger } from '../../utils/logger';

const databaseToolSchema = z.object({
  action: z.enum(['store', 'retrieve_sources', 'retrieve_analysis', 'get_summary'])
    .describe('The action to perform'),
  sessionId: z.string()
    .describe('The session ID for the operation'),
  data: z.object({
    dataType: z.enum(['search_results', 'source_content', 'extracted_content', 'analysis'])
      .describe('Type of data being stored'),
    query: z.string().optional()
      .describe('The search query that generated this data'),
    source: z.object({
      url: z.string(),
      title: z.string(),
      author: z.string().nullable().optional(),
      publishedDate: z.string().nullable().optional()
    }).optional()
      .describe('Source metadata'),
    content: z.string()
      .describe('The actual content to store'),
    summary: z.string().optional()
      .describe('Summary of the content'),
    metadata: z.any().optional()
      .describe('Additional metadata')
  }).optional()
    .describe('Data to store (required for store action)'),
  dataType: z.enum(['search_results', 'source_content', 'analysis', 'all'])
    .optional()
    .describe('Type of data to retrieve'),
  limit: z.number()
    .optional()
    .default(20)
    .describe('Maximum number of items to retrieve')
});

export class DatabaseTool extends StructuredTool<typeof databaseToolSchema> {
  name = 'database_tool';
  description = 'Store or retrieve research data in the database for analysis and report writing';
  schema = databaseToolSchema;
  private dataService: ResearchDataService;
  
  constructor() {
    super();
    this.dataService = new ResearchDataService();
  }

  async _call(input: z.infer<typeof databaseToolSchema>): Promise<string> {
    try {
      const { action, sessionId, data, limit } = input;
      
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
              author: data.source?.author || undefined,
              publishedDate: data.source?.publishedDate || undefined,
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
            limit
          );
          
          // Also get extracted content
          const extractedContent = await this.dataService.getSessionResearchData(
            sessionId,
            'extracted_content',
            limit
          );
          
          const allSources = [...sources, ...extractedContent];
          
          logger.info(`Retrieved ${allSources.length} sources for session ${sessionId}`);
          
          return JSON.stringify({
            success: true,
            count: allSources.length,
            sources: allSources.map(s => ({
              id: s.id,
              title: s.title,
              content: s.content,
              url: s.metadata?.url,
              author: s.metadata?.author,
              publishedDate: s.metadata?.publishedDate,
              query: s.query,
              relevance: s.relevanceScore || 0
            }))
          });
        }
        
        case 'retrieve_analysis': {
          const analysisData = await this.dataService.getSessionResearchData(
            sessionId,
            'analysis',
            limit
          );
          
          return JSON.stringify({
            success: true,
            count: analysisData.length,
            analysis: analysisData.map(a => ({
              id: a.id,
              title: a.title,
              content: a.content,
              metadata: a.metadata
            }))
          });
        }
        
        case 'get_summary': {
          const summary = await this.dataService.getResearchSummary(sessionId);
          
          return JSON.stringify({
            success: true,
            summary: {
              totalSources: summary.totalSources,
              searchQueries: summary.searchQueries,
              topSources: summary.topSources
            }
          });
        }
        
        default:
          throw new Error(`Unknown action: ${action}`);
      }
    } catch (error) {
      logger.error('Database tool error:', error);
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}