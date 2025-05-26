import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../utils/logger';

const analysisToolSchema = z.object({
  content: z.string().describe('The content to analyze'),
  analysisType: z.enum(['summary', 'key_points', 'sentiment', 'themes', 'comprehensive'])
    .optional()
    .default('comprehensive')
    .describe('Type of analysis to perform'),
  focusAreas: z.array(z.string())
    .optional()
    .default([])
    .describe('Specific areas to focus on during analysis')
});

export class AnalysisTool extends StructuredTool<typeof analysisToolSchema> {
  name = 'analysis_tool';
  description = 'Analyze text content for key insights, themes, and important information';
  schema = analysisToolSchema;

  async _call(input: z.infer<typeof analysisToolSchema>): Promise<string> {
    const result = await this.analyzeContent(input);
    return JSON.stringify(result);
  }

  private async analyzeContent(params: z.infer<typeof analysisToolSchema>): Promise<any> {
    const { content, analysisType = 'comprehensive', focusAreas = [] } = params;
    
    try {
      logger.info(`Performing ${analysisType} analysis`);
      
      const analysis: any = {
        type: analysisType,
        timestamp: new Date().toISOString(),
        contentLength: content.length,
        focusAreas
      };
      
      switch (analysisType) {
        case 'summary':
          analysis.summary = this.generateSummary(content);
          break;
          
        case 'key_points':
          analysis.keyPoints = this.extractKeyPoints(content);
          break;
          
        case 'sentiment':
          analysis.sentiment = this.analyzeSentiment(content);
          break;
          
        case 'themes':
          analysis.themes = this.identifyThemes(content);
          break;
          
        case 'comprehensive':
        default:
          analysis.summary = this.generateSummary(content);
          analysis.keyPoints = this.extractKeyPoints(content);
          analysis.themes = this.identifyThemes(content);
          analysis.sentiment = this.analyzeSentiment(content);
          break;
      }
      
      if (focusAreas.length > 0) {
        analysis.focusedInsights = this.analyzeFocusAreas(content, focusAreas);
      }
      
      return analysis;
    } catch (error) {
      logger.error('Analysis error:', error);
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private generateSummary(content: string): string {
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    const summaryLength = Math.min(3, sentences.length);
    return sentences.slice(0, summaryLength).join(' ').trim();
  }
  
  private extractKeyPoints(content: string): string[] {
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    return sentences
      .filter(s => s.length > 50)
      .slice(0, 5)
      .map(s => s.trim());
  }
  
  private analyzeSentiment(content: string): object {
    const positiveWords = ['good', 'great', 'excellent', 'positive', 'beneficial', 'success'];
    const negativeWords = ['bad', 'poor', 'negative', 'harmful', 'failure', 'problem'];
    
    const words = content.toLowerCase().split(/\s+/);
    const positiveCount = words.filter(w => positiveWords.includes(w)).length;
    const negativeCount = words.filter(w => negativeWords.includes(w)).length;
    
    let sentiment = 'neutral';
    if (positiveCount > negativeCount * 1.5) sentiment = 'positive';
    else if (negativeCount > positiveCount * 1.5) sentiment = 'negative';
    
    return {
      sentiment,
      positiveCount,
      negativeCount,
      confidence: 0.7
    };
  }
  
  private identifyThemes(content: string): string[] {
    const words = content.toLowerCase().split(/\s+/);
    const wordFreq: { [key: string]: number } = {};
    
    words.forEach(word => {
      if (word.length > 5) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
    
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }
  
  private analyzeFocusAreas(content: string, focusAreas: string[]): object {
    const insights: { [key: string]: string[] } = {};
    
    focusAreas.forEach(area => {
      const regex = new RegExp(`[^.]*${area}[^.]*\\.`, 'gi');
      const matches = content.match(regex) || [];
      insights[area] = matches.map(m => m.trim());
    });
    
    return insights;
  }
}