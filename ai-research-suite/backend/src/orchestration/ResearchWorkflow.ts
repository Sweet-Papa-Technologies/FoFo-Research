import { Team } from 'kaiban';
import { createResearchAgent, ResearchAgentExecutor } from './agents/ResearchAgent';
import { createAnalystAgent, AnalystAgentExecutor } from './agents/AnalystAgent';
import { createWriterAgent, WriterAgentExecutor } from './agents/WriterAgent';
import { logger } from '../utils/logger';
import { emitProgressUpdate, emitSourceFound, emitStatusChange } from '../utils/websocket';

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
  private researchAgent: ResearchAgentExecutor;
  private analystAgent: AnalystAgentExecutor;
  private writerAgent: WriterAgentExecutor;
  
  constructor(config: WorkflowConfig) {
    this.config = config;
    
    const researchAgentInstance = createResearchAgent({
      name: 'Primary Researcher',
      llmConfig: config.llmConfig
    });
    
    const analystAgentInstance = createAnalystAgent({
      name: 'Data Analyst',
      llmConfig: config.llmConfig
    });
    
    const writerAgentInstance = createWriterAgent({
      name: 'Report Writer',
      llmConfig: config.llmConfig
    });
    
    this.researchAgent = new ResearchAgentExecutor(researchAgentInstance);
    this.analystAgent = new AnalystAgentExecutor(analystAgentInstance);
    this.writerAgent = new WriterAgentExecutor(writerAgentInstance);
    
    this.team = new Team({
      name: 'Research Team',
      agents: [researchAgentInstance, analystAgentInstance, writerAgentInstance],
      process: 'sequential',
      verbose: true
    });
  }
  
  async execute(): Promise<any> {
    try {
      logger.info(`Starting research workflow for topic: ${this.config.topic}`);
      emitStatusChange({
        sessionId: this.config.sessionId,
        status: 'processing',
        message: 'Research workflow started'
      });
      
      const phases = ['research', 'analysis', 'writing', 'finalization'];
      let currentPhaseIndex = 0;
      
      emitProgressUpdate({
        sessionId: this.config.sessionId,
        progress: {
          percentage: 0,
          currentPhase: phases[currentPhaseIndex],
          phasesCompleted: [],
          estimatedTimeRemaining: this.estimateTimeRemaining(this.config.parameters)
        }
      });
      
      const researchResults = await this.executeResearchPhase();
      currentPhaseIndex++;
      
      emitProgressUpdate({
        sessionId: this.config.sessionId,
        progress: {
          percentage: 25,
          currentPhase: phases[currentPhaseIndex],
          phasesCompleted: ['research'],
          estimatedTimeRemaining: this.estimateTimeRemaining(this.config.parameters) * 0.75
        }
      });
      
      const analysisResults = await this.executeAnalysisPhase(researchResults);
      currentPhaseIndex++;
      
      emitProgressUpdate({
        sessionId: this.config.sessionId,
        progress: {
          percentage: 50,
          currentPhase: phases[currentPhaseIndex],
          phasesCompleted: ['research', 'analysis'],
          estimatedTimeRemaining: this.estimateTimeRemaining(this.config.parameters) * 0.5
        }
      });
      
      const report = await this.executeWritingPhase(analysisResults);
      currentPhaseIndex++;
      
      emitProgressUpdate({
        sessionId: this.config.sessionId,
        progress: {
          percentage: 75,
          currentPhase: phases[currentPhaseIndex],
          phasesCompleted: ['research', 'analysis', 'writing'],
          estimatedTimeRemaining: this.estimateTimeRemaining(this.config.parameters) * 0.25
        }
      });
      
      const finalReport = await this.finalizeReport(report, researchResults, analysisResults);
      
      emitProgressUpdate({
        sessionId: this.config.sessionId,
        progress: {
          percentage: 100,
          currentPhase: 'completed',
          phasesCompleted: phases,
          estimatedTimeRemaining: 0
        }
      });
      
      emitStatusChange({
        sessionId: this.config.sessionId,
        status: 'completed',
        message: 'Research workflow completed successfully'
      });
      
      return finalReport;
      
    } catch (error) {
      logger.error('Research workflow error:', error);
      emitStatusChange({
        sessionId: this.config.sessionId,
        status: 'failed',
        message: error.message
      });
      throw error;
    }
  }
  
  private async executeResearchPhase(): Promise<any> {
    logger.info('Executing research phase');
    
    const researchTasks = [];
    
    if (this.config.parameters.depth === 'comprehensive') {
      researchTasks.push(
        this.researchAgent.executeResearch(this.config.topic, {
          ...this.config.parameters,
          focus: 'overview'
        }),
        this.researchAgent.executeResearch(this.config.topic, {
          ...this.config.parameters,
          focus: 'recent_developments'
        }),
        this.researchAgent.executeResearch(this.config.topic, {
          ...this.config.parameters,
          focus: 'expert_opinions'
        })
      );
    } else {
      researchTasks.push(
        this.researchAgent.executeResearch(this.config.topic, this.config.parameters)
      );
    }
    
    const results = await Promise.all(researchTasks);
    
    const combinedResults = this.combineResearchResults(results);
    
    combinedResults.sources.forEach((source: any) => {
      emitSourceFound({
        sessionId: this.config.sessionId,
        source: {
          url: source.url,
          title: source.title,
          relevanceScore: source.relevanceScore || 0.5,
          summary: source.summary || ''
        }
      });
    });
    
    return combinedResults;
  }
  
  private async executeAnalysisPhase(researchResults: any): Promise<any> {
    logger.info('Executing analysis phase');
    
    const focusAreas = this.determineFocusAreas(this.config.topic, this.config.parameters);
    
    const analysisResult = await this.analystAgent.analyzeFindings(
      researchResults.sources,
      this.config.topic,
      focusAreas
    );
    
    return {
      ...analysisResult,
      originalSources: researchResults.sources,
      searchQueries: researchResults.queries
    };
  }
  
  private async executeWritingPhase(analysisResults: any): Promise<any> {
    logger.info('Executing writing phase');
    
    const report = await this.writerAgent.writeReport(
      analysisResults,
      'markdown',
      this.config.parameters.reportLength
    );
    
    return report;
  }
  
  private async finalizeReport(report: any, researchResults: any, analysisResults: any): Promise<any> {
    logger.info('Finalizing report');
    
    const metadata = {
      topic: this.config.topic,
      generatedAt: new Date().toISOString(),
      parameters: this.config.parameters,
      statistics: {
        totalSources: researchResults.sources.length,
        analyzedSources: analysisResults.originalSources.length,
        searchQueries: researchResults.queries.length,
        processingTime: Date.now() - parseInt(this.config.sessionId.split('-')[0])
      }
    };
    
    return {
      content: report.content || report,
      summary: this.extractSummary(report),
      keyFindings: this.extractKeyFindings(analysisResults),
      sources: researchResults.sources,
      citations: this.extractCitations(report),
      metadata
    };
  }
  
  private combineResearchResults(results: any[]): any {
    const combined = {
      sources: [],
      queries: [],
      topics: new Set()
    };
    
    results.forEach(result => {
      if (result.sources) {
        combined.sources.push(...result.sources);
      }
      if (result.queries) {
        combined.queries.push(...result.queries);
      }
      if (result.topics) {
        result.topics.forEach((topic: string) => combined.topics.add(topic));
      }
    });
    
    combined.sources = this.deduplicateSources(combined.sources);
    
    return {
      sources: combined.sources,
      queries: combined.queries,
      topics: Array.from(combined.topics)
    };
  }
  
  private deduplicateSources(sources: any[]): any[] {
    const seen = new Set();
    return sources.filter(source => {
      const key = source.url || source.title;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
  
  private determineFocusAreas(topic: string, parameters: any): string[] {
    const focusAreas = [];
    
    const topicLower = topic.toLowerCase();
    
    if (topicLower.includes('technology') || topicLower.includes('tech')) {
      focusAreas.push('technological advancements', 'innovation', 'implementation challenges');
    }
    
    if (topicLower.includes('business') || topicLower.includes('market')) {
      focusAreas.push('market trends', 'competitive analysis', 'business implications');
    }
    
    if (topicLower.includes('research') || topicLower.includes('study')) {
      focusAreas.push('methodology', 'findings', 'future research directions');
    }
    
    if (parameters.depth === 'comprehensive') {
      focusAreas.push('historical context', 'current state', 'future projections');
    }
    
    return focusAreas;
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
    const citations = [];
    
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
  
  private estimateTimeRemaining(parameters: any): number {
    let baseTime = 120;
    
    if (parameters.reportLength === 'comprehensive') baseTime *= 2;
    else if (parameters.reportLength === 'long') baseTime *= 1.5;
    
    if (parameters.depth === 'comprehensive') baseTime *= 1.5;
    
    baseTime += parameters.maxSources * 2;
    
    return baseTime;
  }
}