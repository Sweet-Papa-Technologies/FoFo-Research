"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.browserService = void 0;
const puppeteer_1 = __importDefault(require("puppeteer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../utils/errorHandler");
/**
 * Service for managing headless browser operations
 */
class BrowserService {
    constructor() {
        this.browser = null;
        this.defaultBrowserOptions = {
            headless: true,
            timeout: 30000, // 30 seconds
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            viewport: {
                width: 1366,
                height: 768
            }
        };
        this.defaultNavigationOptions = {
            timeout: 30000, // 30 seconds
            waitUntil: ['load', 'networkidle2'],
            retries: 3,
            retryDelay: 1000 // 1 second
        };
        this.defaultScreenshotOptions = {
            fullPage: true,
            type: 'png',
            optimizeForSpeed: false
        };
        this.screenshotsDir = path_1.default.join(process.cwd(), 'data', 'screenshots');
        // Create screenshots directory if it doesn't exist
        fs_1.default.mkdirSync(this.screenshotsDir, { recursive: true });
    }
    /**
     * Initialize browser instance
     */
    async initialize(options = {}) {
        try {
            if (this.browser) {
                await this.close();
            }
            const browserOptions = { ...this.defaultBrowserOptions, ...options };
            logger_1.logger.info('Initializing headless browser...');
            this.browser = await puppeteer_1.default.launch({
                headless: browserOptions.headless,
                slowMo: browserOptions.slowMo,
                timeout: browserOptions.timeout,
                defaultViewport: browserOptions.viewport,
                args: [
                    '--disable-gpu',
                    '--disable-dev-shm-usage',
                    '--disable-setuid-sandbox',
                    '--no-sandbox',
                    '--no-zygote'
                ]
            });
            logger_1.logger.info('Headless browser initialized');
            return this.browser;
        }
        catch (error) {
            logger_1.logger.error(`Failed to initialize browser: ${error}`);
            throw new errorHandler_1.AppError('Failed to initialize browser', 500);
        }
    }
    /**
     * Close browser instance
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            logger_1.logger.info('Browser closed');
        }
    }
    /**
     * Create a new page in the browser
     */
    async createPage() {
        if (!this.browser) {
            await this.initialize();
        }
        if (!this.browser) {
            throw new errorHandler_1.AppError('Browser not initialized', 500);
        }
        const page = await this.browser.newPage();
        await page.setUserAgent(this.defaultBrowserOptions.userAgent || '');
        if (this.defaultBrowserOptions.viewport) {
            await page.setViewport(this.defaultBrowserOptions.viewport);
        }
        // Set up request interception to block unnecessary resources
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            const resourceType = request.resourceType();
            if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                request.continue();
            }
            else {
                request.continue();
            }
        });
        return page;
    }
    /**
     * Navigate to a URL with retry logic
     */
    async navigateToUrl(page, url, options = {}) {
        const navigationOptions = { ...this.defaultNavigationOptions, ...options };
        const { retries, retryDelay, ...puppeteerOptions } = navigationOptions;
        let attempt = 0;
        let lastError = null;
        while (attempt < (retries || 1)) {
            try {
                const startTime = Date.now();
                await page.goto(url, puppeteerOptions);
                const loadTime = Date.now() - startTime;
                logger_1.logger.info(`Navigated to ${url} in ${loadTime}ms (attempt ${attempt + 1})`);
                return;
            }
            catch (error) {
                lastError = error;
                logger_1.logger.warn(`Navigation failed (attempt ${attempt + 1}): ${error}`);
                attempt++;
                if (attempt < (retries || 1) && retryDelay) {
                    await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
            }
        }
        logger_1.logger.error(`All navigation attempts failed for ${url}`);
        throw lastError || new errorHandler_1.AppError(`Failed to navigate to ${url}`, 500);
    }
    /**
     * Capture a screenshot of a page
     */
    async captureScreenshot(page, options = {}) {
        const screenshotOptions = { ...this.defaultScreenshotOptions, ...options };
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        // Generate a unique filename if path is not provided
        if (!screenshotOptions.path) {
            const urlPath = await page.evaluate(() => window.location.pathname);
            const sanitizedPath = urlPath.replace(/[^a-z0-9]/gi, '_').slice(0, 20);
            const filename = `${timestamp}_${sanitizedPath}.${screenshotOptions.type || 'png'}`;
            screenshotOptions.path = path_1.default.join(this.screenshotsDir, filename);
        }
        try {
            // Optimize for speed if needed
            if (screenshotOptions.optimizeForSpeed) {
                await page.evaluate(() => {
                    window.scrollTo(0, 0);
                    return Promise.resolve();
                });
            }
            // Take the screenshot
            await page.screenshot({
                path: screenshotOptions.path,
                fullPage: screenshotOptions.fullPage,
                type: screenshotOptions.type,
                quality: screenshotOptions.type === 'jpeg' ? screenshotOptions.quality : undefined
            });
            logger_1.logger.info(`Screenshot captured: ${screenshotOptions.path}`);
            return screenshotOptions.path;
        }
        catch (error) {
            logger_1.logger.error(`Screenshot capture failed: ${error}`);
            throw new errorHandler_1.AppError('Failed to capture screenshot', 500);
        }
    }
    /**
     * Extract metadata from a page
     */
    async extractPageMetadata(page, screenshotPath) {
        try {
            const url = page.url();
            // Extract basic metadata
            const extractedData = await page.evaluate(() => {
                // Basic page information
                const title = document.title || '';
                const metaDesc = document.querySelector('meta[name="description"]');
                const description = metaDesc ? metaDesc.getAttribute('content') || '' : '';
                // Get main text content, cleaned up a bit
                const bodyText = document.body.innerText
                    .replace(/\\s+/g, ' ')
                    .trim()
                    .slice(0, 10000); // Limit to reasonable size
                // Count elements
                const imageCount = document.querySelectorAll('img').length;
                const linkCount = document.querySelectorAll('a').length;
                const tableCount = document.querySelectorAll('table').length;
                const formCount = document.querySelectorAll('form').length;
                // Extract author information
                let author = '';
                const authorMeta = document.querySelector('meta[name="author"]');
                if (authorMeta) {
                    author = authorMeta.getAttribute('content') || '';
                }
                else {
                    // Look for common author markup patterns
                    const authorElements = [
                        ...document.querySelectorAll('[class*="author"],[rel="author"],[itemprop="author"]'),
                        ...document.querySelectorAll('a[href*="author"]')
                    ];
                    if (authorElements.length > 0) {
                        // Take the shortest non-empty author text as it's likely the most precise
                        author = authorElements
                            .map(el => el.textContent?.trim())
                            .filter(text => text && text.length > 0 && text.length < 100)
                            .sort((a, b) => (a?.length || 0) - (b?.length || 0))[0] || '';
                    }
                }
                // Extract publish date
                let publishDate = '';
                // Try meta tags first
                const dateMeta = document.querySelector('meta[property="article:published_time"], meta[name="date"]');
                if (dateMeta) {
                    publishDate = dateMeta.getAttribute('content') || '';
                }
                // Then try time elements
                if (!publishDate) {
                    const timeElements = document.querySelectorAll('time');
                    if (timeElements.length > 0) {
                        publishDate = timeElements[0].getAttribute('datetime') || timeElements[0].textContent || '';
                    }
                }
                // Then try common class/element patterns
                if (!publishDate) {
                    const dateElements = document.querySelectorAll('[class*="date"], [class*="time"], [itemprop="datePublished"]');
                    if (dateElements.length > 0) {
                        publishDate = dateElements[0].textContent?.trim() || '';
                    }
                }
                // Extract keywords
                let keywords = [];
                const keywordsMeta = document.querySelector('meta[name="keywords"]');
                if (keywordsMeta) {
                    const keywordsStr = keywordsMeta.getAttribute('content') || '';
                    keywords = keywordsStr.split(',').map(k => k.trim()).filter(Boolean);
                }
                // Check for possible paywalls
                const hasPaywall = Boolean(document.querySelector('[class*="paywall"], [class*="subscribe"], [class*="premium"]') ||
                    document.body.innerHTML.includes('subscribe') ||
                    document.body.innerHTML.includes('subscription'));
                // Get viewport dimensions
                const viewportWidth = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
                const viewportHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
                // Get domain
                const domain = window.location.hostname;
                return {
                    title,
                    description,
                    textContent: bodyText,
                    imageCount,
                    linkCount,
                    tableCount,
                    formCount,
                    author,
                    publishDate,
                    keywords,
                    hasPaywall,
                    viewportWidth,
                    viewportHeight,
                    domain
                };
            });
            // Extract performance data
            const loadTime = await page.evaluate(() => {
                return window.performance ?
                    window.performance.timing.loadEventEnd - window.performance.timing.navigationStart :
                    0;
            });
            // Combine all extracted data
            return {
                url,
                loadTime,
                captureTime: new Date(),
                screenshotPath,
                ...extractedData
            };
        }
        catch (error) {
            logger_1.logger.error(`Metadata extraction failed: ${error}`);
            throw new errorHandler_1.AppError('Failed to extract page metadata', 500);
        }
    }
    /**
     * Capture a website screenshot and metadata
     * @param url URL to capture
     * @param options Screenshot and navigation options
     * @returns Page metadata including screenshot path
     */
    async captureWebsite(url, options = {}) {
        let page = null;
        try {
            page = await this.createPage();
            // Navigate to the URL
            await this.navigateToUrl(page, url, options.navigation);
            // Wait a bit for dynamic content to load
            await page.waitForTimeout(1000);
            // Capture screenshot
            const screenshotPath = await this.captureScreenshot(page, options.screenshot);
            // Extract metadata
            const metadata = await this.extractPageMetadata(page, screenshotPath);
            // Close the page
            await page.close();
            return metadata;
        }
        catch (error) {
            if (page) {
                await page.close().catch(() => { });
            }
            logger_1.logger.error(`Website capture failed for ${url}: ${error}`);
            throw new errorHandler_1.AppError(`Failed to capture website ${url}`, 500);
        }
    }
    /**
     * Capture multiple websites in parallel
     * @param urls URLs to capture
     * @param options Screenshot and navigation options
     * @param concurrency Maximum number of concurrent captures
     * @returns Array of page metadata
     */
    async captureMultipleWebsites(urls, options = {}, concurrency = 5) {
        // Process URLs in batches to control concurrency
        const results = [];
        // Clone the array to avoid modifying the original
        const urlsToProcess = [...urls];
        while (urlsToProcess.length > 0) {
            const batch = urlsToProcess.splice(0, concurrency);
            logger_1.logger.info(`Processing batch of ${batch.length} URLs (${urlsToProcess.length} remaining)`);
            const batchPromises = batch.map(url => this.captureWebsite(url, options)
                .catch(error => {
                logger_1.logger.error(`Failed to process ${url}: ${error}`);
                return null;
            }));
            const batchResults = await Promise.all(batchPromises);
            // Filter out null results (failed captures)
            results.push(...batchResults.filter(Boolean));
        }
        return results;
    }
    /**
     * Extract links from a page
     * @param url URL to extract links from
     * @param maxLinks Maximum number of links to extract
     * @returns Array of extracted links
     */
    async extractLinks(url, maxLinks = 10) {
        let page = null;
        try {
            page = await this.createPage();
            await this.navigateToUrl(page, url);
            // Extract links from the page
            const links = await page.evaluate((max) => {
                const anchors = Array.from(document.querySelectorAll('a'));
                const uniqueLinks = new Set();
                anchors.forEach(anchor => {
                    const href = anchor.href;
                    if (href && href.startsWith('http') && !href.includes('#')) {
                        uniqueLinks.add(href);
                    }
                });
                return Array.from(uniqueLinks).slice(0, max);
            }, maxLinks);
            await page.close();
            logger_1.logger.info(`Extracted ${links.length} links from ${url}`);
            return links;
        }
        catch (error) {
            if (page) {
                await page.close().catch(() => { });
            }
            logger_1.logger.error(`Link extraction failed for ${url}: ${error}`);
            throw new errorHandler_1.AppError(`Failed to extract links from ${url}`, 500);
        }
    }
}
exports.browserService = new BrowserService();
