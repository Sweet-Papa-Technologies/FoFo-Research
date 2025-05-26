import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../utils/logger';

const reportFormatterToolSchema = z.object({
  content: z.object({
    title: z.string().optional(),
    summary: z.string().optional(),
    sections: z.array(z.any()).optional(),
    findings: z.array(z.any()).optional(),
    citations: z.array(z.any()).optional(),
    metadata: z.any().optional()
  }).describe('The report content to format'),
  format: z.enum(['markdown', 'html', 'plain', 'structured'])
    .optional()
    .default('markdown')
    .describe('Output format'),
  style: z.enum(['academic', 'business', 'technical', 'executive'])
    .optional()
    .default('business')
    .describe('Report style'),
  options: z.object({
    includeToc: z.boolean().optional().default(true),
    includeMetadata: z.boolean().optional().default(true),
    includePageBreaks: z.boolean().optional().default(false),
    citationStyle: z.string().optional().default('numbered')
  })
    .optional()
    .default({})
    .describe('Formatting options')
});

export class ReportFormatterTool extends StructuredTool<typeof reportFormatterToolSchema> {
  name = 'report_formatter_tool';
  description = 'Format research reports in various styles and structures';
  schema = reportFormatterToolSchema;

  async _call(input: z.infer<typeof reportFormatterToolSchema>): Promise<string> {
    const result = await this.formatReport(input);
    return JSON.stringify(result);
  }

  private async formatReport(params: z.infer<typeof reportFormatterToolSchema>): Promise<any> {
    const { content, format = 'markdown', style = 'business', options = {} } = params;
    
    try {
      logger.info(`Formatting report as ${format} in ${style} style`);
      
      const defaultOptions = {
        includeToc: true,
        includeMetadata: true,
        includePageBreaks: false,
        citationStyle: 'numbered'
      };
      
      const formatOptions = { ...defaultOptions, ...options };
      
      let formattedReport = '';
      
      switch (format) {
        case 'markdown':
          formattedReport = this.formatAsMarkdown(content, style, formatOptions);
          break;
          
        case 'html':
          formattedReport = this.formatAsHTML(content, style, formatOptions);
          break;
          
        case 'plain':
          formattedReport = this.formatAsPlainText(content, style, formatOptions);
          break;
          
        case 'structured':
          return this.formatAsStructured(content, style, formatOptions);
          
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
      
      return {
        format,
        style,
        content: formattedReport,
        wordCount: this.countWords(formattedReport),
        characterCount: formattedReport.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Report formatting error:', error);
      throw new Error(`Report formatting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private formatAsMarkdown(content: any, style: string, options: any): string {
    let report = '';
    
    if (content.title) {
      report += `# ${content.title}\n\n`;
    }
    
    if (options.includeMetadata && content.metadata) {
      report += this.formatMetadataMarkdown(content.metadata) + '\n\n';
    }
    
    if (options.includeToc && content.sections && content.sections.length > 3) {
      report += this.generateTocMarkdown(content.sections) + '\n\n';
    }
    
    if (content.summary) {
      report += `## Executive Summary\n\n${content.summary}\n\n`;
    }
    
    if (content.sections) {
      content.sections.forEach((section: any) => {
        report += this.formatSectionMarkdown(section, style);
        if (options.includePageBreaks) {
          report += '\n---\n\n';
        }
      });
    }
    
    if (content.findings && content.findings.length > 0) {
      report += this.formatFindingsMarkdown(content.findings, style);
    }
    
    if (content.citations && content.citations.length > 0) {
      report += this.formatCitationsMarkdown(content.citations, options.citationStyle);
    }
    
    return report;
  }
  
  private formatMetadataMarkdown(metadata: any): string {
    let metaSection = '**Document Information**\n\n';
    
    if (metadata.author) metaSection += `- **Author**: ${metadata.author}\n`;
    if (metadata.date) metaSection += `- **Date**: ${metadata.date}\n`;
    if (metadata.version) metaSection += `- **Version**: ${metadata.version}\n`;
    if (metadata.keywords) metaSection += `- **Keywords**: ${metadata.keywords.join(', ')}\n`;
    
    return metaSection;
  }
  
  private generateTocMarkdown(sections: any[]): string {
    let toc = '## Table of Contents\n\n';
    
    sections.forEach((section, index) => {
      const level = section.level || 2;
      const indent = '  '.repeat(level - 2);
      toc += `${indent}${index + 1}. [${section.title}](#${this.slugify(section.title)})\n`;
    });
    
    return toc;
  }
  
  private formatSectionMarkdown(section: any, style: string): string {
    const level = section.level || 2;
    const heading = '#'.repeat(Math.min(level, 6));
    
    let sectionText = `${heading} ${section.title}\n\n`;
    
    if (section.content) {
      if (style === 'academic') {
        sectionText += this.formatAcademicContent(section.content);
      } else if (style === 'executive') {
        sectionText += this.formatExecutiveContent(section.content);
      } else {
        sectionText += section.content + '\n\n';
      }
    }
    
    if (section.subsections) {
      section.subsections.forEach((subsection: any) => {
        sectionText += this.formatSectionMarkdown(
          { ...subsection, level: (level || 2) + 1 },
          style
        );
      });
    }
    
    return sectionText;
  }
  
  private formatFindingsMarkdown(findings: any[], style: string): string {
    let findingsSection = '## Key Findings\n\n';
    
    if (style === 'executive' || style === 'business') {
      findings.forEach((finding, index) => {
        findingsSection += `**${index + 1}.** ${finding.title || finding}\n`;
        if (finding.description) {
          findingsSection += `   ${finding.description}\n`;
        }
        findingsSection += '\n';
      });
    } else {
      findings.forEach((finding) => {
        findingsSection += `### ${finding.title || finding}\n\n`;
        if (finding.description) {
          findingsSection += `${finding.description}\n\n`;
        }
        if (finding.evidence) {
          findingsSection += `**Evidence**: ${finding.evidence}\n\n`;
        }
      });
    }
    
    return findingsSection;
  }
  
  private formatCitationsMarkdown(citations: any[], style: string): string {
    let citationsSection = '\n## References\n\n';
    
    if (style === 'numbered') {
      citations.forEach((citation, index) => {
        citationsSection += `[${index + 1}] ${citation.text || citation}\n\n`;
      });
    } else {
      citations.forEach((citation) => {
        citationsSection += `- ${citation.text || citation}\n`;
      });
    }
    
    return citationsSection;
  }
  
  private formatAsHTML(content: any, style: string, options: any): string {
    let html = '<!DOCTYPE html>\n<html>\n<head>\n';
    html += '<meta charset="UTF-8">\n';
    html += `<title>${content.title || 'Research Report'}</title>\n`;
    html += this.getHTMLStyles(style);
    html += '</head>\n<body>\n';
    
    if (content.title) {
      html += `<h1>${this.escapeHtml(content.title)}</h1>\n`;
    }
    
    if (options.includeMetadata && content.metadata) {
      html += '<div class="metadata">\n';
      html += this.formatMetadataHTML(content.metadata);
      html += '</div>\n';
    }
    
    if (content.summary) {
      html += '<div class="summary">\n';
      html += '<h2>Executive Summary</h2>\n';
      html += `<p>${this.escapeHtml(content.summary)}</p>\n`;
      html += '</div>\n';
    }
    
    if (content.sections) {
      content.sections.forEach((section: any) => {
        html += this.formatSectionHTML(section);
      });
    }
    
    html += '</body>\n</html>';
    
    return html;
  }
  
  private formatAsPlainText(content: any, _style: string, options: any): string {
    let text = '';
    
    if (content.title) {
      text += `${content.title.toUpperCase()}\n${'='.repeat(content.title.length)}\n\n`;
    }
    
    if (options.includeMetadata && content.metadata) {
      text += 'DOCUMENT INFORMATION\n';
      text += '-'.repeat(20) + '\n';
      if (content.metadata.author) text += `Author: ${content.metadata.author}\n`;
      if (content.metadata.date) text += `Date: ${content.metadata.date}\n`;
      text += '\n';
    }
    
    if (content.summary) {
      text += 'EXECUTIVE SUMMARY\n';
      text += '-'.repeat(17) + '\n';
      text += this.wrapText(content.summary, 80) + '\n\n';
    }
    
    if (content.sections) {
      content.sections.forEach((section: any, index: number) => {
        text += `${index + 1}. ${section.title.toUpperCase()}\n`;
        text += '-'.repeat(section.title.length + 3) + '\n';
        if (section.content) {
          text += this.wrapText(section.content, 80) + '\n\n';
        }
      });
    }
    
    return text;
  }
  
  private formatAsStructured(content: any, style: string, options: any): object {
    const structured = {
      metadata: {
        format: 'structured',
        style,
        generated: new Date().toISOString(),
        options
      },
      document: {
        title: content.title,
        summary: content.summary,
        sections: [],
        findings: content.findings || [],
        citations: content.citations || []
      }
    };
    
    if (content.metadata) {
      structured.metadata = { ...structured.metadata, ...content.metadata };
    }
    
    if (content.sections) {
      structured.document.sections = content.sections.map((section: any) => 
        this.structureSection(section)
      );
    }
    
    return structured;
  }
  
  private structureSection(section: any): object {
    return {
      id: this.slugify(section.title),
      title: section.title,
      level: section.level || 2,
      content: section.content,
      subsections: section.subsections?.map((sub: any) => this.structureSection(sub)) || []
    };
  }
  
  private getHTMLStyles(style: string): string {
    const baseStyles = `
    <style>
      body {
        font-family: Arial, sans-serif;
        line-height: 1.6;
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
      }
      h1, h2, h3 { color: #333; }
      .metadata {
        background: #f4f4f4;
        padding: 10px;
        margin-bottom: 20px;
        border-radius: 5px;
      }
      .summary {
        background: #e8f4f8;
        padding: 15px;
        margin-bottom: 20px;
        border-left: 4px solid #2196F3;
      }
    `;
    
    const styleSpecific = {
      academic: 'body { font-family: "Times New Roman", serif; }',
      business: 'h1 { color: #1976d2; } h2 { color: #424242; }',
      technical: 'code { background: #f4f4f4; padding: 2px 4px; }',
      executive: '.summary { font-size: 1.1em; }'
    };
    
    return baseStyles + ((styleSpecific as any)[style] || '') + '</style>\n';
  }
  
  private formatMetadataHTML(metadata: any): string {
    let html = '<p><strong>Document Information</strong></p>\n<ul>\n';
    
    if (metadata.author) html += `<li><strong>Author:</strong> ${this.escapeHtml(metadata.author)}</li>\n`;
    if (metadata.date) html += `<li><strong>Date:</strong> ${this.escapeHtml(metadata.date)}</li>\n`;
    if (metadata.version) html += `<li><strong>Version:</strong> ${this.escapeHtml(metadata.version)}</li>\n`;
    
    html += '</ul>\n';
    return html;
  }
  
  private formatSectionHTML(section: any): string {
    const level = Math.min(section.level || 2, 6);
    let html = `<h${level}>${this.escapeHtml(section.title)}</h${level}>\n`;
    
    if (section.content) {
      html += `<p>${this.escapeHtml(section.content)}</p>\n`;
    }
    
    if (section.subsections) {
      section.subsections.forEach((subsection: any) => {
        html += this.formatSectionHTML({ ...subsection, level: level + 1 });
      });
    }
    
    return html;
  }
  
  private formatAcademicContent(content: string): string {
    return content
      .split('\n\n')
      .map(para => para.trim())
      .filter(para => para.length > 0)
      .join('\n\n') + '\n\n';
  }
  
  private formatExecutiveContent(content: string): string {
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    if (sentences.length <= 3) return content + '\n\n';
    
    const keyPoints = sentences.slice(0, 3).join(' ');
    return `**Key Points**: ${keyPoints}\n\n${content}\n\n`;
  }
  
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }
  
  private escapeHtml(text: string): string {
    const htmlEntities: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    
    return text.replace(/[&<>"']/g, match => htmlEntities[match]);
  }
  
  private wrapText(text: string, width: number): string {
    const words = text.split(' ');
    let line = '';
    let result = '';
    
    words.forEach(word => {
      if (line.length + word.length + 1 > width) {
        result += line + '\n';
        line = word;
      } else {
        line += (line ? ' ' : '') + word;
      }
    });
    
    if (line) result += line;
    return result;
  }
  
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
}