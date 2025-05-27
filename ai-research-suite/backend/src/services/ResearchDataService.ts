import { getDb } from '../utils/database';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export interface ResearchData {
  id?: string;
  sessionId: string;
  dataType: 'search_results' | 'analysis' | 'source_content' | 'game_plan' | 'extracted_content';
  query?: string;
  title?: string;
  content: string;
  metadata?: any;
  relevanceScore?: number;
  createdAt?: Date;
}

export interface ResearchQuery {
  id?: string;
  sessionId: string;
  query: string;
  status?: 'pending' | 'processing' | 'completed' | 'failed';
  priority?: number;
  resultsSummary?: any;
  createdAt?: Date;
  processedAt?: Date;
}

export class ResearchDataService {
  /**
   * Store research data in the database
   */
  async storeResearchData(data: ResearchData): Promise<string> {
    try {
      const id = data.id || uuidv4();
      
      await getDb()('research_data').insert({
        id,
        session_id: data.sessionId,
        data_type: data.dataType,
        query: data.query,
        title: data.title,
        content: data.content,
        metadata: data.metadata || null,
        relevance_score: data.relevanceScore || 0
      });
      
      logger.info(`Stored research data: ${id} for session: ${data.sessionId}`);
      return id;
    } catch (error) {
      logger.error('Error storing research data:', error);
      throw error;
    }
  }
  
  /**
   * Store multiple research data items
   */
  async storeMultipleResearchData(dataItems: ResearchData[]): Promise<string[]> {
    try {
      const ids = dataItems.map(item => item.id || uuidv4());
      
      const records = dataItems.map((item, index) => ({
        id: ids[index],
        session_id: item.sessionId,
        data_type: item.dataType,
        query: item.query,
        title: item.title,
        content: item.content,
        metadata: item.metadata ? JSON.stringify(item.metadata) : null,
        relevance_score: item.relevanceScore || 0
      }));
      
      await getDb()('research_data').insert(records);
      
      logger.info(`Stored ${dataItems.length} research data items`);
      return ids;
    } catch (error) {
      logger.error('Error storing multiple research data:', error);
      throw error;
    }
  }
  
  /**
   * Retrieve research data by ID
   */
  async getResearchData(id: string): Promise<ResearchData | null> {
    try {
      const data = await getDb()('research_data')
        .where({ id })
        .first();
      
      if (!data) return null;
      
      return {
        id: data.id,
        sessionId: data.session_id,
        dataType: data.data_type,
        query: data.query,
        title: data.title,
        content: data.content,
        metadata: data.metadata || null,
        relevanceScore: data.relevance_score,
        createdAt: data.created_at
      };
    } catch (error) {
      logger.error('Error retrieving research data:', error);
      throw error;
    }
  }
  
  /**
   * Retrieve all research data for a session
   */
  async getSessionResearchData(
    sessionId: string, 
    dataType?: string,
    limit?: number
  ): Promise<ResearchData[]> {
    try {
      let query = getDb()('research_data')
        .where({ session_id: sessionId })
        .orderBy('relevance_score', 'desc')
        .orderBy('created_at', 'desc');
      
      if (dataType) {
        query = query.where({ data_type: dataType });
      }
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const data = await query;
      
      return data.map((item: any) => ({
        id: item.id,
        sessionId: item.session_id,
        dataType: item.data_type,
        query: item.query,
        title: item.title,
        content: item.content,
        metadata: item.metadata || null,
        relevanceScore: item.relevance_score,
        createdAt: item.created_at
      }));
    } catch (error) {
      logger.error('Error retrieving session research data:', error);
      throw error;
    }
  }
  
  /**
   * Store a research query plan
   */
  async storeResearchQuery(query: ResearchQuery): Promise<string> {
    try {
      const id = query.id || uuidv4();
      
      await getDb()('research_queries').insert({
        id,
        session_id: query.sessionId,
        query: query.query,
        status: query.status || 'pending',
        priority: query.priority || 0,
        results_summary: query.resultsSummary ? JSON.stringify(query.resultsSummary) : null
      });
      
      logger.info(`Stored research query: ${query.query} for session: ${query.sessionId}`);
      return id;
    } catch (error) {
      logger.error('Error storing research query:', error);
      throw error;
    }
  }
  
  /**
   * Get pending research queries for a session
   */
  async getPendingQueries(sessionId: string): Promise<ResearchQuery[]> {
    try {
      const queries = await getDb()('research_queries')
        .where({ 
          session_id: sessionId,
          status: 'pending'
        })
        .orderBy('priority', 'desc')
        .orderBy('created_at', 'asc');
      
      return queries.map((q: any) => ({
        id: q.id,
        sessionId: q.session_id,
        query: q.query,
        status: q.status,
        priority: q.priority,
        resultsSummary: q.results_summary ? JSON.parse(q.results_summary) : null,
        createdAt: q.created_at,
        processedAt: q.processed_at
      }));
    } catch (error) {
      logger.error('Error retrieving pending queries:', error);
      throw error;
    }
  }
  
  /**
   * Update query status
   */
  async updateQueryStatus(
    id: string, 
    status: 'processing' | 'completed' | 'failed',
    resultsSummary?: any
  ): Promise<void> {
    try {
      const update: any = { status };
      
      if (status === 'processing') {
        update.processed_at = getDb().fn.now();
      }
      
      if (resultsSummary) {
        update.results_summary = JSON.stringify(resultsSummary);
      }
      
      await getDb()('research_queries')
        .where({ id })
        .update(update);
      
      logger.info(`Updated query ${id} status to ${status}`);
    } catch (error) {
      logger.error('Error updating query status:', error);
      throw error;
    }
  }
  
  /**
   * Get a summary of research data for agents
   */
  async getResearchSummary(sessionId: string): Promise<{
    totalSources: number;
    searchQueries: string[];
    topSources: Array<{ title: string; url: string; relevance: number }>;
  }> {
    try {
      const searchResults = await this.getSessionResearchData(sessionId, 'search_results');
      const sourceContent = await this.getSessionResearchData(sessionId, 'source_content');
      
      const queries = [...new Set(searchResults.map(r => r.query).filter(Boolean) as string[])];
      
      const topSources = sourceContent
        .slice(0, 10)
        .map(s => ({
          title: s.title || 'Untitled',
          url: s.metadata?.url || '',
          relevance: s.relevanceScore || 0
        }));
      
      return {
        totalSources: sourceContent.length,
        searchQueries: queries,
        topSources
      };
    } catch (error) {
      logger.error('Error getting research summary:', error);
      throw error;
    }
  }
}