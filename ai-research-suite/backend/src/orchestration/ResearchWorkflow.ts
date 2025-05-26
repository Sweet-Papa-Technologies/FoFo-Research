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
    // Extract results from the team execution
    const taskResults = result.tasks || [];
    
    return {
      content: taskResults[2]?.output || '', // Writing task output
      summary: this.extractSummary(taskResults[2]?.output),
      keyFindings: this.extractKeyFindings(taskResults[1]?.output),
      sources: this.extractSources(taskResults[0]?.output),
      citations: this.extractCitations(taskResults[2]?.output),
      metadata: {
        topic: this.config.topic,
        generatedAt: new Date().toISOString(),
        parameters: this.config.parameters,
        statistics: {
          totalSources: 0,
          analyzedSources: 0,
          searchQueries: 0,
          processingTime: Date.now() - parseInt(this.config.sessionId.split('-')[0])
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
    if (typeof report === 'string') {
      const summaryMatch = report.match(/## Executive Summary\n\n([^#]+)/);
      return summaryMatch ? summaryMatch[1].trim() : '';
    }
    return report.summary || '';
  }
  
  private extractKeyFindings(analysisResults: any): string[] {
    if (analysisResults.keyFindings) {
      return analysisResults.keyFindings;
    }
    
    const findings = [];
    
    if (analysisResults.themes) {
      findings.push(`Key themes identified: ${analysisResults.themes.join(', ')}`);
    }
    
    if (analysisResults.insights) {
      findings.push(...analysisResults.insights);
    }
    
    return findings;
  }
  
  private extractCitations(report: any): any[] {
    if (report.citations) {
      return report.citations;
    }
    
    const reportText = typeof report === 'string' ? report : report.content || '';
    const citations: Array<{ id: string; text: string; url: string }> = [];
    
    const citationMatches = reportText.match(/\[([^\]]+)\]\(([^)]+)\)/g) || [];
    
    citationMatches.forEach((match: string, index: number) => {
      const parts = match.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (parts) {
        citations.push({
          id: `cite-${index + 1}`,
          text: parts[1],
          url: parts[2]
        });
      }
    });
    
    return citations;
  }
}