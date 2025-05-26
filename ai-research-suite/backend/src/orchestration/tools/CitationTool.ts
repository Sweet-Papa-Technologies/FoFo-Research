import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const citationToolSchema = z.object({
  action: z.enum(['create', 'format', 'extract', 'validate'])
    .default('create')
    .describe('The citation action to perform'),
  source: z.object({
    url: z.string().optional(),
    title: z.string().optional(),
    author: z.string().optional(),
    publishedDate: z.string().optional(),
    accessedDate: z.string().optional(),
    content: z.string().optional()
  })
    .optional()
    .describe('Source information for citation'),
  format: z.enum(['apa', 'mla', 'chicago', 'harvard', 'markdown'])
    .optional()
    .default('markdown')
    .describe('Citation format'),
  text: z.string()
    .optional()
    .describe('Text containing citations to extract or validate')
});

export class CitationTool extends StructuredTool<typeof citationToolSchema> {
  name = 'citation_tool';
  description = 'Manage citations and references for research sources';
  schema = citationToolSchema;

  async _call(input: z.infer<typeof citationToolSchema>): Promise<string> {
    const result = await this.handleCitation(input);
    return JSON.stringify(result);
  }

  private async handleCitation(params: z.infer<typeof citationToolSchema>): Promise<any> {
    const { action, source, format = 'markdown', text } = params;
    
    try {
      logger.info(`Performing citation action: ${action}`);
      
      switch (action) {
        case 'create':
          return this.createCitation(source || {}, format);
          
        case 'format':
          return this.formatCitation(source || {}, format);
          
        case 'extract':
          return this.extractCitations(text || '');
          
        case 'validate':
          return this.validateCitations(text || '');
          
        default:
          throw new Error(`Unknown citation action: ${action}`);
      }
    } catch (error) {
      logger.error('Citation tool error:', error);
      throw new Error(`Citation operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private createCitation(source: any, format: string): any {
    const citationId = `cite-${uuidv4().substring(0, 8)}`;
    const accessedDate = source.accessedDate || new Date().toISOString().split('T')[0];
    
    let citationText = '';
    
    switch (format) {
      case 'apa':
        citationText = this.formatAPA(source, accessedDate);
        break;
        
      case 'mla':
        citationText = this.formatMLA(source, accessedDate);
        break;
        
      case 'chicago':
        citationText = this.formatChicago(source, accessedDate);
        break;
        
      case 'harvard':
        citationText = this.formatHarvard(source, accessedDate);
        break;
        
      case 'markdown':
      default:
        citationText = this.formatMarkdown(source, accessedDate);
        break;
    }
    
    return {
      id: citationId,
      format,
      citation: citationText,
      source: {
        ...source,
        accessedDate
      }
    };
  }
  
  private formatCitation(source: any, format: string): string {
    const result = this.createCitation(source, format);
    return result.citation;
  }
  
  private formatAPA(source: any, accessedDate: string): string {
    const author = source.author || 'Unknown Author';
    const year = source.publishedDate ? new Date(source.publishedDate).getFullYear() : 'n.d.';
    const title = source.title || 'Untitled';
    const url = source.url;
    
    return `${author}. (${year}). ${title}. Retrieved ${accessedDate}, from ${url}`;
  }
  
  private formatMLA(source: any, accessedDate: string): string {
    const author = source.author || 'Unknown Author';
    const title = source.title || 'Untitled';
    const siteName = this.extractSiteName(source.url);
    const date = source.publishedDate || 'n.d.';
    
    return `${author}. "${title}." ${siteName}, ${date}. Web. ${accessedDate}.`;
  }
  
  private formatChicago(source: any, accessedDate: string): string {
    const author = source.author || 'Unknown Author';
    const title = source.title || 'Untitled';
    const siteName = this.extractSiteName(source.url);
    const date = source.publishedDate || 'n.d.';
    const url = source.url;
    
    return `${author}. "${title}." ${siteName}. ${date}. Accessed ${accessedDate}. ${url}.`;
  }
  
  private formatHarvard(source: any, accessedDate: string): string {
    const author = source.author || 'Unknown Author';
    const year = source.publishedDate ? new Date(source.publishedDate).getFullYear() : 'n.d.';
    const title = source.title || 'Untitled';
    const url = source.url;
    
    return `${author} ${year}, '${title}', viewed ${accessedDate}, <${url}>.`;
  }
  
  private formatMarkdown(source: any, accessedDate: string): string {
    const title = source.title || 'Untitled';
    const author = source.author ? ` by ${source.author}` : '';
    const date = source.publishedDate ? ` (${source.publishedDate})` : '';
    const url = source.url;
    
    return `[${title}${author}${date}](${url}) - Accessed: ${accessedDate}`;
  }
  
  private extractSiteName(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'Web';
    }
  }
  
  private extractCitations(text: string): any {
    const markdownLinks = text.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
    const urls = text.match(/https?:\/\/[^\s]+/g) || [];
    
    const citations = markdownLinks.map(link => {
      const match = link.match(/\[([^\]]+)\]\(([^)]+)\)/);
      return {
        type: 'markdown_link',
        text: match?.[1] || '',
        url: match?.[2] || ''
      };
    });
    
    const plainUrls = urls
      .filter(url => !markdownLinks.some(link => link.includes(url)))
      .map(url => ({
        type: 'plain_url',
        text: '',
        url
      }));
    
    return {
      totalCitations: citations.length + plainUrls.length,
      citations: [...citations, ...plainUrls]
    };
  }
  
  private validateCitations(text: string): any {
    const extracted = this.extractCitations(text);
    const validation = {
      totalCitations: extracted.totalCitations,
      valid: [] as any[],
      invalid: [] as any[],
      warnings: [] as any[]
    };
    
    extracted.citations.forEach((citation: any) => {
      if (this.isValidUrl(citation.url)) {
        validation.valid.push(citation);
      } else {
        validation.invalid.push({
          ...citation,
          reason: 'Invalid URL format'
        });
      }
      
      if (!citation.text && citation.type === 'markdown_link') {
        validation.warnings.push({
          citation,
          warning: 'Empty link text'
        });
      }
    });
    
    return validation;
  }
  
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}