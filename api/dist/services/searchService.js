"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchService = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../utils/errorHandler");
const browserService_1 = require("./browserService");
const cheerio_1 = __importDefault(require("cheerio"));
/**
 * Service for handling web search operations
 */
class SearchService {
    async duckDuckGoSearch(query, options = {}) {
        try {
            // DuckDuckGo doesn't have an official API, so we're using their HTML search
            // and parsing the results. In a production app, you might want to use a more
            // reliable approach or a third-party API service.
            const safeSearch = options.safeSearch ? '1' : '-1';
            const region = options.region || 'wt-wt'; // Worldwide
            const maxResults = options.maxResults || 10;
            // Construct the search URL with parameters
            const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=${region}&kp=${safeSearch}`;
            logger_1.logger.info(`Performing DuckDuckGo search: "${query}"`);
            const response = await axios_1.default.get(searchUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml',
                    'Accept-Language': 'en-US,en;q=0.9'
                },
                timeout: 10000 // 10 seconds timeout
            });
            // Parse HTML response to extract search results
            const results = await this.parseSearchResults(response.data, maxResults);
            // Apply filters if provided
            const filteredResults = this.applyFilters(results, options.filters);
            logger_1.logger.info(`Found ${filteredResults.length} results for query: "${query}"`);
            logger_1.logger.info(`Filtered results: ${JSON.stringify(filteredResults)}`);
            return filteredResults;
        }
        catch (error) {
            logger_1.logger.error(`DuckDuckGo search failed: ${error}`);
            throw new errorHandler_1.AppError('Search operation failed', 500);
        }
    }
    /**
     * Parse search results from HTML content
     * This function can parse HTML directly or use Puppeteer for a more complete capture
     */
    async parseSearchResults(html, maxResults) {
        try {
            // First attempt to parse with cheerio for basic results
            let results = this.parseHtmlWithCheerio(html, maxResults);
            // If we don't have enough results, we might need to use puppeteer
            // for a more interactive approach (e.g., to handle JavaScript-based results)
            if (results.length < maxResults) {
                logger_1.logger.info(`Only found ${results.length} results with basic parsing, trying Puppeteer`);
                results = await this.parseWithPuppeteer(html, maxResults);
            }
            // Normalize and clean results
            const cleanResults = this.normalizeResults(results, maxResults);
            return cleanResults;
        }
        catch (error) {
            logger_1.logger.error(`Error parsing search results: ${error}`);
            // Fall back to mock results if parsing fails
            return this.getMockResults(maxResults);
        }
    }
    /**
     * Parse HTML using cheerio (static HTML parser)
     * This handles different search engine result formats
     */
    parseHtmlWithCheerio(html, maxResults) {
        const $ = cheerio_1.default.load(html);
        let results = [];
        // Try multiple parsing strategies for better robustness
        // Strategy 1: DuckDuckGo specific selectors
        results = this.parseDuckDuckGoResults($, maxResults);
        // If we don't have enough results, try generic selectors as fallback
        if (results.length < maxResults) {
            logger_1.logger.info(`DuckDuckGo specific parsing found only ${results.length} results, trying generic parsing`);
            const genericResults = this.parseGenericSearchResults($, maxResults);
            // Combine results without duplicates
            results = this.combineResults(results, genericResults, maxResults);
        }
        // Additional metadata extraction - favicons, dates, provider info
        results = this.enhanceResultsWithMetadata($, results);
        logger_1.logger.info(`Parsed ${results.length} results using cheerio`);
        return results;
    }
    /**
     * Parse DuckDuckGo specific search results
     */
    parseDuckDuckGoResults($, maxResults) {
        const results = [];
        // DuckDuckGo specific selectors
        // The structure may change, so we look for multiple possible selectors
        $('.result, .web-result, .links_main, .result__body').each((index, element) => {
            if (results.length >= maxResults)
                return false;
            const titleEl = $(element).find('.result__title, .result__a, .result-title, h2 a').first();
            const urlEl = $(element).find('.result__url, .result__snippet-url, .result-url').first();
            const descEl = $(element).find('.result__snippet, .result-snippet, .result-desc').first();
            // Skip ads and special results
            if ($(element).hasClass('result--ad') || $(element).hasClass('result--spotlight')) {
                return true; // Skip this element
            }
            // Extract text and URLs
            const title = titleEl.text().trim();
            let url = titleEl.attr('href') || urlEl.text().trim();
            const description = descEl.text().trim();
            // Clean up URL if it's from DuckDuckGo's redirect
            if (url && url.startsWith('/')) {
                url = 'https://duckduckgo.com' + url;
            }
            // Parse out the actual URL from DuckDuckGo's redirect URL
            if (url && url.includes('duckduckgo.com/l/?')) {
                try {
                    const urlObj = new URL(url);
                    const actualUrl = urlObj.searchParams.get('uddg');
                    if (actualUrl)
                        url = actualUrl;
                }
                catch (e) {
                    // Keep the original URL if parsing fails
                }
            }
            // Try to extract favicon
            let icon = '';
            const iconEl = $(element).find('.result__icon img, .result-favicon, .favicon');
            if (iconEl.length > 0) {
                icon = iconEl.attr('src') || '';
            }
            // Try to extract provider or domain info
            let provider = '';
            try {
                if (url) {
                    const urlObj = new URL(url);
                    provider = urlObj.hostname.replace('www.', '');
                }
            }
            catch (e) {
                // Ignore URL parsing errors
            }
            // Only add if we have at least a title and URL
            if (title && url) {
                results.push({
                    title,
                    url,
                    description: description || `Result for search query related to ${title}`,
                    icon,
                    provider
                });
            }
        });
        return results;
    }
    /**
     * Parse generic search results with broader selectors
     * This serves as a fallback for when specific selectors don't match
     */
    parseGenericSearchResults($, maxResults) {
        const results = [];
        // Store seen URLs to avoid duplicates
        const seenUrls = new Set();
        // Look for anchor tags that look like search results
        // These are broad selectors that might catch results on different search engines
        $('a').each((index, element) => {
            if (results.length >= maxResults)
                return false;
            const $el = $(element);
            let url = $el.attr('href') || '';
            // Skip anchors with no href or internal page anchors
            if (!url || url.startsWith('#') || url === '/' || url.includes('javascript:')) {
                return true; // Skip this element
            }
            // Skip navigation, header, and footer links
            if ($el.parents('nav, header, footer').length > 0) {
                return true; // Skip this element
            }
            // Make URLs absolute
            if (url.startsWith('/')) {
                url = 'https://duckduckgo.com' + url;
            }
            // Skip already seen URLs
            if (seenUrls.has(url)) {
                return true; // Skip this element
            }
            // Try to find a meaningful title
            // 1. Use the anchor text if it's not too short
            let title = $el.text().trim();
            // 2. If the anchor text is too short, look for nearby headings
            if (title.length < 10) {
                const headingEl = $el.closest('div').find('h1, h2, h3, h4, h5').first();
                if (headingEl.length > 0) {
                    title = headingEl.text().trim();
                }
            }
            // 3. If still no good title, use nearby paragraph or div text
            if (title.length < 10) {
                const parentText = $el.parent().text().trim();
                if (parentText.length > title.length) {
                    title = parentText;
                }
            }
            // Find a description in nearby paragraph
            let description = '';
            const descEl = $el.next('p, div').first();
            if (descEl.length > 0) {
                description = descEl.text().trim();
            }
            // If no description found nearby, look for any paragraph in the parent container
            if (!description) {
                const parentDescEl = $el.parent().find('p').first();
                if (parentDescEl.length > 0 && !parentDescEl.find('a').length) {
                    description = parentDescEl.text().trim();
                }
            }
            // Try to extract an icon
            let icon = '';
            const iconEl = $el.find('img').first();
            if (iconEl.length > 0) {
                icon = iconEl.attr('src') || '';
            }
            // Try to extract domain info
            let provider = '';
            try {
                const urlObj = new URL(url);
                provider = urlObj.hostname.replace('www.', '');
            }
            catch (e) {
                // Ignore URL parsing errors
            }
            // Only add if we have at least a reasonable title and valid URL
            if (title && title.length > 5 && url && url.includes('://')) {
                // Add to seen URLs
                seenUrls.add(url);
                // Add the result
                results.push({
                    title: this.cleanText(title),
                    url,
                    description: description ? this.cleanText(description) : `Result related to search query`,
                    icon,
                    provider
                });
            }
        });
        return results;
    }
    /**
     * Enhance search results with additional metadata
     */
    enhanceResultsWithMetadata($, results) {
        // Try to find dates, article info, and other metadata
        return results.map(result => {
            // Skip if we don't have a URL
            if (!result.url)
                return result;
            // Try to extract a date if not present
            if (!result.date) {
                // Common date selectors in search results
                const dateText = $(`a[href*="${result.url}"]`)
                    .parent()
                    .find('time, [class*="date"], [class*="time"], span:contains("/")')
                    .first()
                    .text()
                    .trim();
                if (dateText && dateText.length > 0) {
                    result.date = dateText;
                }
            }
            return result;
        });
    }
    /**
     * Parse using Puppeteer for a more complete capture of the page
     * This handles JavaScript-rendered content and allows scrolling
     */
    async parseWithPuppeteer(html, maxResults) {
        logger_1.logger.info('Parsing search results with Puppeteer');
        let page = null;
        try {
            // Initialize browser if not already done
            await browserService_1.browserService.initialize();
            // For DuckDuckGo searches we need the actual query
            // Extract the query from the HTML if possible
            let searchQuery = '';
            try {
                const $ = cheerio_1.default.load(html);
                const inputVal = $('input[name="q"]').val();
                searchQuery = typeof inputVal === 'string' ? inputVal : (Array.isArray(inputVal) ? inputVal[0] : '');
                logger_1.logger.info(`Extracted search query: "${searchQuery}"`);
            }
            catch (e) {
                logger_1.logger.warn(`Failed to extract search query: ${e}`);
                searchQuery = 'unknown query';
            }
            // Construct the search URL
            const encodedQuery = encodeURIComponent(searchQuery);
            const searchUrl = `https://html.duckduckgo.com/html/?q=${encodedQuery}&kl=wt-wt&kp=-1`;
            // Navigate to DuckDuckGo search page
            const navigationOptions = {
                waitUntil: 'networkidle2',
                timeout: 30000
            };
            // Use browserService to capture the website - this gives us metadata and a screenshot
            logger_1.logger.info(`Navigating to search URL: ${searchUrl}`);
            const pageMetadata = await browserService_1.browserService.captureWebsite(searchUrl, {
                navigation: navigationOptions,
                screenshot: {
                    fullPage: true,
                    type: 'png'
                }
            });
            // Create a puppeteer page directly for more control over scrolling
            const browser = await browserService_1.browserService.initialize();
            page = await browser.newPage();
            // Set viewport to a reasonable size
            await page.setViewport({ width: 1366, height: 768 });
            // Navigate to the search URL
            await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
            // Wait for search results to load
            await page.waitForSelector('.result, .web-result, .links_main, .result__body', { timeout: 5000 })
                .catch(() => logger_1.logger.warn('Timeout waiting for search results selectors'));
            // Perform progressive scrolling and result extraction
            logger_1.logger.info('Beginning progressive scrolling to capture all results');
            const allResults = await this.scrollAndExtractResults(page, maxResults);
            // Close the page when done
            if (page) {
                await page.close().catch(e => logger_1.logger.error(`Error closing page: ${e}`));
            }
            // If we didn't get enough results through direct extraction, 
            // fall back to extracting from the screenshot
            if (allResults.length < maxResults / 2) {
                logger_1.logger.info(`Only extracted ${allResults.length} results directly, trying screenshot analysis`);
                const screenshotResults = await this.extractResultsFromScreenshot(pageMetadata, maxResults);
                // Combine results, removing duplicates
                const combinedResults = this.combineResults(allResults, screenshotResults, maxResults);
                logger_1.logger.info(`Combined ${allResults.length} direct results with ${screenshotResults.length} screenshot results for a total of ${combinedResults.length} unique results`);
                return combinedResults;
            }
            logger_1.logger.info(`Extracted ${allResults.length} results using Puppeteer with scrolling`);
            return allResults;
        }
        catch (error) {
            logger_1.logger.error(`Puppeteer parsing failed: ${error}`);
            // Close the page on error
            if (page) {
                await page.close().catch(() => { });
            }
            // Fall back to mock results
            return this.getMockResults(maxResults);
        }
    }
    /**
     * Combines results from multiple sources, removing duplicates
     */
    combineResults(resultsA, resultsB, maxResults) {
        // Use URL as unique identifier
        const urlMap = new Map();
        // Add all results from source A
        resultsA.forEach(result => {
            if (result.url) {
                urlMap.set(result.url, result);
            }
        });
        // Add results from source B that aren't already included
        resultsB.forEach(result => {
            if (result.url && !urlMap.has(result.url)) {
                urlMap.set(result.url, result);
            }
        });
        // Convert back to array and limit to max results
        return Array.from(urlMap.values()).slice(0, maxResults);
    }
    /**
     * Scrolls through the page progressively, extracting results as they appear
     */
    async scrollAndExtractResults(page, maxResults) {
        let allResults = [];
        let previousHeight = 0;
        let scrollAttempts = 0;
        const maxScrollAttempts = 10; // Safety limit
        logger_1.logger.info('Starting progressive scrolling to capture all results');
        while (scrollAttempts < maxScrollAttempts && allResults.length < maxResults) {
            // Extract current visible results
            const newResults = await page.evaluate((currentResultCount) => {
                const results = [];
                // Select result elements based on common selectors
                const resultElements = document.querySelectorAll('.result, .web-result, .links_main, .result__body');
                // Process only new results we haven't seen before
                for (let i = currentResultCount; i < resultElements.length; i++) {
                    const element = resultElements[i];
                    // Find title, URL, and description elements
                    const titleEl = element.querySelector('.result__title, .result__a, .result-title, h2 a');
                    const urlEl = element.querySelector('.result__url, .result__snippet-url, .result-url');
                    const descEl = element.querySelector('.result__snippet, .result-snippet, .result-desc');
                    if (!titleEl)
                        continue;
                    // Extract data
                    const title = titleEl.textContent?.trim() || '';
                    let url = titleEl.getAttribute('href') || urlEl?.textContent?.trim() || '';
                    const description = descEl?.textContent?.trim() || '';
                    // Fix relative URLs
                    if (url.startsWith('/')) {
                        url = 'https://duckduckgo.com' + url;
                    }
                    // Only add if we have a title and URL
                    if (title && url) {
                        results.push({ title, url, description });
                    }
                }
                return results;
            }, allResults.length);
            // Add new results to our collection
            if (newResults && newResults.length > 0) {
                logger_1.logger.info(`Found ${newResults.length} new results while scrolling`);
                allResults = allResults.concat(newResults);
            }
            // Scroll down
            const currentHeight = await page.evaluate('document.body.scrollHeight');
            // If height hasn't changed, we might be at the bottom
            if (currentHeight === previousHeight) {
                scrollAttempts++;
                logger_1.logger.info(`No height change detected, attempt ${scrollAttempts}/${maxScrollAttempts}`);
                // Try clicking "More Results" button if it exists
                try {
                    const hasMoreButton = await page.evaluate(() => {
                        const moreButton = document.querySelector('.result--more a, .result--more, .result__more, .more-results');
                        if (moreButton && moreButton instanceof HTMLElement) {
                            moreButton.click();
                            return true;
                        }
                        return false;
                    });
                    if (hasMoreButton) {
                        logger_1.logger.info('Clicked "More Results" button');
                        await page.waitForTimeout(2000); // Wait for new results to load
                    }
                }
                catch (e) {
                    logger_1.logger.warn(`Error clicking more results: ${e}`);
                }
            }
            else {
                // Reset attempts since the page height changed
                scrollAttempts = 0;
                previousHeight = currentHeight;
            }
            // Scroll down by half a page
            await page.evaluate('window.scrollBy(0, window.innerHeight / 2)');
            // Wait for potential new content to load
            await page.waitForTimeout(1000);
            // Check if we have enough results
            if (allResults.length >= maxResults) {
                logger_1.logger.info(`Reached target of ${maxResults} results, stopping scrolling`);
                break;
            }
        }
        logger_1.logger.info(`Scrolling complete, found a total of ${allResults.length} results`);
        // Process URLs to extract actual destinations from redirects
        const processedResults = await page.evaluate((results) => {
            return results.map(result => {
                let url = result.url;
                // Handle DuckDuckGo redirect URLs
                if (url.includes('duckduckgo.com/l/?')) {
                    try {
                        const urlObj = new URL(url);
                        const actualUrl = urlObj.searchParams.get('uddg');
                        if (actualUrl)
                            url = actualUrl;
                    }
                    catch (e) {
                        // Keep original URL on error
                    }
                }
                return {
                    ...result,
                    url
                };
            });
        }, allResults);
        return processedResults.slice(0, maxResults);
    }
    /**
     * Extract search results from a captured screenshot
     * This uses the page's metadata and screenshot to analyze the results
     */
    async extractResultsFromScreenshot(pageMetadata, maxResults) {
        try {
            logger_1.logger.info(`Analyzing page metadata and screenshot at ${pageMetadata.screenshotPath}`);
            // Complex approach: Re-analyze the page using multiple strategies
            const results = [];
            // 1. Extract structured data if available
            if (pageMetadata.textContent) {
                const structuredResults = await this.extractStructuredResults(pageMetadata);
                if (structuredResults.length > 0) {
                    logger_1.logger.info(`Found ${structuredResults.length} structured results in page metadata`);
                    results.push(...structuredResults);
                }
            }
            // 2. Use text pattern matching as a fallback
            if (results.length < maxResults) {
                const textResults = await this.extractResultsFromText(pageMetadata, maxResults - results.length);
                if (textResults.length > 0) {
                    logger_1.logger.info(`Found ${textResults.length} results from text pattern matching`);
                    results.push(...textResults);
                }
            }
            // 3. If we still don't have enough results, try visually analyzing links
            if (results.length < maxResults) {
                const linkResults = await this.analyzeVisualLinks(pageMetadata, maxResults - results.length);
                if (linkResults.length > 0) {
                    logger_1.logger.info(`Found ${linkResults.length} additional results from visual link analysis`);
                    results.push(...linkResults);
                }
            }
            // 4. If the screenshot exists, we could analyze it directly in a production system
            if (pageMetadata.screenshotPath && results.length < maxResults / 2) {
                // In a production system, you would use computer vision or LLM vision capabilities here
                // For now, we just log that we would do this in a full implementation
                logger_1.logger.info(`In a production system, we would analyze the screenshot using ML/CV: ${pageMetadata.screenshotPath}`);
            }
            // Deduplicate results by URL
            const uniqueResults = this.deduplicateResults(results);
            logger_1.logger.info(`Extracted ${uniqueResults.length} unique results from page metadata and screenshot`);
            return uniqueResults.slice(0, maxResults);
        }
        catch (error) {
            logger_1.logger.error(`Error extracting results from screenshot: ${error}`);
            return [];
        }
    }
    /**
     * Extract structured search results from page metadata if available
     */
    async extractStructuredResults(pageMetadata) {
        const results = [];
        try {
            // Look for structured data in the page
            // In a production system, you would parse JSON-LD, microdata, or other structured formats
            // For now, we'll use a simple approach to find search result patterns in the text
            const textContent = pageMetadata.textContent || '';
            // Look for result boundaries in the text
            const resultSeparators = [
                '\n\n', // Common separator for text blocks
                '------', // Visual separators
                '======',
                '------',
                '######',
                '■', // Bullet points
                '●',
                '▶',
                '►'
            ];
            // Try to split the text into result blocks
            let textBlocks = [];
            for (const separator of resultSeparators) {
                if (textContent.includes(separator)) {
                    textBlocks = textContent.split(separator)
                        .map(block => block.trim())
                        .filter(block => block.length > 20); // Filter out tiny blocks
                    if (textBlocks.length >= 3) {
                        logger_1.logger.info(`Split text into ${textBlocks.length} blocks using separator: "${separator}"`);
                        break;
                    }
                }
            }
            // If we couldn't split by separators, try to use line patterns
            if (textBlocks.length < 3) {
                // Look for patterns like numbered results: "1. Result title"
                const resultPattern = /\d+\.\s+([^\n]+)/g;
                const matches = Array.from(textContent.matchAll(resultPattern));
                if (matches.length >= 3) {
                    logger_1.logger.info(`Found ${matches.length} numbered result patterns`);
                    // Extract blocks around each match
                    for (const match of matches) {
                        const startIdx = match.index;
                        const endIdx = textContent.indexOf('\n\n', startIdx || 0);
                        if (startIdx !== undefined && endIdx !== -1) {
                            const block = textContent.substring(startIdx, endIdx).trim();
                            if (block.length > 20) {
                                textBlocks.push(block);
                            }
                        }
                    }
                }
            }
            // Process each text block to extract result information
            for (const block of textBlocks) {
                // Extract URL using regex
                const urlRegex = /(https?:\/\/[^\s]+)/g;
                const urlMatches = block.match(urlRegex);
                if (urlMatches && urlMatches.length > 0) {
                    const url = urlMatches[0];
                    // Extract title - use the first line or text before the URL
                    let title = '';
                    const lines = block.split('\n').filter(line => line.trim().length > 0);
                    if (lines.length > 0) {
                        title = lines[0].trim();
                        // If the title contains the URL, try the next line
                        if (title.includes(url) && lines.length > 1) {
                            title = lines[1].trim();
                        }
                    }
                    // Extract description - use the remaining text
                    let description = '';
                    if (lines.length > 1) {
                        // Skip the title line and get the rest
                        description = lines.slice(1).join(' ').trim();
                        // If there's a URL in the description, remove it and anything after
                        const urlIndex = description.indexOf(url);
                        if (urlIndex !== -1) {
                            description = description.substring(0, urlIndex).trim();
                        }
                    }
                    // If we have at least a URL and some text, add it as a result
                    if (url && (title || description)) {
                        results.push({
                            title: title || this.generateTitleFromUrl(url),
                            url,
                            description: description || 'No description available'
                        });
                    }
                }
            }
        }
        catch (error) {
            logger_1.logger.error(`Error extracting structured results: ${error}`);
        }
        return results;
    }
    /**
     * Extract results from text content using pattern matching
     */
    async extractResultsFromText(pageMetadata, maxResults) {
        const results = [];
        const textContent = pageMetadata.textContent || '';
        try {
            // Simple pattern matching to extract potential results
            // Looking for URL patterns and titles
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const urlMatches = [...new Set(textContent.match(urlRegex) || [])]; // Deduplicate URLs
            // Extract up to maxResults
            for (let i = 0; i < Math.min(urlMatches.length, maxResults); i++) {
                const url = urlMatches[i];
                // Skip URLs that are likely not search results
                if (url.includes('google.com/search') ||
                    url.includes('duckduckgo.com/html') ||
                    url.includes('/images/') ||
                    url.includes('/css/') ||
                    url.includes('/js/')) {
                    continue;
                }
                // Try to extract a title by looking at the context around the URL
                const urlIndex = textContent.indexOf(url);
                let title = '';
                if (urlIndex > 0) {
                    // Look for text before the URL to find a potential title
                    const contextBefore = textContent.substring(Math.max(0, urlIndex - 150), urlIndex).trim();
                    const lines = contextBefore.split('\n').filter(line => line.trim().length > 0);
                    // Use the last non-empty line as title
                    if (lines.length > 0) {
                        title = lines[lines.length - 1].trim();
                    }
                    // If title is too short or looks like a URL, try other strategies
                    if (title.length < 10 || urlRegex.test(title)) {
                        // Try to find a better title in a wider context
                        const widerContext = textContent.substring(Math.max(0, urlIndex - 300), urlIndex).trim();
                        const paragraphs = widerContext.split('\n\n').filter(p => p.trim().length > 0);
                        if (paragraphs.length > 0) {
                            const lastParagraph = paragraphs[paragraphs.length - 1].trim();
                            const paragraphLines = lastParagraph.split('\n');
                            if (paragraphLines.length > 0 && paragraphLines[0].length > 10) {
                                title = paragraphLines[0].trim();
                            }
                        }
                        // If still no good title, generate one from the URL
                        if (title.length < 10 || urlRegex.test(title)) {
                            title = this.generateTitleFromUrl(url);
                        }
                    }
                }
                else {
                    title = this.generateTitleFromUrl(url);
                }
                // Extract a simple description from the text after the URL
                let description = '';
                if (urlIndex >= 0) {
                    const contextAfter = textContent.substring(urlIndex + url.length, urlIndex + url.length + 300).trim();
                    const paragraphs = contextAfter.split('\n\n').filter(p => p.trim().length > 0);
                    if (paragraphs.length > 0) {
                        description = paragraphs[0].trim();
                    }
                    else {
                        const lines = contextAfter.split('\n').filter(line => line.trim().length > 0);
                        if (lines.length > 0) {
                            description = lines[0].trim();
                        }
                    }
                }
                results.push({
                    title: this.cleanText(title),
                    url,
                    description: this.cleanText(description) || `Result related to search query`
                });
            }
        }
        catch (error) {
            logger_1.logger.error(`Error extracting results from text: ${error}`);
        }
        return results;
    }
    /**
     * Generate a title from a URL when no better title is available
     */
    generateTitleFromUrl(url) {
        try {
            const urlObj = new URL(url);
            // Use the pathname to generate a title
            const path = urlObj.pathname;
            if (path && path !== '/') {
                // Remove file extensions and convert dashes/underscores to spaces
                const pathParts = path.split('/').filter(Boolean);
                if (pathParts.length > 0) {
                    const lastPart = pathParts[pathParts.length - 1]
                        .replace(/\.(html|php|aspx|jsp)$/, '')
                        .replace(/[-_]/g, ' ');
                    // Capitalize words
                    const title = lastPart
                        .split(' ')
                        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');
                    if (title.length > 3) {
                        return title;
                    }
                }
            }
            // If path doesn't work, use the hostname
            return `Result from ${urlObj.hostname.replace('www.', '')}`;
        }
        catch (e) {
            return 'Search Result';
        }
    }
    /**
     * Analyze visual placement of links to identify search results
     * This is a simplified approach - in production, you'd use ML/CV for this
     */
    async analyzeVisualLinks(pageMetadata, maxResults) {
        // In a real implementation, you would analyze:
        // 1. Visual patterns in the page structure
        // 2. Common search result layouts
        // 3. Consistent spacing/formatting that indicates search results
        // For now, we'll use a simple approach based on the available data
        const results = [];
        // Use link count to guess if we're on a search results page
        if (pageMetadata.linkCount && pageMetadata.linkCount > 10) {
            logger_1.logger.info(`Page has ${pageMetadata.linkCount} links, likely a search results page`);
            // This would use more sophisticated analysis in production
            // For now, return an empty array since we've already tried other methods
        }
        return results;
    }
    /**
     * Scroll through the entire page to make sure all content is loaded
     */
    async scrollThroughPage(page) {
        logger_1.logger.info('Scrolling through page to load all content');
        try {
            // Get the height of the page
            const bodyHeight = await page.evaluate(() => {
                return document.body.scrollHeight;
            });
            // Scroll in increments
            const scrollIncrement = 500;
            for (let scrollPos = 0; scrollPos < bodyHeight; scrollPos += scrollIncrement) {
                await page.evaluate((pos) => {
                    window.scrollTo(0, pos);
                }, scrollPos);
                // Wait briefly for any content to load
                await page.waitForTimeout(300);
            }
            // Scroll back to top
            await page.evaluate(() => {
                window.scrollTo(0, 0);
            });
            logger_1.logger.info('Finished scrolling through page');
        }
        catch (error) {
            logger_1.logger.error(`Error scrolling through page: ${error}`);
        }
    }
    /**
     * Normalize and clean search results
     * Applies a series of cleaning and normalization steps to ensure consistent output
     */
    normalizeResults(results, maxResults) {
        // First filter out invalid results
        let validResults = results.filter(result => result.title && result.url);
        // Apply all normalization steps
        validResults = validResults.map(result => {
            // Start with basic cleaning
            const normalizedResult = {
                title: this.cleanTitle(result.title),
                url: this.normalizeUrl(result.url),
                description: this.cleanDescription(result.description, result.title)
            };
            // Add optional fields if present
            if (result.icon) {
                normalizedResult.icon = this.normalizeImageUrl(result.icon, result.url);
            }
            if (result.provider) {
                normalizedResult.provider = this.cleanProvider(result.provider);
            }
            else {
                // Extract provider from URL if not provided
                normalizedResult.provider = this.extractProviderFromUrl(result.url);
            }
            if (result.date) {
                normalizedResult.date = this.normalizeDate(result.date);
            }
            return normalizedResult;
        });
        // Remove duplicates
        validResults = this.deduplicateResults(validResults);
        // Sort by potential relevance (if we had relevance data)
        // In a real implementation, you would sort based on relevance scores
        // Limit to requested number of results
        return validResults.slice(0, maxResults);
    }
    /**
     * Clean and normalize title text
     * Handles common issues with titles from search results
     */
    cleanTitle(text) {
        if (!text)
            return '';
        let cleanedText = this.cleanText(text);
        // Remove redundant search indicators
        cleanedText = cleanedText
            .replace(/^(web result|search result|result)[:|\-|\s]/i, '')
            .replace(/\s*\(\d+\)$/, ''); // Remove result numbers like (3)
        // Truncate extremely long titles
        if (cleanedText.length > 100) {
            cleanedText = cleanedText.substring(0, 97) + '...';
        }
        // Make sure first letter is capitalized
        if (cleanedText.length > 0) {
            cleanedText = cleanedText.charAt(0).toUpperCase() + cleanedText.slice(1);
        }
        return cleanedText;
    }
    /**
     * Clean and normalize description text
     */
    cleanDescription(text, title) {
        if (!text) {
            // Generate a default description using the title
            return title ? `Information about ${title}` : 'Search result';
        }
        let cleanedText = this.cleanText(text);
        // Avoid descriptions that are just the title repeated
        if (title && cleanedText.trim() === title.trim()) {
            return `Information about ${title}`;
        }
        // Avoid very short descriptions
        if (cleanedText.length < 10) {
            return title ? `Information about ${title}` : 'Search result';
        }
        // Fix ellipsis issues from truncated texts
        cleanedText = cleanedText
            .replace(/\.{2,}/g, '...')
            .replace(/…/g, '...');
        // Remove redundant text patterns often found in search snippets
        cleanedText = cleanedText
            .replace(/^(description|summary|excerpt)[:|\-|\s]/i, '')
            .replace(/Click to view\b.*/i, '')
            .replace(/\bVisit website\b.*/i, '');
        // Ensure proper sentence ending
        if (cleanedText.length > 0 && !cleanedText.match(/[.!?…]$/)) {
            cleanedText += '.';
        }
        // Truncate very long descriptions
        if (cleanedText.length > 300) {
            // Find a good breaking point at a sentence
            const breakPoint = cleanedText.substring(0, 300).lastIndexOf('.');
            if (breakPoint > 150) {
                cleanedText = cleanedText.substring(0, breakPoint + 1);
            }
            else {
                cleanedText = cleanedText.substring(0, 297) + '...';
            }
        }
        return cleanedText;
    }
    /**
     * Clean provider information
     */
    cleanProvider(provider) {
        if (!provider)
            return '';
        let cleanedProvider = this.cleanText(provider);
        // Remove common prefixes
        cleanedProvider = cleanedProvider
            .replace(/^(from|by|source|provider)[:|\-|\s]/i, '')
            .trim();
        // If it looks like a domain, clean it up
        if (cleanedProvider.includes('.')) {
            cleanedProvider = cleanedProvider
                .replace(/^www\./, '')
                .replace(/\.(com|org|net|edu|gov|io|co)$/i, '')
                .trim();
        }
        return cleanedProvider;
    }
    /**
     * Extract provider name from URL
     */
    extractProviderFromUrl(url) {
        if (!url)
            return '';
        try {
            const urlObj = new URL(url);
            let hostname = urlObj.hostname;
            // Remove 'www.' prefix
            hostname = hostname.replace(/^www\./, '');
            // Extract the main domain name
            const domainParts = hostname.split('.');
            if (domainParts.length >= 2) {
                // Take the part just before the TLD
                return domainParts[domainParts.length - 2];
            }
            return hostname;
        }
        catch (e) {
            return '';
        }
    }
    /**
     * Normalize image URLs
     */
    normalizeImageUrl(iconUrl, pageUrl) {
        if (!iconUrl)
            return '';
        // If it's a data URL, return as is
        if (iconUrl.startsWith('data:')) {
            return iconUrl;
        }
        // Make relative URLs absolute
        if (iconUrl.startsWith('/') && pageUrl) {
            try {
                const urlObj = new URL(pageUrl);
                return `${urlObj.protocol}//${urlObj.host}${iconUrl}`;
            }
            catch (e) {
                // Return original if URL parsing fails
                return iconUrl;
            }
        }
        // Return as is for absolute URLs or if no pageUrl is available
        return iconUrl;
    }
    /**
     * Normalize date formats
     */
    normalizeDate(dateStr) {
        if (!dateStr)
            return '';
        // Clean up the date string
        let cleanDate = this.cleanText(dateStr);
        // Try to parse and standardize the date
        try {
            // Check for common date patterns and convert to ISO format
            // This is a simplified approach - in a real implementation, 
            // you would use a library like date-fns or moment.js
            // Try to parse as a Date object
            const date = new Date(cleanDate);
            if (!isNaN(date.getTime())) {
                // Return in a readable format
                return date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
            // If we can't parse it, return the cleaned string
            return cleanDate;
        }
        catch (e) {
            // If parsing fails, return the original cleaned string
            return cleanDate;
        }
    }
    /**
     * Clean up text fields - basic text cleaning
     */
    cleanText(text) {
        if (!text)
            return '';
        return text
            // Convert escaped newlines to spaces
            .replace(/\\n/g, ' ')
            // Fix common Unicode issues
            .replace(/[\u2018\u2019]/g, "'") // Smart single quotes
            .replace(/[\u201C\u201D]/g, '"') // Smart double quotes
            .replace(/\u2026/g, '...') // Ellipsis
            .replace(/\u2013/g, '-') // En dash
            .replace(/\u2014/g, '--') // Em dash
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            .trim();
    }
    /**
     * Normalize URLs
     */
    normalizeUrl(url) {
        if (!url)
            return '';
        try {
            // Remove tracking parameters
            const urlObj = new URL(url);
            // List of common tracking parameters to remove
            const trackingParams = [
                'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
                'fbclid', 'gclid', 'msclkid', 'ref', 'ref_', 'source', 'session_id',
                'twitter', 'facebook', 'linkedin', 'mc_eid', 'mc_cid'
            ];
            // Remove these parameters from the URL
            trackingParams.forEach(param => {
                urlObj.searchParams.delete(param);
            });
            // Remove hash if it's just a tracking identifier
            if (urlObj.hash && (urlObj.hash.length < 20 || urlObj.hash.match(/^#[a-zA-Z0-9_-]+$/))) {
                urlObj.hash = '';
            }
            // Ensure URL ends with trailing slash for root domain URLs
            if (urlObj.pathname === '' || urlObj.pathname === '/') {
                urlObj.pathname = '/';
            }
            return urlObj.toString();
        }
        catch (e) {
            // If URL parsing fails, return the original
            return url;
        }
    }
    /**
     * Deduplicate results by URL
     */
    deduplicateResults(results) {
        const uniqueUrls = new Map();
        for (const result of results) {
            // Normalize the URL for deduplication
            let url = this.normalizeUrl(result.url);
            // Only add if we don't already have this URL or if this result has a better title/description
            const existing = uniqueUrls.get(url);
            if (!existing ||
                (result.title.length > existing.title.length) ||
                (result.description && (!existing.description || result.description.length > existing.description.length))) {
                uniqueUrls.set(url, result);
            }
        }
        return Array.from(uniqueUrls.values());
    }
    /**
     * Get mock results for development or fallback
     */
    getMockResults(maxResults) {
        const mockResults = [
            {
                title: 'What is Climate Change? | NASA',
                url: 'https://climate.nasa.gov/resources/global-warming-vs-climate-change/',
                description: 'Climate change is a long-term alteration in Earth\'s climate and weather patterns. It is broader than just global warming...'
            },
            {
                title: 'Climate Change Evidence and Causes | Royal Society',
                url: 'https://royalsociety.org/topics-policy/projects/climate-change-evidence-causes/',
                description: 'The Royal Society and the US National Academy of Sciences, with their similar missions to promote the use of science...'
            },
            {
                title: 'Climate Change | United Nations',
                url: 'https://www.un.org/en/global-issues/climate-change',
                description: 'Climate Change is the defining issue of our time and we are at a defining moment. From shifting weather patterns that threaten food production...'
            },
            {
                title: 'Global Warming vs. Climate Change | Resources – Climate Change: Vital Signs of the Planet',
                url: 'https://climate.nasa.gov/global-warming-vs-climate-change/',
                description: 'Global warming refers only to the Earth\'s rising surface temperature, while climate change includes warming and the side effects of warming.'
            },
            {
                title: 'Climate change - Wikipedia',
                url: 'https://en.wikipedia.org/wiki/Climate_change',
                description: 'Climate change includes both global warming driven by human emissions of greenhouse gases, and the resulting large-scale shifts in weather patterns.'
            }
        ];
        return mockResults.slice(0, maxResults);
    }
    applyFilters(results, filters) {
        if (!filters) {
            return results;
        }
        return results.filter(result => {
            const url = result.url.toLowerCase();
            // Check include filters
            if (filters.include && filters.include.length > 0) {
                const includeMatch = filters.include.some(domain => url.includes(domain.toLowerCase()));
                if (!includeMatch) {
                    return false;
                }
            }
            // Check exclude filters
            if (filters.exclude && filters.exclude.length > 0) {
                const excludeMatch = filters.exclude.some(domain => url.includes(domain.toLowerCase()));
                if (excludeMatch) {
                    return false;
                }
            }
            return true;
        });
    }
    /**
     * Perform a web search using the configured search engine
     * @param query Search query
     * @param options Search options
     * @returns Search results
     */
    async search(query, options = {}) {
        logger_1.logger.info(`Performing search with query: "${query}"`);
        // Currently only supporting DuckDuckGo
        // In the future, this could be extended to support other search engines
        return this.duckDuckGoSearch(query, options);
    }
    /**
     * Generate follow-up queries based on an initial query and search results
     * @param initialQuery Initial search query
     * @param results Current search results
     * @returns List of follow-up queries
     */
    generateFollowUpQueries(initialQuery, results) {
        // In a real implementation, this would use NLP or an AI model to generate
        // relevant follow-up queries based on the initial results
        // Mock implementation for development
        const followUpQueries = [
            `${initialQuery} causes`,
            `${initialQuery} solutions`,
            `${initialQuery} recent developments`,
            `${initialQuery} statistics`,
            `${initialQuery} future predictions`
        ];
        return followUpQueries;
    }
}
exports.searchService = new SearchService();
