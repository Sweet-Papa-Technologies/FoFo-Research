import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../utils/logger';

const factCheckToolSchema = z.object({
  claim: z.string().describe('The claim or fact to verify'),
  sources: z.array(z.object({
    url: z.string().optional(),
    content: z.string().optional(),
    credibility: z.number().optional()
  }))
    .optional()
    .default([])
    .describe('Sources to cross-reference for verification'),
  context: z.string()
    .optional()
    .default('')
    .describe('Additional context for the claim')
});

export class FactCheckTool extends StructuredTool<typeof factCheckToolSchema> {
  name = 'fact_check_tool';
  description = 'Verify facts and claims by cross-referencing multiple sources';
  schema = factCheckToolSchema;

  async _call(input: z.infer<typeof factCheckToolSchema>): Promise<string> {
    const result = await this.verifyFact(input);
    return JSON.stringify(result);
  }

  private async verifyFact(params: z.infer<typeof factCheckToolSchema>): Promise<any> {
    const { claim, sources = [], context = '' } = params;
    
    try {
      logger.info(`Fact-checking claim: ${claim}`);
      
      const verification = {
        claim,
        timestamp: new Date().toISOString(),
        status: 'unverified',
        confidence: 0,
        supporting: [] as any[],
        contradicting: [] as any[],
        neutral: [] as any[],
        analysis: ''
      };
      
      if (sources.length === 0) {
        verification.status = 'insufficient_sources';
        verification.analysis = 'No sources provided for fact-checking';
        return verification;
      }
      
      sources.forEach((source: any) => {
        const assessment = this.assessSourceRelevance(claim, source.content, context);
        
        if (assessment.supports) {
          verification.supporting.push({
            url: source.url,
            relevance: assessment.relevance,
            credibility: source.credibility || 0.5,
            excerpt: assessment.excerpt
          });
        } else if (assessment.contradicts) {
          verification.contradicting.push({
            url: source.url,
            relevance: assessment.relevance,
            credibility: source.credibility || 0.5,
            excerpt: assessment.excerpt
          });
        } else {
          verification.neutral.push({
            url: source.url,
            relevance: assessment.relevance,
            credibility: source.credibility || 0.5
          });
        }
      });
      
      verification.confidence = this.calculateConfidence(
        verification.supporting,
        verification.contradicting,
        verification.neutral
      );
      
      verification.status = this.determineStatus(
        verification.confidence,
        verification.supporting.length,
        verification.contradicting.length
      );
      
      verification.analysis = this.generateAnalysis(verification);
      
      return verification;
    } catch (error) {
      logger.error('Fact-checking error:', error);
      throw new Error(`Fact-checking failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private assessSourceRelevance(claim: string, content: string, _context: string): any {
    const claimWords = claim.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();
    
    let relevanceScore = 0;
    let matchedWords = 0;
    
    claimWords.forEach(word => {
      if (word.length > 3 && contentLower.includes(word)) {
        matchedWords++;
      }
    });
    
    relevanceScore = matchedWords / claimWords.length;
    
    const supportingPhrases = ['confirms', 'supports', 'validates', 'proves', 'demonstrates'];
    const contradictingPhrases = ['denies', 'refutes', 'contradicts', 'disputes', 'challenges'];
    
    let supports = false;
    let contradicts = false;
    
    supportingPhrases.forEach(phrase => {
      if (contentLower.includes(phrase)) supports = true;
    });
    
    contradictingPhrases.forEach(phrase => {
      if (contentLower.includes(phrase)) contradicts = true;
    });
    
    const excerpt = this.extractRelevantExcerpt(content, claimWords);
    
    return {
      relevance: relevanceScore,
      supports,
      contradicts,
      excerpt
    };
  }
  
  private extractRelevantExcerpt(content: string, keywords: string[]): string {
    const sentences = content.match(/[^.!?]+[.!?]+/g) || [];
    let bestSentence = '';
    let bestScore = 0;
    
    sentences.forEach(sentence => {
      let score = 0;
      keywords.forEach(keyword => {
        if (sentence.toLowerCase().includes(keyword)) {
          score++;
        }
      });
      
      if (score > bestScore) {
        bestScore = score;
        bestSentence = sentence.trim();
      }
    });
    
    return bestSentence || sentences[0] || '';
  }
  
  private calculateConfidence(supporting: any[], contradicting: any[], neutral: any[]): number {
    const totalSources = supporting.length + contradicting.length + neutral.length;
    
    if (totalSources === 0) return 0;
    
    const supportWeight = supporting.reduce((sum, s) => sum + (s.credibility * s.relevance), 0);
    const contradictWeight = contradicting.reduce((sum, s) => sum + (s.credibility * s.relevance), 0);
    
    const netSupport = supportWeight - contradictWeight;
    const maxPossible = totalSources;
    
    const confidence = Math.max(0, Math.min(1, (netSupport + maxPossible) / (2 * maxPossible)));
    
    return Math.round(confidence * 100) / 100;
  }
  
  private determineStatus(confidence: number, supportingCount: number, contradictingCount: number): string {
    if (confidence >= 0.8 && supportingCount >= 2) return 'verified';
    if (confidence >= 0.6 && supportingCount > contradictingCount) return 'likely_true';
    if (confidence >= 0.4 && confidence <= 0.6) return 'uncertain';
    if (confidence < 0.4 && contradictingCount > supportingCount) return 'likely_false';
    if (confidence < 0.2 && contradictingCount >= 2) return 'false';
    return 'unverified';
  }
  
  private generateAnalysis(verification: any): string {
    const { status, supporting, contradicting, confidence } = verification;
    
    let analysis = `Fact-check status: ${status} (Confidence: ${Math.round(confidence * 100)}%)\n`;
    
    if (supporting.length > 0) {
      analysis += `\nSupporting sources (${supporting.length}): `;
      analysis += supporting.map((s: any) => `credibility: ${Math.round(s.credibility * 100)}%`).join(', ');
    }
    
    if (contradicting.length > 0) {
      analysis += `\nContradicting sources (${contradicting.length}): `;
      analysis += contradicting.map((s: any) => `credibility: ${Math.round(s.credibility * 100)}%`).join(', ');
    }
    
    return analysis;
  }
}