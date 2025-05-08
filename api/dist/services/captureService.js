"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.captureService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../utils/errorHandler");
const browserService_1 = require("./browserService");
const searchService_1 = require("./searchService");
/**
 * Service for managing web content captures
 */
class CaptureService {
    constructor() {
        // Store active batches in memory (would be persisted to a database in production)
        this.activeBatches = {};
        this.storageDir = path_1.default.join(process.cwd(), 'data');
        this.capturesDir = path_1.default.join(this.storageDir, 'captures');
        this.batchesDir = path_1.default.join(this.storageDir, 'batches');
        // Create directories if they don't exist
        fs_1.default.mkdirSync(this.capturesDir, { recursive: true });
        fs_1.default.mkdirSync(this.batchesDir, { recursive: true });
    }
    /**
     * Create a new directory for a capture batch
     */
    createBatchDirectory(batchId) {
        const batchDir = path_1.default.join(this.batchesDir, batchId);
        fs_1.default.mkdirSync(batchDir, { recursive: true });
        return batchDir;
    }
    /**
     * Save a batch result to disk
     */
    saveBatchResult(batch) {
        const batchFile = path_1.default.join(this.batchesDir, `${batch.id}.json`);
        fs_1.default.writeFileSync(batchFile, JSON.stringify(batch, null, 2));
    }
    /**
     * Capture a single URL and save metadata
     */
    async captureUrl(url, options = {}) {
        const captureId = (0, uuid_1.v4)();
        const captureTime = new Date();
        logger_1.logger.info(`Starting capture ${captureId} for URL: ${url}`);
        const captureResult = {
            id: captureId,
            metadata: {},
            captureTime,
            processingStatus: 'pending'
        };
        try {
            // Set processing status
            captureResult.processingStatus = 'processing';
            // Create screenshot directory within the capture directory
            const captureDir = path_1.default.join(this.capturesDir, captureId);
            fs_1.default.mkdirSync(captureDir, { recursive: true });
            // Configure screenshot options
            const screenshotOptions = {
                ...options.screenshotOptions,
                fullPage: options.fullPage !== undefined ? options.fullPage : true,
                quality: options.quality,
                type: options.imageFormat,
                path: path_1.default.join(captureDir, `screenshot.${options.imageFormat || 'png'}`)
            };
            // Capture the website
            captureResult.metadata = await browserService_1.browserService.captureWebsite(url, {
                navigation: options.navigationOptions,
                screenshot: screenshotOptions
            });
            // Update status
            captureResult.processingStatus = 'completed';
            // Save metadata to capture directory
            fs_1.default.writeFileSync(path_1.default.join(captureDir, 'metadata.json'), JSON.stringify(captureResult, null, 2));
            logger_1.logger.info(`Capture ${captureId} completed successfully`);
            return captureResult;
        }
        catch (error) {
            captureResult.processingStatus = 'failed';
            captureResult.error = error instanceof Error ? error.message : String(error);
            logger_1.logger.error(`Capture ${captureId} failed: ${captureResult.error}`);
            // Still save metadata to capture directory to track the failure
            const captureDir = path_1.default.join(this.capturesDir, captureId);
            fs_1.default.mkdirSync(captureDir, { recursive: true });
            fs_1.default.writeFileSync(path_1.default.join(captureDir, 'metadata.json'), JSON.stringify(captureResult, null, 2));
            return captureResult;
        }
    }
    /**
     * Capture multiple URLs in parallel
     */
    async captureUrls(urls, options = {}) {
        logger_1.logger.info(`Starting batch capture for ${urls.length} URLs`);
        const maxConcurrent = options.maxConcurrentCaptures || 5;
        const results = [];
        // Process URLs in batches to control concurrency
        const urlsToProcess = [...urls];
        while (urlsToProcess.length > 0) {
            const batch = urlsToProcess.splice(0, maxConcurrent);
            logger_1.logger.info(`Processing batch of ${batch.length} URLs (${urlsToProcess.length} remaining)`);
            const batchPromises = batch.map(url => this.captureUrl(url, options)
                .catch(error => {
                logger_1.logger.error(`Failed to process ${url}: ${error}`);
                // Return a failed result instead of throwing
                const captureId = (0, uuid_1.v4)();
                return {
                    id: captureId,
                    metadata: { url },
                    captureTime: new Date(),
                    processingStatus: 'failed',
                    error: error instanceof Error ? error.message : String(error)
                };
            }));
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }
        logger_1.logger.info(`Batch capture completed. Success: ${results.filter(r => r.processingStatus === 'completed').length}, Failed: ${results.filter(r => r.processingStatus === 'failed').length}`);
        return results;
    }
    /**
     * Capture URLs from search results
     */
    async captureFromSearch(query, options = {}) {
        const batchId = (0, uuid_1.v4)();
        const topic = options.topic || query;
        const startTime = new Date();
        logger_1.logger.info(`Starting search-based capture batch ${batchId} for query: "${query}"`);
        // Create batch result
        const batchResult = {
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
            const searchResults = await searchService_1.searchService.search(query, {
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
            logger_1.logger.info(`Batch ${batchId} completed successfully`);
            return batchResult;
        }
        catch (error) {
            batchResult.status = 'failed';
            batchResult.endTime = new Date();
            logger_1.logger.error(`Batch ${batchId} failed: ${error}`);
            // Save failed batch to disk
            this.saveBatchResult(batchResult);
            throw new errorHandler_1.AppError(`Failed to process capture batch: ${error}`, 500);
        }
    }
    /**
     * Get a capture batch by ID
     */
    getBatch(batchId) {
        // Check in-memory cache first
        if (this.activeBatches[batchId]) {
            return this.activeBatches[batchId];
        }
        // Try to load from disk
        const batchFile = path_1.default.join(this.batchesDir, `${batchId}.json`);
        if (fs_1.default.existsSync(batchFile)) {
            try {
                const batch = JSON.parse(fs_1.default.readFileSync(batchFile, 'utf8'));
                return batch;
            }
            catch (error) {
                logger_1.logger.error(`Failed to load batch ${batchId}: ${error}`);
                return null;
            }
        }
        return null;
    }
    /**
     * Get a capture by ID
     */
    getCapture(captureId) {
        const captureDir = path_1.default.join(this.capturesDir, captureId);
        const metadataFile = path_1.default.join(captureDir, 'metadata.json');
        if (fs_1.default.existsSync(metadataFile)) {
            try {
                const capture = JSON.parse(fs_1.default.readFileSync(metadataFile, 'utf8'));
                return capture;
            }
            catch (error) {
                logger_1.logger.error(`Failed to load capture ${captureId}: ${error}`);
                return null;
            }
        }
        return null;
    }
    /**
     * Get screenshot file path for a capture
     */
    getScreenshotPath(captureId) {
        const capture = this.getCapture(captureId);
        if (capture?.metadata?.screenshotPath) {
            if (fs_1.default.existsSync(capture.metadata.screenshotPath)) {
                return capture.metadata.screenshotPath;
            }
        }
        return null;
    }
    /**
     * Get screenshot data for analysis
     */
    async getScreenshot(screenshotId) {
        return this.getCapture(screenshotId);
    }
    /**
     * Extract text from a screenshot
     */
    async extractText(screenshotId) {
        logger_1.logger.info(`Extracting text from screenshot ${screenshotId}`);
        const capture = this.getCapture(screenshotId);
        if (!capture) {
            logger_1.logger.error(`Screenshot ${screenshotId} not found`);
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
    async getMetadata(screenshotId) {
        const capture = this.getCapture(screenshotId);
        if (!capture) {
            logger_1.logger.error(`Screenshot ${screenshotId} not found`);
            return null;
        }
        return capture.metadata;
    }
    /**
     * Analyze visual elements in a screenshot
     */
    async analyzeVisualElements(screenshotId) {
        logger_1.logger.info(`Analyzing visual elements in screenshot ${screenshotId}`);
        const capture = this.getCapture(screenshotId);
        if (!capture) {
            logger_1.logger.error(`Screenshot ${screenshotId} not found`);
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
    listBatches() {
        const batchFiles = fs_1.default.readdirSync(this.batchesDir)
            .filter(file => file.endsWith('.json'));
        const batches = [];
        for (const file of batchFiles) {
            try {
                const batchFile = path_1.default.join(this.batchesDir, file);
                const batch = JSON.parse(fs_1.default.readFileSync(batchFile, 'utf8'));
                batches.push(batch);
            }
            catch (error) {
                logger_1.logger.error(`Failed to load batch file ${file}: ${error}`);
            }
        }
        return batches;
    }
}
exports.captureService = new CaptureService();
