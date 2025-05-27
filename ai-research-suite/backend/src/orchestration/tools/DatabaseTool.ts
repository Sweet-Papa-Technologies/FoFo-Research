import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { ResearchDataService } from '../../services/ResearchDataService';
import { logger } from '../../utils/logger';

const databaseToolSchema = z.object({
  action: z.enum(['retrieve_sources', 'retrieve_analysis', 'get_summary'])
    .describe('The action to perform'),
  sessionId: z.string()
    .describe('The session ID to retrieve data for'),
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
  description = 'Retrieve research data stored in the database for analysis and report writing';
  schema = databaseToolSchema;
  private dataService: ResearchDataService;
  
  constructor() {
    super();
    this.dataService = new ResearchDataService();
  }

  async _call(input: z.infer<typeof databaseToolSchema>): Promise<string> {
    try {
      const { action, sessionId, limit } = input;
      
      logger.info(`Database tool action: ${action} for session: ${sessionId}`);
      
      switch (action) {
        case 'retrieve_sources': {
          const sources = await this.dataService.getSessionResearchData(
            sessionId,
            'source_content',
            limit
          );
          
          logger.info(`Retrieved ${sources.length} sources for session ${sessionId}`);
          
          return JSON.stringify({
            success: true,
            count: sources.length,
            sources: sources.map(s => ({
              id: s.id,
              title: s.title,
              content: s.content,
              url: s.metadata?.url,
              author: s.metadata?.author,
              publishedDate: s.metadata?.publishedDate,
              query: s.query,
              relevance: s.relevanceScore
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