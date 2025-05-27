import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import axios from 'axios';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { ContentExtractionService } from '../../services/ContentExtractionService';
import { SummarizationService } from '../../services/SummarizationService';

const searchToolSchema = z.object({
  query: z.string().describe('The search query'),
  maxResults: z.number()
    .optional()
    .default(10)
    .describe('Maximum number of results to return'),
  language: z.string()
    .optional()
    .default('en')
    .describe('Language for search results'),
  timeRange: z.string()
    .optional()
    .default('')
    .describe('Time range for results (e.g., "day", "week", "month", "year")'),
  extractContent: z.boolean()
    .optional()
    .default(true)
    .describe('Whether to extract and summarize content from each result')
});

export class SearchTool extends StructuredTool<typeof searchToolSchema> {
  name = 'search_tool';
  description = 'Search for information using the configured searXNG instance, extract content from pages, and provide AI-generated summaries';
  schema = searchToolSchema;
  private contentExtractor: ContentExtractionService;
  private summarizer: SummarizationService;

  constructor() {
    super();
    this.contentExtractor = ContentExtractionService.getInstance();
    this.summarizer = SummarizationService.getInstance();
  }

  async _call(input: z.infer<typeof searchToolSchema>): Promise<string> {
    const result = await this.performSearch(input);
    logger.info(`Search tool returning ${result.totalResults} results for query: ${input.query}`);
    logger.debug('Search tool result preview:', JSON.stringify({
      query: result.query,
      totalResults: result.totalResults,
      firstResult: result.results[0] ? {
        url: result.results[0].url,
        title: result.results[0].title,
        hasExtractedContent: !!result.results[0].extractedContent
      } : null
    }, null, 2));
    return JSON.stringify(result);
  }

  private async performSearch(params: z.infer<typeof searchToolSchema>): Promise<any> {
    const { query, maxResults = 10, language = 'en', timeRange = '', extractContent = true } = params;
    
    try {
      logger.info(`Performing search for: ${query}`);
      
      const searchParams = new URLSearchParams({
        q: query,
        format: 'json',
        language,
        pageno: '1',
        safesearch: '0'
      });
      
      if (timeRange) {
        searchParams.append('time_range', timeRange);
      }
      
      const response = await axios.get(`${config.searxng.endpoint}/search`, {
        params: searchParams,
        headers: {
          'Accept': 'application/json'
        },
        timeout: 30000
      });
      
      const searchResults = response.data.results.slice(0, maxResults);
      
      logger.info(`Search returned ${searchResults.length} results`);
      
      // Process results - either with content extraction or without
      let processedResults;
      
      if (extractContent) {
        processedResults = await this.extractAndSummarizeResults(searchResults, query);
      } else {
        processedResults = searchResults.map((result: any) => ({
          url: result.url,
          title: result.title,
          snippet: result.content,
          engine: result.engine,
          score: result.score || 0
        }));
      }
      
      return {
        query,
        totalResults: processedResults.length,
        contentExtracted: extractContent,
        results: processedResults
      };
    } catch (error) {
      logger.error('Search error:', error);
      throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async extractAndSummarizeResults(searchResults: any[], query: string): Promise<any[]> {
    const processedResults = [];
    
    for (const result of searchResults) {
      try {
        // Extract content from the URL
        const extractedContent = await this.contentExtractor.extractContent(result.url);
        
        if (extractedContent.error) {
          // If extraction failed, use the search snippet
          processedResults.push({
            url: result.url,
            title: result.title,
            snippet: result.content,
            engine: result.engine,
            score: result.score || 0,
            contentExtractionError: extractedContent.error
          });
          continue;
        }
        
        // Summarize the extracted content
        const summary = await this.summarizer.summarizeContent(
          extractedContent.content,
          extractedContent.title || result.title,
          result.url,
          query
        );
        
        processedResults.push({
          url: result.url,
          title: extractedContent.title || result.title,
          snippet: result.content, // Original search snippet
          engine: result.engine,
          score: result.score || 0,
          extractedContent: {
            fullText: extractedContent.content.substring(0, 500) + '...', // Truncated for response size
            textLength: extractedContent.textLength,
            summary: summary.summary,
            keyPoints: summary.keyPoints,
            relevanceScore: summary.relevance
          }
        });
        
      } catch (error) {
        // Handle error logging properly to avoid circular structure issues
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Error processing result ${result.url}: ${errorMessage}`);
        
        // Include the result with error info
        processedResults.push({
          url: result.url,
          title: result.title,
          snippet: result.content,
          engine: result.engine,
          score: result.score || 0,
          processingError: errorMessage
        });
      }
    }
    
    // Sort by relevance score if available
    return processedResults.sort((a, b) => {
      const scoreA = a.extractedContent?.relevanceScore || a.score || 0;
      const scoreB = b.extractedContent?.relevanceScore || b.score || 0;
      return scoreB - scoreA;
    });
  }
}