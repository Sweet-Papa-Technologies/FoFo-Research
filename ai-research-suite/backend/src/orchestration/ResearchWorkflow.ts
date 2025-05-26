import { Team, Task } from 'kaibanjs';
import { createResearchAgent } from './agents/ResearchAgent';
import { createAnalystAgent } from './agents/AnalystAgent';
import { createWriterAgent } from './agents/WriterAgent';
import { logger } from '../utils/logger';
import { emitProgressUpdate, emitStatusChange } from '../utils/websocket';

export interface WorkflowConfig {
  sessionId: string;
  topic: string;
  parameters: {
    maxSources: number;
    minSources: number;
    reportLength: 'short' | 'medium' | 'long' | 'comprehensive';
    allowedDomains?: string[];
    blockedDomains?: string[];
    depth: 'surface' | 'standard' | 'comprehensive';
    language?: string;
    dateRange?: string;
  };
  llmConfig: {
    provider: string;
    model: string;
    apiKey?: string;
  };
}

export class ResearchWorkflow {
  private team: Team;
  private config: WorkflowConfig;
  
  constructor(config: WorkflowConfig) {
    this.config = config;
    
    const researchAgent = createResearchAgent({
      name: 'Primary Researcher',
      llmConfig: config.llmConfig
    });
    
    const analystAgent = createAnalystAgent({
      name: 'Data Analyst',
      llmConfig: config.llmConfig
    });
    
    const writerAgent = createWriterAgent({
      name: 'Report Writer',
      llmConfig: config.llmConfig
    });
    
    // Create tasks for the workflow
    const researchTask = new Task({
      description: this.createResearchPrompt(),
      agent: researchAgent,
      expectedOutput: 'Comprehensive research findings with sources'
    });
    
    const analysisTask = new Task({
      description: 'Analyze the research findings and extract key insights',
      agent: analystAgent,
      expectedOutput: 'Detailed analysis with key findings and patterns'
    });
    
    const writingTask = new Task({
      description: 'Create a well-structured report from the analysis',
      agent: writerAgent,
      expectedOutput: 'Final formatted research report'
    });
    
    this.team = new Team({
      name: 'Research Team',
      agents: [researchAgent, analystAgent, writerAgent],
      tasks: [researchTask, analysisTask, writingTask],
      inputs: {
        topic: config.topic,
        parameters: config.parameters
      }
    });
  }

  private createResearchPrompt(): string {
    const { topic, parameters } = this.config;
    return `
    Research the following topic comprehensively: ${topic}
    
    Parameters:
    - Maximum sources: ${parameters.maxSources}
    - Minimum sources: ${parameters.minSources}
    - Report depth: ${parameters.depth}
    - Language: ${parameters.language || 'en'}
    ${parameters.allowedDomains ? `- Allowed domains: ${parameters.allowedDomains.join(', ')}` : ''}
    ${parameters.blockedDomains ? `- Blocked domains: ${parameters.blockedDomains.join(', ')}` : ''}
    
    Your task:
    1. Search for relevant and authoritative sources
    2. Analyze the information found
    3. Extract key insights and findings
    4. Ensure proper citation of all sources
    5. Focus on accuracy and comprehensiveness
    `;
  }
  
  async execute(): Promise<any> {
    try {
      logger.info(`Starting research workflow for topic: ${this.config.topic}`);
      emitStatusChange({
        sessionId: this.config.sessionId,
        status: 'processing',
        message: 'Research workflow started'
      });
      
      // Execute the team workflow
      const result = await this.team.start();
      
      emitProgressUpdate({
        sessionId: this.config.sessionId,
        progress: {
          percentage: 100,
          currentPhase: 'completed',
          phasesCompleted: ['research', 'analysis', 'writing'],
          estimatedTimeRemaining: 0
        }
      });
      
      emitStatusChange({
        sessionId: this.config.sessionId,
        status: 'completed',
        message: 'Research workflow completed successfully'
      });
      
      // Process and format the results
      return this.processResults(result);
      
    } catch (error) {
      logger.error('Research workflow error:', error);
      emitStatusChange({
        sessionId: this.config.sessionId,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }
  
  private processResults(result: any): any {
    // KaibanJS returns the final output directly as a string
    let content = '';
    let reportOutput = '';
    
    if (typeof result === 'string') {
      // Direct string output from the workflow
      content = result;
      reportOutput = result;
    } else if (result && typeof result === 'object') {
      // Check various possible locations for the output
      if (result.output) {
        content = result.output;
        reportOutput = result.output;
      } else if (result.result) {
        content = result.result;
        reportOutput = result.result;
      } else if (result.tasks && Array.isArray(result.tasks)) {
        // Legacy format with task array
        const taskResults = result.tasks;
        reportOutput = taskResults[2]?.output || taskResults[taskResults.length - 1]?.output || '';
        content = reportOutput;
      }
    }
    
    // Clean up markdown code blocks if present
    if (content.startsWith('```markdown') && content.endsWith('```')) {
      content = content.slice(11, -3).trim();
    } else if (content.startsWith('```') && content.endsWith('```')) {
      content = content.slice(3, -3).trim();
    }
    
    return {
      content: content,
      summary: this.extractSummary(content),
      keyFindings: this.extractKeyFindings(content),
      sources: this.extractSources(content),
      citations: this.extractCitations(content),
      metadata: {
        topic: this.config.topic,
        generatedAt: new Date().toISOString(),
        parameters: this.config.parameters,
        statistics: {
          totalSources: this.extractSources(content).length,
          analyzedSources: 0,
          searchQueries: 0,
          processingTime: Date.now() - new Date().getTime()
        }
      }
    };
  }
  
  private extractSources(output: any): any[] {
    // Extract sources from the research output
    if (!output) return [];
    
    if (typeof output === 'string') {
      // Parse sources from string output
      const sourcePattern = /\[([^\]]+)\]\(([^)]+)\)/g;
      const sources: any[] = [];
      let match;
      
      while ((match = sourcePattern.exec(output)) !== null) {
        sources.push({
          title: match[1],
          url: match[2]
        });
      }
      
      return sources;
    }
    
    return output.sources || [];
  }
  
  private extractSummary(report: any): string {
    if (!report) return '';
    
    if (typeof report === 'string') {
      // Try to extract Executive Summary section
      const summaryMatch = report.match(/##\s*Executive Summary\s*\n+([^#]+)/i);
      if (summaryMatch) {
        return summaryMatch[1].trim();
      }
      
      // If no executive summary, try to get the first paragraph after the title
      const lines = report.split('\n').filter(line => line.trim());
      let foundTitle = false;
      let summary = '';
      
      for (const line of lines) {
        if (line.startsWith('#') && !line.startsWith('##')) {
          foundTitle = true;
          continue;
        }
        if (foundTitle && line.trim() && !line.startsWith('#')) {
          summary = line.trim();
          break;
        }
      }
      
      return summary || 'No summary available';
    }
    
    return report.summary || '';
  }
  
  private extractKeyFindings(report: any): string[] {
    if (!report) return [];
    
    if (typeof report === 'string') {
      const findings: string[] = [];
      
      // Look for Key Findings section
      const keyFindingsMatch = report.match(/##\s*Key Findings\s*\n+([^#]+)/i);
      if (keyFindingsMatch) {
        const findingsText = keyFindingsMatch[1].trim();
        
        // Extract each finding (usually starts with ###)
        const findingMatches = findingsText.match(/###\s*([^\n]+)/g);
        if (findingMatches) {
          findingMatches.forEach(match => {
            findings.push(match.replace(/^###\s*/, '').trim());
          });
        }
        
        // If no ### headers, try bullet points
        if (findings.length === 0) {
          const bulletMatches = findingsText.match(/[-*]\s*([^\n]+)/g);
          if (bulletMatches) {
            bulletMatches.forEach(match => {
              findings.push(match.replace(/^[-*]\s*/, '').trim());
            });
          }
        }
      }
      
      return findings;
    }
    
    // Handle structured data
    if (report.keyFindings) {
      return Array.isArray(report.keyFindings) 
        ? report.keyFindings 
        : [report.keyFindings];
    }
    
    return [];
  }
  
  private extractCitations(report: any): any[] {
    if (!report) return [];
    
    if (typeof report === 'string') {
      const citations: Array<{ id: string; text: string; url?: string }> = [];
      
      // Look for References section
      const referencesMatch = report.match(/##\s*References\s*\n+([^#]+)$/i);
      if (referencesMatch) {
        const referencesText = referencesMatch[1].trim();
        
        // Match numbered references like [1] Author et al. (2024)
        const numberedRefs = referencesText.match(/\[(\d+)\]\s*([^\n]+)/g);
        if (numberedRefs) {
          numberedRefs.forEach(ref => {
            const match = ref.match(/\[(\d+)\]\s*(.+)/);
            if (match) {
              citations.push({
                id: `cite-${match[1]}`,
                text: match[2].trim()
              });
            }
          });
        }
      }
      
      // Also look for inline citations with links
      const inlineCitations = report.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
      inlineCitations.forEach((match: string, index: number) => {
        const parts = match.match(/\[([^\]]+)\]\(([^)]+)\)/);
        if (parts && parts[2].startsWith('http')) {
          citations.push({
            id: `cite-inline-${index + 1}`,
            text: parts[1],
            url: parts[2]
          });
        }
      });
      
      return citations;
    }
    
    if (report.citations) {
      return report.citations;
    }
    
    return [];
  }
}