import { ResearchTeam } from './ResearchTeam';
import { SynthesisTeam } from './SynthesisTeam';
import { logger } from '../../utils/logger';
import { captureService } from '../../services/captureService';

/**
 * ResearchOrchestrator manages the entire research workflow by:
 * 1. Coordinating the Research and Synthesis teams
 * 2. Managing data flow between teams
 * 3. Handling error recovery
 * 4. Tracking progress
 */
export class ResearchOrchestrator {
  private researchTeam: ResearchTeam;
  private synthesisTeam: SynthesisTeam;

  constructor(config?: {
    model?: string;
    provider?: string;
    apiKey?: string;
  }) {
    // Use environment variables as defaults if no config provided
    const modelConfig = {
      model: config?.model || process.env.LLM_MODEL,
      provider: config?.provider || process.env.LLM_PROVIDER,
      apiKey: config?.apiKey || process.env.LLM_API_KEY
    };
    
    this.researchTeam = new ResearchTeam(modelConfig);
    this.synthesisTeam = new SynthesisTeam(modelConfig);
    
    logger.info(`ResearchOrchestrator initialized with model: ${modelConfig.model}, provider: ${modelConfig.provider}`);
  }

  /**
   * Execute the full research workflow
   */
  public async executeResearch(inputs: {
    topic: string;
    maxSources?: number;
    maxDepth?: number;
    reportFormat?: 'detailed' | 'summary' | 'academic' | 'business' | 'web';
    [key: string]: any;
  }): Promise<{
    status: string;
    report: any;
    stats: any;
    researchResults?: any;
  }> {
    try {
      logger.info(`Starting full research workflow for topic: "${inputs.topic}"`);
      
      // Step 1: Execute the research phase
      const researchOutput = await this.researchTeam.start({
        topic: inputs.topic,
        maxSources: inputs.maxSources || 10,
        maxDepth: inputs.maxDepth || 1
      });
      
      if (researchOutput.status !== 'FINISHED') {
        logger.error(`Research phase did not complete successfully: ${researchOutput.status}`);
        return {
          status: 'FAILED',
          report: null,
          stats: {
            researchStats: researchOutput.stats
          }
        };
      }
      
      // Step 2: Process research results to prepare for synthesis
      // This would include capturing screenshots using our captureService
      const researchResults = researchOutput.result;
      const processedResults = await this.processResearchResults(researchResults, inputs.topic);
      
      // Step 3: Execute the synthesis phase
      const synthesisOutput = await this.synthesisTeam.start({
        topic: inputs.topic,
        researchResults: processedResults,
        reportFormat: inputs.reportFormat || 'detailed'
      });
      
      if (synthesisOutput.status !== 'FINISHED') {
        logger.error(`Synthesis phase did not complete successfully: ${synthesisOutput.status}`);
        return {
          status: 'PARTIAL',
          report: null,
          stats: {
            researchStats: researchOutput.stats,
            synthesisStats: synthesisOutput.stats
          },
          researchResults: processedResults
        };
      }
      
      // Step 4: Return the combined results
      return {
        status: 'SUCCESS',
        report: synthesisOutput.result,
        stats: {
          researchStats: researchOutput.stats,
          synthesisStats: synthesisOutput.stats,
          totalDuration: researchOutput.stats.duration + synthesisOutput.stats.duration,
          totalCost: (researchOutput.stats.costDetails?.totalCost || 0) + 
                     (synthesisOutput.stats.costDetails?.totalCost || 0)
        },
        researchResults: processedResults
      };
      
    } catch (error) {
      logger.error(`Research workflow encountered an error: ${error}`);
      throw error;
    }
  }

  /**
   * Process research results to prepare for synthesis
   * This includes capturing screenshots and extracting metadata
   */
  private async processResearchResults(results: any, topic: string): Promise<any> {
    try {
      logger.info(`Processing research results for topic: "${topic}"`);
      
      // Extract URLs from research results
      // This would depend on the exact format of the research results
      const urls = this.extractUrls(results);
      
      if (urls.length === 0) {
        logger.warn('No URLs found in research results');
        return results;
      }
      
      // Capture screenshots for all URLs
      const captureResults = await captureService.captureFromSearch(topic, {
        capture: {
          fullPage: true,
          imageFormat: 'png',
          quality: 80
        },
        maxResults: urls.length
      });
      
      // Add screenshot IDs and metadata to the research results
      const processedResults = this.enrichResultsWithCaptureData(results, captureResults);
      
      return processedResults;
    } catch (error) {
      logger.error(`Failed to process research results: ${error}`);
      // Return original results if processing fails
      return results;
    }
  }

  /**
   * Extract URLs from research results
   * This is a simplified implementation that would depend on the actual format
   */
  private extractUrls(results: any): string[] {
    try {
      // Simple case: results is an array of objects with url property
      if (Array.isArray(results)) {
        return results
          .filter(item => item && typeof item === 'object' && typeof item.url === 'string')
          .map(item => item.url);
      }
      
      // More complex case: results has different structure
      // This would need to be tailored to the actual output format of the research phase
      const urls: string[] = [];
      
      // Check for queries property (common pattern in search results)
      if (results.queries && Array.isArray(results.queries)) {
        results.queries.forEach((query: any) => {
          if (query.results && Array.isArray(query.results)) {
            query.results.forEach((result: any) => {
              if (result && typeof result.url === 'string') {
                urls.push(result.url);
              }
            });
          }
        });
      }
      
      // Check for sources property (common pattern)
      if (results.sources && Array.isArray(results.sources)) {
        results.sources.forEach((source: any) => {
          if (source && typeof source.url === 'string') {
            urls.push(source.url);
          }
        });
      }
      
      return urls;
    } catch (error) {
      logger.error(`Failed to extract URLs from research results: ${error}`);
      return [];
    }
  }

  /**
   * Enrich research results with screenshot IDs and metadata
   */
  private enrichResultsWithCaptureData(results: any, captureResults: any): any {
    try {
      // Create a mapping of URL to screenshot ID
      const urlToScreenshotMap: Record<string, string> = {};
      const urlToMetadataMap: Record<string, any> = {};
      
      if (captureResults && captureResults.captures) {
        Object.entries(captureResults.captures).forEach(([captureId, capture]: [string, any]) => {
          if (capture && capture.metadata && capture.metadata.url) {
            urlToScreenshotMap[capture.metadata.url] = captureId;
            urlToMetadataMap[capture.metadata.url] = capture.metadata;
          }
        });
      }
      
      // Create a deep copy of results to avoid modifying the original
      const enrichedResults = JSON.parse(JSON.stringify(results));
      
      // Enrich the results based on structure
      if (Array.isArray(enrichedResults)) {
        enrichedResults.forEach((item: any) => {
          if (item && typeof item === 'object' && typeof item.url === 'string') {
            const url = item.url;
            if (urlToScreenshotMap[url]) {
              item.screenshotId = urlToScreenshotMap[url];
              item.metadata = urlToMetadataMap[url];
            }
          }
        });
      } else if (enrichedResults.queries && Array.isArray(enrichedResults.queries)) {
        enrichedResults.queries.forEach((query: any) => {
          if (query.results && Array.isArray(query.results)) {
            query.results.forEach((result: any) => {
              if (result && typeof result.url === 'string') {
                const url = result.url;
                if (urlToScreenshotMap[url]) {
                  result.screenshotId = urlToScreenshotMap[url];
                  result.metadata = urlToMetadataMap[url];
                }
              }
            });
          }
        });
      } else if (enrichedResults.sources && Array.isArray(enrichedResults.sources)) {
        enrichedResults.sources.forEach((source: any) => {
          if (source && typeof source.url === 'string') {
            const url = source.url;
            if (urlToScreenshotMap[url]) {
              source.screenshotId = urlToScreenshotMap[url];
              source.metadata = urlToMetadataMap[url];
            }
          }
        });
      }
      
      // Add capture batch ID for reference
      enrichedResults.captureBatchId = captureResults.id;
      
      return enrichedResults;
    } catch (error) {
      logger.error(`Failed to enrich results with capture data: ${error}`);
      return results; // Return original if enrichment fails
    }
  }
}