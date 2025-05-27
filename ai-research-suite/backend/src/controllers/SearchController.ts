import { Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { SearchTool } from '../orchestration/tools/SearchTool';
import { getDb } from '../utils/database';
import { AuthRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

export class SearchController {
  private searchTool: SearchTool;
  
  constructor() {
    this.searchTool = new SearchTool();
  }
  
  private get db() {
    return getDb();
  }
  
  async search(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { query, maxResults = 51, filters, maxSources = 50 } = req.body;
      const userId = req.user?.id;
      const maxSourcesNum = maxResults === 51 ? maxSources : maxResults;
      logger.info(`Performing search: ${query}`);
      
      // Perform the search using KaibanJS SearchTool
      const searchParams = {
        query,
        maxResults: Math.min(maxSourcesNum, 50), // Limit max results
        language: filters?.language || 'en',
        timeRange: filters?.timeRange || '',
        extractContent: filters?.extractContent !== false // Default to true
      };
      
      const searchResult = await this.searchTool._call(searchParams);
      const parsedResult = JSON.parse(searchResult);
      
      // Save search to history if user is authenticated
      if (userId) {
        await this.saveSearchHistory(userId, query, parsedResult);
      }
      
      res.json({
        success: true,
        data: parsedResult
      });
    } catch (error) {
      logger.error('Search error:', error);
      next(error);
    }
  }
  
  async getSearchHistory(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const { limit = 20, offset = 0 } = req.query;
      
      if (!userId) {
        res.json({
          success: true,
          data: {
            history: []
          }
        });
        return;
      }
      
      const history = await this.db('search_history')
        .where('user_id', userId)
        .orderBy('searched_at', 'desc')
        .limit(Number(limit))
        .offset(Number(offset))
        .select('id', 'query', 'result_count', 'searched_at');
      
      res.json({
        success: true,
        data: {
          history: history.map(item => ({
            id: item.id,
            query: item.query,
            resultsCount: item.result_count,
            searchedAt: item.searched_at
          }))
        }
      });
    } catch (error) {
      logger.error('Failed to retrieve search history:', error);
      next(error);
    }
  }
  
  private async saveSearchHistory(
    userId: string, 
    query: string, 
    results: any
  ): Promise<void> {
    try {
      await this.db('search_history').insert({
        id: uuidv4(),
        user_id: userId,
        query,
        result_count: results.totalResults || 0,
        filters: {}, // Could be extended to save actual filters
        searched_at: new Date()
      });
    } catch (error) {
      logger.error('Failed to save search history:', error);
      // Don't throw - this is not critical
    }
  }
}