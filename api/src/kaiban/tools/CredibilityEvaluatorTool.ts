import { Tool } from "@langchain/core/tools";
import { z } from 'zod';

/**
 * Custom tool for evaluating the credibility of sources
 * Assesses reliability, reputation, and quality of research sources
 */
export class CredibilityEvaluatorTool extends Tool {
  static schema = z.object({
    input: z.string().describe("JSON string containing url, optional content, and optional metadata")
  });

  name: string;
  description: string;

  constructor() {
    super();
    this.name = "credibility_evaluator";
    this.description = "Evaluates the credibility of research sources based on various factors. Input should be a JSON string with url (required), content (optional), and metadata (optional).";
  }

  async _call(input: string): Promise<string> {
    try {
      const parsedInput = JSON.parse(input);
      const { url, content, metadata } = parsedInput;
      
      // Domain credibility factors
      const credibilityFactors = this.analyzeDomainCredibility(url);
      
      // Content analysis if available
      let contentAnalysis = {};
      if (content) {
        contentAnalysis = this.analyzeContentCredibility(content);
      }
      
      // Metadata analysis if available
      let metadataAnalysis = {};
      if (metadata) {
        metadataAnalysis = this.analyzeMetadata(metadata);
      }
      
      // Calculate overall credibility score (0-100)
      const overallScore = this.calculateCredibilityScore(
        credibilityFactors, 
        contentAnalysis, 
        metadataAnalysis
      );
      
      // Prepare the evaluation result
      const result = {
        url,
        overallScore,
        credibilityRating: this.getCredibilityRating(overallScore),
        domainAnalysis: credibilityFactors,
        contentAnalysis,
        metadataAnalysis,
        evaluationTimestamp: new Date().toISOString()
      };
      
      return JSON.stringify(result);
    } catch (error) {
      console.error("Error in CredibilityEvaluatorTool:", error);
      return JSON.stringify({
        error: "Failed to evaluate source credibility",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
  
  private analyzeDomainCredibility(url: string) {
    // Extract domain from URL
    const domain = new URL(url).hostname;
    
    // Check domain against known credible sources
    // This is a simplified implementation - in production, this would use a database or API
    const knownSources = {
      "wikipedia.org": { credibility: "medium", category: "encyclopedia", notes: "User-generated content, generally reliable but verify" },
      "bbc.com": { credibility: "high", category: "news", notes: "Established news organization with editorial standards" },
      "cnn.com": { credibility: "medium", category: "news", notes: "Mainstream news source" },
      "github.com": { credibility: "medium", category: "technology", notes: "Code sharing platform, quality varies by repository" },
      "arxiv.org": { credibility: "high", category: "academic", notes: "Pre-print academic papers, not necessarily peer-reviewed" },
      "nature.com": { credibility: "very high", category: "academic", notes: "Peer-reviewed scientific journal" },
      "medium.com": { credibility: "low", category: "blog", notes: "User-generated content with minimal verification" }
    };
    
    // Check if domain or parent domain is in the known sources list
    let sourceInfo = { credibility: "unknown", category: "unknown", notes: "Not in database" };
    for (const knownDomain in knownSources) {
      if (domain.includes(knownDomain)) {
        sourceInfo = knownSources[knownDomain as keyof typeof knownSources];
        break;
      }
    }
    
    // Domain age and reputation factors
    // In production, this would call a domain reputation service
    const domainFactors = {
      domainAge: "unknown",
      secureConnection: url.startsWith("https"),
      tldReputation: this.assessTldReputation(domain)
    };
    
    return {
      domain,
      sourceInfo,
      domainFactors
    };
  }
  
  private assessTldReputation(domain: string) {
    const tld = domain.split('.').pop();
    
    // Basic TLD reputation assessment
    const tldReputations: Record<string, string> = {
      "edu": "high",
      "gov": "high",
      "org": "medium",
      "com": "medium",
      "net": "medium",
      "io": "medium",
      "info": "low",
      "biz": "low"
    };
    
    return tldReputations[tld as keyof typeof tldReputations] || "unknown";
  }
  
  private analyzeContentCredibility(content: string) {
    // Simplified content analysis - in production would use more sophisticated NLP
    const contentLength = content.length;
    const hasReferences = content.includes("reference") || content.includes("citation") || content.includes("source");
    const readabilityScore = "medium"; // Would use a readability algorithm in production
    
    return {
      contentLength,
      hasReferences,
      readabilityScore,
      sentimentAnalysis: "neutral" // Would use sentiment analysis in production
    };
  }
  
  private analyzeMetadata(metadata: Record<string, any>) {
    // Extract relevant metadata for credibility assessment
    const hasAuthor = !!metadata.author;
    const hasPublishDate = !!metadata.publishDate;
    const isRecent = hasPublishDate ? 
      (new Date().getTime() - new Date(metadata.publishDate).getTime()) < (365 * 24 * 60 * 60 * 1000) : 
      false;
    
    return {
      hasAuthor,
      hasPublishDate,
      isRecent,
      authorCredentials: metadata.authorCredentials || "unknown"
    };
  }
  
  private calculateCredibilityScore(
    domainFactors: any, 
    contentFactors: any, 
    metadataFactors: any
  ) {
    // This is a simplified scoring algorithm
    // In production, would use a weighted model
    
    let score = 50; // Start at neutral
    
    // Domain factors
    if (domainFactors.sourceInfo.credibility === "very high") score += 25;
    else if (domainFactors.sourceInfo.credibility === "high") score += 15;
    else if (domainFactors.sourceInfo.credibility === "medium") score += 5;
    else if (domainFactors.sourceInfo.credibility === "low") score -= 10;
    
    if (domainFactors.domainFactors.secureConnection) score += 5;
    
    if (domainFactors.domainFactors.tldReputation === "high") score += 10;
    else if (domainFactors.domainFactors.tldReputation === "medium") score += 5;
    else if (domainFactors.domainFactors.tldReputation === "low") score -= 5;
    
    // Content factors (if available)
    if (Object.keys(contentFactors).length > 0) {
      if (contentFactors.hasReferences) score += 10;
      if (contentFactors.contentLength > 2000) score += 5;
      if (contentFactors.readabilityScore === "high") score += 5;
    }
    
    // Metadata factors (if available)
    if (Object.keys(metadataFactors).length > 0) {
      if (metadataFactors.hasAuthor) score += 5;
      if (metadataFactors.hasPublishDate) score += 5;
      if (metadataFactors.isRecent) score += 5;
    }
    
    // Ensure score stays within 0-100 range
    return Math.max(0, Math.min(100, score));
  }
  
  private getCredibilityRating(score: number) {
    if (score >= 80) return "very high";
    if (score >= 60) return "high";
    if (score >= 40) return "medium";
    if (score >= 20) return "low";
    return "very low";
  }
}