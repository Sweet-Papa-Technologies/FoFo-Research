import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../utils/logger';

const summarizationToolSchema = z.object({
  content: z.string().describe('The content to summarize'),
  summaryType: z.enum(['executive', 'bullet_points', 'abstract', 'key_findings'])
    .optional()
    .default('executive')
    .describe('Type of summary to generate'),
  maxLength: z.number()
    .optional()
    .default(200)
    .describe('Maximum length of summary in words')
});

export class SummarizationTool extends StructuredTool<typeof summarizationToolSchema> {
  name = 'summarization_tool';
  description = 'Generate concise summaries of text content';
  schema = summarizationToolSchema;

  async _call(input: z.infer<typeof summarizationToolSchema>): Promise<string> {
    return JSON.stringify(await this.generateSummary(input));
  }

  private async generateSummary(params: z.infer<typeof summarizationToolSchema>): Promise<any> {
    const { content, summaryType = 'executive', maxLength = 200 } = params;
    
    try {
      logger.info(`Generating ${summaryType} summary`);
      
      let summary: any = {
        type: summaryType,
        originalLength: content.split(/\s+/).length,
        timestamp: new Date().toISOString()
      };
      
      switch (summaryType) {
        case 'executive':
          summary.content = this.generateExecutiveSummary(content, maxLength);
          break;
          
        case 'bullet_points':
          summary.points = this.generateBulletPoints(content, maxLength);
          break;
          
        case 'abstract':
          summary.abstract = this.generateAbstract(content, maxLength);
          break;
          
        case 'key_findings':
          summary.findings = this.extractKeyFindings(content, maxLength);
          break;
      }
      
      summary.wordCount = this.countWords(summary.content || summary.abstract || '');
      
      return summary;
    } catch (error) {
      logger.error('Summarization error:', error);
      throw new Error(`Summarization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private generateExecutiveSummary(content: string, maxLength: number): string {
    const sentences = this.extractSentences(content);
    const importantSentences = this.rankSentences(sentences);
    return this.combineSentences(importantSentences, maxLength);
  }
  
  private generateBulletPoints(content: string, maxLength: number): string[] {
    const sentences = this.extractSentences(content);
    const rankedSentences = this.rankSentences(sentences);
    const wordsPerPoint = Math.floor(maxLength / 5);
    
    return rankedSentences
      .slice(0, 5)
      .map(s => this.truncateSentence(s, wordsPerPoint));
  }
  
  private generateAbstract(content: string, maxLength: number): string {
    const paragraphs = content.split(/\n\n+/);
    const firstPara = paragraphs[0] || '';
    const lastPara = paragraphs[paragraphs.length - 1] || '';
    
    const combined = `${firstPara} ${lastPara}`;
    return this.truncateToWords(combined, maxLength);
  }
  
  private extractKeyFindings(content: string, maxLength: number): string[] {
    const sentences = this.extractSentences(content);
    const findings = sentences.filter(s => 
      s.includes('found') || 
      s.includes('discovered') || 
      s.includes('shows') || 
      s.includes('indicates') ||
      s.includes('suggests') ||
      s.includes('reveals')
    );
    
    const wordsPerFinding = Math.floor(maxLength / Math.min(findings.length, 5));
    
    return findings
      .slice(0, 5)
      .map(f => this.truncateSentence(f, wordsPerFinding));
  }
  
  private extractSentences(content: string): string[] {
    return content.match(/[^.!?]+[.!?]+/g) || [];
  }
  
  private rankSentences(sentences: string[]): string[] {
    return sentences
      .map(s => ({
        sentence: s,
        score: this.calculateImportance(s)
      }))
      .sort((a, b) => b.score - a.score)
      .map(item => item.sentence);
  }
  
  private calculateImportance(sentence: string): number {
    let score = 0;
    
    if (sentence.length > 50) score += 1;
    if (sentence.includes(':')) score += 1;
    if (/\d+/.test(sentence)) score += 1;
    if (sentence.split(',').length > 2) score += 1;
    
    const importantWords = ['important', 'significant', 'key', 'major', 'critical', 'essential'];
    importantWords.forEach(word => {
      if (sentence.toLowerCase().includes(word)) score += 2;
    });
    
    return score;
  }
  
  private combineSentences(sentences: string[], maxWords: number): string {
    let result = '';
    let wordCount = 0;
    
    for (const sentence of sentences) {
      const sentenceWords = sentence.split(/\s+/).length;
      if (wordCount + sentenceWords <= maxWords) {
        result += sentence + ' ';
        wordCount += sentenceWords;
      } else {
        break;
      }
    }
    
    return result.trim();
  }
  
  private truncateSentence(sentence: string, maxWords: number): string {
    const words = sentence.trim().split(/\s+/);
    if (words.length <= maxWords) return sentence.trim();
    return words.slice(0, maxWords).join(' ') + '...';
  }
  
  private truncateToWords(text: string, maxWords: number): string {
    const words = text.split(/\s+/);
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(' ') + '...';
  }
  
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
}