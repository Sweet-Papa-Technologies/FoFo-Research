import { logger } from '../utils/logger';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { JSDOM, VirtualConsole } from 'jsdom';
import { Readability } from '@mozilla/readability';

interface ExtractedContent {
  url: string;
  title: string;
  content: string;
  textLength: number;
  error?: string;
}

export class ContentExtractionService {
  private static instance: ContentExtractionService;

  private constructor() {}

  static getInstance(): ContentExtractionService {
    if (!ContentExtractionService.instance) {
      ContentExtractionService.instance = new ContentExtractionService();
    }
    return ContentExtractionService.instance;
  }

  async extractContent(url: string): Promise<ExtractedContent> {
    try {
      logger.info(`Extracting content from: ${url}`);
      
      // Fetch the page content
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 30000,
        maxRedirects: 5
      });

      const html = response.data;
      
      // Try to extract content using Readability first (best for articles)
      const extractedContent = this.extractWithReadability(html, url);
      
      if (extractedContent && extractedContent.content.length > 100) {
        return extractedContent;
      }
      
      // Fallback to cheerio extraction
      return this.extractWithCheerio(html, url);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error extracting content from ${url}: ${errorMessage}`);
      
      return {
        url,
        title: '',
        content: '',
        textLength: 0,
        error: errorMessage
      };
    }
  }

  private extractWithReadability(html: string, url: string): ExtractedContent | null {
    try {
      // Create DOM with virtual console to suppress CSS parsing errors
      const virtualConsole = new VirtualConsole();
      virtualConsole.on('error', () => {
        // Suppress CSS parsing errors
      });
      
      const dom = new JSDOM(html, { 
        url,
        virtualConsole,
        resources: 'usable',
        runScripts: 'outside-only'
      });
      
      const reader = new Readability(dom.window.document);
      const article = reader.parse();
      
      if (article) {
        const cleanText = this.cleanText(article.textContent);
        return {
          url,
          title: article.title || '',
          content: cleanText,
          textLength: cleanText.length
        };
      }
      
      return null;
    } catch (error) {
      logger.warn('Readability extraction failed:', error);
      return null;
    }
  }

  private extractWithCheerio(html: string, url: string): ExtractedContent {
    const $ = cheerio.load(html);
    
    // Remove scripts, styles, and other non-content elements
    $('script, style, noscript, iframe, img, video, audio, form').remove();
    
    // Try to find main content areas
    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '#content',
      '.content',
      '#main',
      '.main',
      'body'
    ];
    
    let content = '';
    let title = $('title').text() || $('h1').first().text() || '';
    
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text();
        if (content.trim().length > 100) {
          break;
        }
      }
    }
    
    // If no content found, get all text from body
    if (!content || content.trim().length < 100) {
      content = $('body').text();
    }
    
    const cleanedContent = this.cleanText(content);
    
    return {
      url,
      title: title.trim(),
      content: cleanedContent,
      textLength: cleanedContent.length
    };
  }

  private cleanText(text: string): string {
    return text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newline
      .replace(/\t/g, ' ') // Replace tabs with spaces
      .trim();
  }

  async extractMultiple(urls: string[], maxConcurrent: number = 3): Promise<ExtractedContent[]> {
    const results: ExtractedContent[] = [];
    
    // Process URLs in batches to avoid overwhelming the system
    for (let i = 0; i < urls.length; i += maxConcurrent) {
      const batch = urls.slice(i, i + maxConcurrent);
      const batchResults = await Promise.all(
        batch.map(url => this.extractContent(url))
      );
      results.push(...batchResults);
    }
    
    return results;
  }
}