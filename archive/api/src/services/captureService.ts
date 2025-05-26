import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errorHandler';
import { browserService, PageMetadata, NavigationOptions, ScreenshotOptions } from './browserService';
import { searchService, SearchResult } from './searchService';

interface CaptureResult {
  id: string;
  metadata: PageMetadata;
  captureTime: Date;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
}

interface CaptureOptions {
  fullPage?: boolean;
  quality?: number;
  imageFormat?: 'png' | 'jpeg';
  maxConcurrentCaptures?: number;
  navigationOptions?: NavigationOptions;
  screenshotOptions?: ScreenshotOptions;
}

interface CaptureBatchResult {
  id: string;
  topic: string;
  query: string;
  startTime: Date;
  endTime?: Date;
  totalUrls: number;
  processedUrls: number;
  successfulCaptures: number;
  failedCaptures: number;
  captures: Record<string, CaptureResult>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * Service for managing web content captures
 */
class CaptureService {
  private storageDir: string;
  private capturesDir: string;
  private batchesDir: string;
  
  // Store active batches in memory (would be persisted to a database in production)
  private activeBatches: Record<string, CaptureBatchResult> = {};
  
  constructor() {
    this.storageDir = path.join(process.cwd(), 'data');
    this.capturesDir = path.join(this.storageDir, 'captures');
    this.batchesDir = path.join(this.storageDir, 'batches');
    
    // Create directories if they don't exist
    fs.mkdirSync(this.capturesDir, { recursive: true });
    fs.mkdirSync(this.batchesDir, { recursive: true });
  }
  
  /**
   * Create a new directory for a capture batch
   */
  private createBatchDirectory(batchId: string): string {
    const batchDir = path.join(this.batchesDir, batchId);
    fs.mkdirSync(batchDir, { recursive: true });
    return batchDir;
  }
  
  /**
   * Save a batch result to disk
   */
  private saveBatchResult(batch: CaptureBatchResult): void {
    const batchFile = path.join(this.batchesDir, `${batch.id}.json`);
    fs.writeFileSync(batchFile, JSON.stringify(batch, null, 2));
  }
  
  /**
   * Capture a single URL and save metadata
   */
  public async captureUrl(url: string, options: CaptureOptions = {}): Promise<CaptureResult> {
    const captureId = uuidv4();
    const captureTime = new Date();
    
    logger.info(`Starting capture ${captureId} for URL: ${url}`);
    
    const captureResult: CaptureResult = {
      id: captureId,
      metadata: {} as PageMetadata,
      captureTime,
      processingStatus: 'pending'
    };
    
    try {
      // Set processing status
      captureResult.processingStatus = 'processing';
      
      // Create screenshot directory within the capture directory
      const captureDir = path.join(this.capturesDir, captureId);
      fs.mkdirSync(captureDir, { recursive: true });
      
      // Configure screenshot options
      const screenshotOptions: ScreenshotOptions = {
        ...options.screenshotOptions,
        fullPage: options.fullPage !== undefined ? options.fullPage : true,
        quality: options.quality,
        type: options.imageFormat,
        path: path.join(captureDir, `screenshot.${options.imageFormat || 'png'}`)
      };
      
      // Capture the website
      captureResult.metadata = await browserService.captureWebsite(url, {
        navigation: options.navigationOptions,
        screenshot: screenshotOptions
      });
      
      // Update status
      captureResult.processingStatus = 'completed';
      
      // Save metadata to capture directory
      fs.writeFileSync(
        path.join(captureDir, 'metadata.json'),
        JSON.stringify(captureResult, null, 2)
      );
      
      logger.info(`Capture ${captureId} completed successfully`);
      return captureResult;
      
    } catch (error) {
      captureResult.processingStatus = 'failed';
      captureResult.error = error instanceof Error ? error.message : String(error);
      
      logger.error(`Capture ${captureId} failed: ${captureResult.error}`);
      
      // Still save metadata to capture directory to track the failure
      const captureDir = path.join(this.capturesDir, captureId);
      fs.mkdirSync(captureDir, { recursive: true });
      fs.writeFileSync(
        path.join(captureDir, 'metadata.json'),
        JSON.stringify(captureResult, null, 2)
      );
      
      return captureResult;
    }
  }
  
  /**
   * Capture multiple URLs in parallel
   */
  public async captureUrls(
    urls: string[],
    options: CaptureOptions = {}
  ): Promise<CaptureResult[]> {
    logger.info(`Starting batch capture for ${urls.length} URLs`);
    
    const maxConcurrent = options.maxConcurrentCaptures || 5;
    const results: CaptureResult[] = [];
    
    // Process URLs in batches to control concurrency
    const urlsToProcess = [...urls];
    
    while (urlsToProcess.length > 0) {
      const batch = urlsToProcess.splice(0, maxConcurrent);
      
      logger.info(`Processing batch of ${batch.length} URLs (${urlsToProcess.length} remaining)`);
      
      const batchPromises = batch.map(url => 
        this.captureUrl(url, options)
          .catch(error => {
            logger.error(`Failed to process ${url}: ${error}`);
            
            // Return a failed result instead of throwing
            const captureId = uuidv4();
            return {
              id: captureId,
              metadata: { url } as PageMetadata,
              captureTime: new Date(),
              processingStatus: 'failed' as const,
              error: error instanceof Error ? error.message : String(error)
            };
          })
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    logger.info(`Batch capture completed. Success: ${results.filter(r => r.processingStatus === 'completed').length}, Failed: ${results.filter(r => r.processingStatus === 'failed').length}`);
    
    return results;
  }
  
  /**
   * Capture URLs from search results
   */
  public async captureFromSearch(
    query: string,
    options: {
      capture?: CaptureOptions;
      maxResults?: number;
      topic?: string;
    } = {}
  ): Promise<CaptureBatchResult> {
    const batchId = uuidv4();
    const topic = options.topic || query;
    const startTime = new Date();
    
    logger.info(`Starting search-based capture batch ${batchId} for query: "${query}"`);
    
    // Create batch result
    const batchResult: CaptureBatchResult = {
      id: batchId,
      topic,
      query,
      startTime,
      totalUrls: 0,
      processedUrls: 0,
      successfulCaptures: 0,
      failedCaptures: 0,
      captures: {},
      status: 'pending'
    };
    
    // Create batch directory
    this.createBatchDirectory(batchId);
    
    try {
      // Update status
      batchResult.status = 'processing';
      
      // Perform search
      const searchResults = await searchService.search(query, {
        maxResults: options.maxResults || 10
      });
      
      // Extract URLs
      const urls = searchResults.map(result => result.url);
      batchResult.totalUrls = urls.length;
      
      // Save the batch in memory
      this.activeBatches[batchId] = batchResult;
      
      // Start capturing screenshots
      const captureResults = await this.captureUrls(urls, options.capture);
      
      // Update batch with results
      batchResult.processedUrls = captureResults.length;
      batchResult.successfulCaptures = captureResults.filter(r => r.processingStatus === 'completed').length;
      batchResult.failedCaptures = captureResults.filter(r => r.processingStatus === 'failed').length;
      
      // Associate search results with captures
      captureResults.forEach((result, index) => {
        batchResult.captures[result.id] = result;
      });
      
      // Finalize batch
      batchResult.status = 'completed';
      batchResult.endTime = new Date();
      
      // Save batch to disk
      this.saveBatchResult(batchResult);
      
      logger.info(`Batch ${batchId} completed successfully`);
      return batchResult;
      
    } catch (error) {
      batchResult.status = 'failed';
      batchResult.endTime = new Date();
      
      logger.error(`Batch ${batchId} failed: ${error}`);
      
      // Save failed batch to disk
      this.saveBatchResult(batchResult);
      
      throw new AppError(`Failed to process capture batch: ${error}`, 500);
    }
  }
  
  /**
   * Get a capture batch by ID
   */
  public getBatch(batchId: string): CaptureBatchResult | null {
    // Check in-memory cache first
    if (this.activeBatches[batchId]) {
      return this.activeBatches[batchId];
    }
    
    // Try to load from disk
    const batchFile = path.join(this.batchesDir, `${batchId}.json`);
    
    if (fs.existsSync(batchFile)) {
      try {
        const batch = JSON.parse(fs.readFileSync(batchFile, 'utf8')) as CaptureBatchResult;
        return batch;
      } catch (error) {
        logger.error(`Failed to load batch ${batchId}: ${error}`);
        return null;
      }
    }
    
    return null;
  }
  
  /**
   * Get a capture by ID
   */
  public getCapture(captureId: string): CaptureResult | null {
    const captureDir = path.join(this.capturesDir, captureId);
    const metadataFile = path.join(captureDir, 'metadata.json');
    
    if (fs.existsSync(metadataFile)) {
      try {
        const capture = JSON.parse(fs.readFileSync(metadataFile, 'utf8')) as CaptureResult;
        return capture;
      } catch (error) {
        logger.error(`Failed to load capture ${captureId}: ${error}`);
        return null;
      }
    }
    
    return null;
  }
  
  /**
   * Get screenshot file path for a capture
   */
  public getScreenshotPath(captureId: string): string | null {
    const capture = this.getCapture(captureId);
    
    if (capture?.metadata?.screenshotPath) {
      if (fs.existsSync(capture.metadata.screenshotPath)) {
        return capture.metadata.screenshotPath;
      }
    }
    
    return null;
  }
  
  /**
   * Get screenshot data for analysis
   */
  public async getScreenshot(screenshotId: string): Promise<CaptureResult | null> {
    return this.getCapture(screenshotId);
  }
  
  /**
   * Extract text from a screenshot
   */
  public async extractText(screenshotId: string): Promise<{ text: string; } | null> {
    logger.info(`Extracting text from screenshot ${screenshotId}`);
    const capture = this.getCapture(screenshotId);
    
    if (!capture) {
      logger.error(`Screenshot ${screenshotId} not found`);
      return null;
    }
    
    // For now, return the page's text content or title as extracted by Puppeteer
    // In a production system, this would use OCR or LLM vision capabilities
    return {
      text: capture.metadata.textContent || 
            capture.metadata.title || 
            'No text content available'
    };
  }
  
  /**
   * Get metadata for a screenshot
   */
  public async getMetadata(screenshotId: string): Promise<PageMetadata | null> {
    const capture = this.getCapture(screenshotId);
    
    if (!capture) {
      logger.error(`Screenshot ${screenshotId} not found`);
      return null;
    }
    
    return capture.metadata;
  }
  
  /**
   * Analyze visual elements in a screenshot
   */
  public async analyzeVisualElements(screenshotId: string): Promise<any> {
    logger.info(`Analyzing visual elements in screenshot ${screenshotId}`);
    const capture = this.getCapture(screenshotId);
    
    if (!capture) {
      logger.error(`Screenshot ${screenshotId} not found`);
      return null;
    }
    
    // In a production system, this would use computer vision or LLM vision capabilities
    // For now, return a basic analysis based on metadata
    return {
      pageTitle: capture.metadata.title,
      elements: {
        images: capture.metadata.imageCount || 0,
        links: capture.metadata.linkCount || 0,
        tables: capture.metadata.tableCount || 0,
        forms: capture.metadata.formCount || 0
      },
      dimensions: {
        width: capture.metadata.viewportWidth,
        height: capture.metadata.viewportHeight
      },
      screenshotPath: capture.metadata.screenshotPath
    };
  }
  
  /**
   * List all capture batches
   */
  public listBatches(): CaptureBatchResult[] {
    const batchFiles = fs.readdirSync(this.batchesDir)
      .filter(file => file.endsWith('.json'));
    
    const batches: CaptureBatchResult[] = [];
    
    for (const file of batchFiles) {
      try {
        const batchFile = path.join(this.batchesDir, file);
        const batch = JSON.parse(fs.readFileSync(batchFile, 'utf8')) as CaptureBatchResult;
        batches.push(batch);
      } catch (error) {
        logger.error(`Failed to load batch file ${file}: ${error}`);
      }
    }
    
    return batches;
  }
}

export const captureService = new CaptureService();
export { CaptureResult, CaptureBatchResult, CaptureOptions };