import { logger } from '../utils/logger';
import crypto from 'crypto';

interface ContentSection {
  title: string;
  content: string;
  hash?: string;
}

export class DeduplicationService {
  private static instance: DeduplicationService;
  
  private constructor() {}
  
  static getInstance(): DeduplicationService {
    if (!DeduplicationService.instance) {
      DeduplicationService.instance = new DeduplicationService();
    }
    return DeduplicationService.instance;
  }
  
  /**
   * Remove duplicate content from report sections
   */
  deduplicateSections(sections: ContentSection[]): ContentSection[] {
    const seenHashes = new Set<string>();
    const deduplicatedSections: ContentSection[] = [];
    
    for (const section of sections) {
      const contentHash = this.hashContent(section.content);
      
      // Check for exact duplicates
      if (!seenHashes.has(contentHash)) {
        seenHashes.add(contentHash);
        deduplicatedSections.push({
          ...section,
          hash: contentHash
        });
      } else {
        logger.debug(`Removed duplicate section: ${section.title}`);
      }
    }
    
    return deduplicatedSections;
  }
  
  /**
   * Merge similar content across sections
   */
  mergeSimilarContent(content: string): string {
    const lines = content.split('\n').filter(line => line.trim());
    const uniqueLines = new Map<string, string>();
    const similarityThreshold = 0.85;
    
    for (const line of lines) {
      const normalizedLine = this.normalizeLine(line);
      let foundSimilar = false;
      
      // Check if this line is similar to any existing line
      for (const [key, existingLine] of uniqueLines) {
        if (this.calculateSimilarity(normalizedLine, key) > similarityThreshold) {
          // Keep the longer, more detailed version
          if (line.length > existingLine.length) {
            uniqueLines.set(key, line);
          }
          foundSimilar = true;
          break;
        }
      }
      
      if (!foundSimilar) {
        uniqueLines.set(normalizedLine, line);
      }
    }
    
    return Array.from(uniqueLines.values()).join('\n');
  }
  
  /**
   * Remove redundant key findings and conclusions
   */
  consolidateFindings(report: string): string {
    // Extract sections
    const sections = this.extractSections(report);
    
    // Identify and merge similar findings across sections
    const keyFindings = new Set<string>();
    const consolidatedSections: string[] = [];
    
    for (const section of sections) {
      if (section.toLowerCase().includes('key findings') || 
          section.toLowerCase().includes('summary') ||
          section.toLowerCase().includes('conclusion')) {
        
        // Extract bullet points or numbered items
        const findings = this.extractFindings(section);
        findings.forEach(finding => keyFindings.add(finding));
      } else {
        consolidatedSections.push(section);
      }
    }
    
    // Add a single consolidated findings section
    if (keyFindings.size > 0) {
      consolidatedSections.unshift(this.formatKeyFindings(Array.from(keyFindings)));
    }
    
    return consolidatedSections.join('\n\n');
  }
  
  private hashContent(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }
  
  private normalizeLine(line: string): string {
    return line.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  private extractSections(report: string): string[] {
    // Split by common section headers
    const sectionPatterns = [
      /^#{1,3}\s+.+$/gm,
      /^\*\*[^*]+\*\*$/gm,
      /^[A-Z][^.!?]+:$/gm
    ];
    
    const sections: string[] = [];
    let lastIndex = 0;
    const indices: number[] = [];
    
    for (const pattern of sectionPatterns) {
      const matches = Array.from(report.matchAll(pattern));
      matches.forEach(match => {
        if (match.index !== undefined) {
          indices.push(match.index);
        }
      });
    }
    
    indices.sort((a, b) => a - b);
    
    for (const index of indices) {
      if (index > lastIndex) {
        sections.push(report.substring(lastIndex, index).trim());
        lastIndex = index;
      }
    }
    
    if (lastIndex < report.length) {
      sections.push(report.substring(lastIndex).trim());
    }
    
    return sections.filter(s => s.length > 0);
  }
  
  private extractFindings(section: string): string[] {
    const findings: string[] = [];
    
    // Extract bullet points
    const bulletMatches = section.match(/^[\s]*[-*•]\s+(.+)$/gm);
    if (bulletMatches) {
      findings.push(...bulletMatches.map(m => m.replace(/^[\s]*[-*•]\s+/, '').trim()));
    }
    
    // Extract numbered items
    const numberedMatches = section.match(/^[\s]*\d+[.)]\s+(.+)$/gm);
    if (numberedMatches) {
      findings.push(...numberedMatches.map(m => m.replace(/^[\s]*\d+[.)]\s+/, '').trim()));
    }
    
    return findings;
  }
  
  private formatKeyFindings(findings: string[]): string {
    const uniqueFindings = [...new Set(findings)];
    return `## Key Findings\n\n${uniqueFindings.map((f, i) => `${i + 1}. ${f}`).join('\n')}`;
  }
}