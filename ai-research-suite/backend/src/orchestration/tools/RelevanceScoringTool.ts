import { StructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { logger } from '../../utils/logger';

const relevanceScoringToolSchema = z.object({
  topic: z.string().describe('The research topic or query'),
  content: z.string().describe('The content to score for relevance'),
  criteria: z.object({
    keywords: z.array(z.string())
      .optional()
      .describe('Important keywords that should be present'),
    requiredConcepts: z.array(z.string())
      .optional()
      .describe('Concepts that must be covered'),
    excludeTerms: z.array(z.string())
      .optional()
      .describe('Terms that reduce relevance if present')
  })
    .optional()
    .default({})
    .describe('Specific criteria for relevance scoring'),
  metadata: z.object({
    source: z.string().optional(),
    publishDate: z.string().optional(),
    author: z.string().optional(),
    domain: z.string().optional()
  })
    .optional()
    .default({})
    .describe('Additional metadata about the content')
});

export class RelevanceScoringTool extends StructuredTool<typeof relevanceScoringToolSchema> {
  name = 'relevance_scoring_tool';
  description = 'Score the relevance of content against a research topic or query';
  schema = relevanceScoringToolSchema;

  async _call(input: z.infer<typeof relevanceScoringToolSchema>): Promise<string> {
    const result = await this.scoreRelevance(input);
    return JSON.stringify(result);
  }

  private async scoreRelevance(params: z.infer<typeof relevanceScoringToolSchema>): Promise<any> {
    const { topic, content, criteria = {}, metadata = {} } = params;
    
    try {
      logger.info(`Scoring relevance for topic: ${topic}`);
      
      const scoring = {
        topic,
        timestamp: new Date().toISOString(),
        overallScore: 0,
        scores: {
          topicRelevance: 0,
          keywordMatch: 0,
          conceptCoverage: 0,
          contentQuality: 0,
          sourceCredibility: 0,
          freshness: 0
        },
        analysis: {
          matchedKeywords: [] as string[],
          coveredConcepts: [] as string[],
          excludedTermsFound: [] as string[],
          strengths: [] as string[],
          weaknesses: [] as string[]
        },
        recommendation: ''
      };
      
      scoring.scores.topicRelevance = this.calculateTopicRelevance(topic, content);
      
      if (criteria.keywords) {
        const keywordResult = this.scoreKeywordMatch(content, criteria.keywords);
        scoring.scores.keywordMatch = keywordResult.score;
        scoring.analysis.matchedKeywords = keywordResult.matched as string[];
      }
      
      if (criteria.requiredConcepts) {
        const conceptResult = this.scoreConceptCoverage(content, criteria.requiredConcepts);
        scoring.scores.conceptCoverage = conceptResult.score;
        scoring.analysis.coveredConcepts = conceptResult.covered as string[];
      }
      
      if (criteria.excludeTerms) {
        const excludeResult = this.checkExcludedTerms(content, criteria.excludeTerms);
        scoring.analysis.excludedTermsFound = excludeResult.found as string[];
        if (excludeResult.found.length > 0) {
          scoring.scores.topicRelevance *= 0.8;
        }
      }
      
      scoring.scores.contentQuality = this.assessContentQuality(content);
      
      if (metadata.domain) {
        scoring.scores.sourceCredibility = this.assessSourceCredibility(metadata);
      }
      
      if (metadata.publishDate) {
        scoring.scores.freshness = this.assessFreshness(metadata.publishDate);
      }
      
      scoring.overallScore = this.calculateOverallScore(scoring.scores);
      
      scoring.analysis.strengths = this.identifyStrengths(scoring.scores);
      scoring.analysis.weaknesses = this.identifyWeaknesses(scoring.scores);
      
      scoring.recommendation = this.generateRecommendation(scoring.overallScore);
      
      return scoring;
    } catch (error) {
      logger.error('Relevance scoring error:', error);
      throw new Error(`Relevance scoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private calculateTopicRelevance(topic: string, content: string): number {
    const topicWords = topic.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const contentLower = content.toLowerCase();
    const contentWords = contentLower.split(/\s+/);
    
    let matchCount = 0;
    let proximityScore = 0;
    
    topicWords.forEach(word => {
      const occurrences = (contentLower.match(new RegExp(word, 'g')) || []).length;
      if (occurrences > 0) {
        matchCount++;
        proximityScore += Math.min(occurrences / contentWords.length * 100, 1);
      }
    });
    
    const coverage = matchCount / topicWords.length;
    const density = proximityScore / topicWords.length;
    
    return Math.min((coverage * 0.7 + density * 0.3), 1);
  }
  
  private scoreKeywordMatch(content: string, keywords: string[]): any {
    const contentLower = content.toLowerCase();
    const matched: any[] = [];
    let totalScore = 0;
    
    keywords.forEach(keyword => {
      const keywordLower = keyword.toLowerCase();
      const occurrences = (contentLower.match(new RegExp(keywordLower, 'g')) || []).length;
      
      if (occurrences > 0) {
        matched.push({
          keyword,
          occurrences,
          score: Math.min(occurrences / 10, 1)
        });
        totalScore += Math.min(occurrences / 10, 1);
      }
    });
    
    return {
      score: keywords.length > 0 ? totalScore / keywords.length : 0,
      matched
    };
  }
  
  private scoreConceptCoverage(content: string, concepts: string[]): any {
    const contentLower = content.toLowerCase();
    const covered: string[] = [];
    let totalScore = 0;
    
    concepts.forEach(concept => {
      const conceptWords = concept.toLowerCase().split(/\s+/);
      let conceptFound = true;
      
      conceptWords.forEach(word => {
        if (!contentLower.includes(word)) {
          conceptFound = false;
        }
      });
      
      if (conceptFound) {
        covered.push(concept);
        totalScore += 1;
      }
    });
    
    return {
      score: concepts.length > 0 ? totalScore / concepts.length : 0,
      covered
    };
  }
  
  private checkExcludedTerms(content: string, excludeTerms: string[]): any {
    const contentLower = content.toLowerCase();
    const found: string[] = [];
    
    excludeTerms.forEach(term => {
      if (contentLower.includes(term.toLowerCase())) {
        found.push(term);
      }
    });
    
    return { found };
  }
  
  private assessContentQuality(content: string): number {
    const words = content.split(/\s+/);
    const sentences = content.match(/[.!?]+/g) || [];
    
    let qualityScore = 0;
    
    if (words.length >= 100) qualityScore += 0.25;
    if (words.length >= 300) qualityScore += 0.25;
    
    if (sentences.length >= 5) qualityScore += 0.25;
    
    const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
    if (avgWordsPerSentence >= 10 && avgWordsPerSentence <= 25) {
      qualityScore += 0.25;
    }
    
    return qualityScore;
  }
  
  private assessSourceCredibility(metadata: any): number {
    let credibilityScore = 0.5;
    
    const trustedDomains = ['.edu', '.gov', '.org', 'wikipedia.org', 'nature.com', 'sciencedirect.com'];
    const domain = metadata.domain || '';
    
    trustedDomains.forEach(trusted => {
      if (domain.includes(trusted)) {
        credibilityScore = 0.9;
      }
    });
    
    if (metadata.author && metadata.author !== 'Unknown') {
      credibilityScore += 0.1;
    }
    
    return Math.min(credibilityScore, 1);
  }
  
  private assessFreshness(publishDate: string): number {
    try {
      const published = new Date(publishDate);
      const now = new Date();
      const daysDiff = (now.getTime() - published.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff <= 30) return 1;
      if (daysDiff <= 180) return 0.8;
      if (daysDiff <= 365) return 0.6;
      if (daysDiff <= 730) return 0.4;
      return 0.2;
    } catch {
      return 0.5;
    }
  }
  
  private calculateOverallScore(scores: any): number {
    const weights = {
      topicRelevance: 0.35,
      keywordMatch: 0.15,
      conceptCoverage: 0.15,
      contentQuality: 0.15,
      sourceCredibility: 0.1,
      freshness: 0.1
    };
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    Object.entries(weights).forEach(([key, weight]) => {
      if (scores[key] !== undefined && scores[key] > 0) {
        weightedSum += scores[key] * weight;
        totalWeight += weight;
      }
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }
  
  private identifyStrengths(scores: any): string[] {
    const strengths = [];
    
    if (scores.topicRelevance >= 0.8) strengths.push('Highly relevant to topic');
    if (scores.keywordMatch >= 0.7) strengths.push('Strong keyword coverage');
    if (scores.conceptCoverage >= 0.8) strengths.push('Comprehensive concept coverage');
    if (scores.contentQuality >= 0.75) strengths.push('High quality content');
    if (scores.sourceCredibility >= 0.8) strengths.push('Credible source');
    if (scores.freshness >= 0.8) strengths.push('Recent publication');
    
    return strengths;
  }
  
  private identifyWeaknesses(scores: any): string[] {
    const weaknesses = [];
    
    if (scores.topicRelevance < 0.5) weaknesses.push('Low topic relevance');
    if (scores.keywordMatch < 0.3) weaknesses.push('Poor keyword coverage');
    if (scores.conceptCoverage < 0.5) weaknesses.push('Missing key concepts');
    if (scores.contentQuality < 0.5) weaknesses.push('Low content quality');
    if (scores.sourceCredibility < 0.5) weaknesses.push('Questionable source credibility');
    if (scores.freshness < 0.4) weaknesses.push('Outdated content');
    
    return weaknesses;
  }
  
  private generateRecommendation(overallScore: number): string {
    if (overallScore >= 0.8) return 'Highly recommended - Excellent relevance and quality';
    if (overallScore >= 0.6) return 'Recommended - Good relevance with minor limitations';
    if (overallScore >= 0.4) return 'Consider with caution - Moderate relevance';
    if (overallScore >= 0.2) return 'Not recommended - Low relevance';
    return 'Exclude - Insufficient relevance';
  }
}