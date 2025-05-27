import { Team, Task } from 'kaibanjs';
import { createPlannerAgent } from './agents/PlannerAgent';
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
    baseUrl?: string;
  };
}

export class ResearchWorkflow {
  private config: WorkflowConfig;
  private team: Team;
  
  constructor(config: WorkflowConfig) {
    this.config = config;
    
    logger.info('Creating planner agent...');
    const plannerAgent = createPlannerAgent({
      name: 'Query Planner',
      llmConfig: config.llmConfig
    });
    
    logger.info('Creating research agent...');
    const researchAgent = createResearchAgent({
      name: 'Primary Researcher',
      llmConfig: config.llmConfig
    });
    
    logger.info('Creating analyst agent...');
    const analystAgent = createAnalystAgent({
      name: 'Data Analyst',
      llmConfig: config.llmConfig
    });
    
    logger.info('Creating writer agent...');
    const writerAgent = createWriterAgent({
      name: 'Report Writer',
      llmConfig: config.llmConfig
    });
    
    logger.info('Creating tasks...');
    
    // Task 1: Planning - Generate multiple search queries
    const planningTask = new Task({
      referenceId: 'planning',
      description: `Create a comprehensive search strategy for the topic: ${config.topic}
      
      Requirements:
      - Generate 5-10 specific search queries
      - Each query should target different aspects of the topic
      - Include queries for predictions, betting odds, expert analysis, and statistics
      - Output format: JSON array with objects containing: query, priority (1-5), purpose
      
      Example output:
      {
        "queries": [
          {"query": "Lakers vs Celtics predictions expert analysis 2024", "priority": 1, "purpose": "Expert predictions"},
          {"query": "Lakers Celtics betting odds spread moneyline", "priority": 2, "purpose": "Betting information"},
          {"query": "Lakers vs Celtics head to head statistics recent games", "priority": 3, "purpose": "Historical data"}
        ]
      }`,
      agent: plannerAgent,
      expectedOutput: 'JSON array of search queries with priorities and purposes'
    });
    
    // Task 2: Research - Execute searches and store results
    const researchTask = new Task({
      referenceId: 'research',
      description: `Execute the search queries from planning: {taskResult:planning}
      
      Session ID: ${config.sessionId}
      
      Instructions:
      1. Parse the queries from the planning task
      2. Execute each search query using the search_tool
      3. For each search result:
         - Extract and store the content using database_tool
         - Include source metadata (title, URL, date, organization)
      4. Store at least ${config.parameters.minSources} sources total
      5. Focus on high-quality, recent sources
      6. Process queries in priority order
      
      Database storage format:
      - dataType: 'search_results' for raw results
      - dataType: 'extracted_content' for article content
      
      Return a summary of sources found and stored.`,
      agent: researchAgent,
      dependencies: ['planning'],
      expectedOutput: 'Summary of research data collected and stored in database'
    });
    
    // Task 3: Analysis - Analyze the collected data
    const analysisTask = new Task({
      referenceId: 'analysis',
      description: `Analyze all research data stored in the database.
      
      Session ID: ${config.sessionId}
      
      Instructions:
      1. Retrieve all stored research data using database_tool
      2. Analyze the content to identify:
         - Key findings and insights
         - Predictions from experts
         - Betting odds and spreads
         - Statistical trends
         - Consensus opinions
      3. Organize findings by theme
      4. Identify the most credible sources
      5. Note any conflicting information
      
      Focus on providing actionable insights that can be used in the final report.`,
      agent: analystAgent,
      dependencies: ['research'],
      expectedOutput: 'Comprehensive analysis with key findings, patterns, and insights'
    });
    
    // Task 4: Writing - Create the final report
    const writingTask = new Task({
      referenceId: 'writing',
      description: `Create a ${config.parameters.reportLength} research report.
      
      Session ID: ${config.sessionId}
      Analysis findings: {taskResult:analysis}
      
      CRITICAL REQUIREMENTS:
      1. Use database_tool to retrieve all source data
      2. Structure the report with:
         - Executive Summary
         - Key Findings (3-5 bullet points)
         - Main sections with analysis
         - References with proper citations
      3. NEVER cite "Internal Research Data"
      4. Include actual source citations (Organization, Date, Title, URL)
      5. Integrate expert predictions and betting information naturally
      6. Use markdown formatting
      
      The report should be comprehensive, well-structured, and properly cited.`,
      agent: writerAgent,
      dependencies: ['analysis'],
      expectedOutput: 'Final formatted research report in markdown with proper citations',
      isDeliverable: true
    });
    
    logger.info('Creating team...');
    this.team = new Team({
      name: 'AI Research Team',
      agents: [plannerAgent, researchAgent, analystAgent, writerAgent],
      tasks: [planningTask, researchTask, analysisTask, writingTask],
      inputs: {
        topic: config.topic,
        sessionId: config.sessionId,
        parameters: config.parameters
      },
      memory: true, // Enable full context sharing between tasks
      insights: `
        Research Standards and Guidelines:
        
        1. Source Quality Requirements:
           - Prioritize recent sources (within last 6 months for current events)
           - Use reputable news outlets, official statistics, and expert analysis
           - Verify information across multiple sources when possible
           
        2. Research Coverage:
           - Always include multiple perspectives on controversial topics
           - Cover predictions, odds, statistics, and expert opinions
           - Look for both quantitative data and qualitative insights
           
        3. Citation Standards:
           - Every claim must be backed by a source
           - Include publication date, author/organization, and URL
           - Never use generic citations like "Internal Research Data"
           
        4. Report Structure:
           - Executive Summary: 2-3 paragraphs highlighting key findings
           - Key Findings: 3-5 bullet points with most important insights
           - Main Sections: Organized by theme with clear subheadings
           - References: Full citation list at the end
           
        5. Writing Style:
           - Professional, objective tone
           - Clear and concise language
           - Use data and statistics to support arguments
           - Highlight actionable insights and implications
           
        Current Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        Session ID: ${config.sessionId}
      `
    });
    
    // Set up workflow monitoring
    this.setupWorkflowMonitoring();
  }
  
  private setupWorkflowMonitoring(): void {
    // Monitor workflow status changes
    this.team.onWorkflowStatusChange((status) => {
      logger.info(`Workflow status changed to: ${status}`);
      
      const statusMap: Record<string, string> = {
        'INITIAL': 'initialized',
        'RUNNING': 'processing',
        'FINISHED': 'completed',
        'ERRORED': 'failed',
        'STOPPED': 'stopped',
        'BLOCKED': 'blocked'
      };
      
      emitStatusChange({
        sessionId: this.config.sessionId,
        status: (statusMap[status] || 'processing') as 'pending' | 'processing' | 'completed' | 'failed',
        message: `Workflow ${status.toLowerCase()}`
      });
    });
    
    // Monitor task progress
    const teamStore = this.team.useStore();
    teamStore.subscribe(() => {
      const state = teamStore.getState();
      const tasks = state.tasks;
      
      const completedTasks = tasks.filter((t: any) => t.status === 'DONE').length;
      const totalTasks = tasks.length;
      const percentage = Math.round((completedTasks / totalTasks) * 100);
      
      const currentTask = tasks.find((t: any) => t.status === 'DOING');
      const phaseMap: Record<string, string> = {
        'planning': 'planning',
        'research': 'researching',
        'analysis': 'analyzing',
        'writing': 'writing'
      };
      
      emitProgressUpdate({
        sessionId: this.config.sessionId,
        progress: {
          percentage,
          currentPhase: currentTask ? phaseMap[currentTask.id] || 'processing' : 'completed',
          phasesCompleted: tasks
            .filter((t: any) => t.status === 'DONE')
            .map((t: any) => phaseMap[t.id] || t.id),
          estimatedTimeRemaining: (totalTasks - completedTasks) * 45
        }
      });
    });
  }
  
  async execute(): Promise<any> {
    try {
      logger.info(`Starting research workflow for topic: ${this.config.topic}`);
      logger.info(`Session ID: ${this.config.sessionId}`);
      logger.info(`LLM Config: Provider=${this.config.llmConfig.provider}, Model=${this.config.llmConfig.model}`);
      
      emitStatusChange({
        sessionId: this.config.sessionId,
        status: 'processing',
        message: 'Research workflow started'
      });
      
      // Start the KaibanJS team workflow
      logger.info('Starting team workflow execution...');
      const result = await this.team.start();
      
      logger.info('Team workflow completed');
      
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
    try {
      logger.info('Processing workflow results');
      
      // Get the final result from the writing task
      const teamStore = this.team.useStore();
      const tasks = teamStore.getState().tasks;
      const writingTaskResult = tasks.find((t: any) => t.id === 'writing')?.result;
      
      if (!writingTaskResult) {
        logger.error('No writing task result found');
        return {
          report: '# Research Report\n\nNo report content was generated.',
          summary: 'No summary available',
          keyFindings: []
        };
      }
      
      // Parse the report content
      let report: string = '';
      
      if (typeof writingTaskResult === 'string') {
        report = writingTaskResult;
      } else if (writingTaskResult && typeof writingTaskResult === 'object') {
        if (typeof writingTaskResult.content === 'string') {
          report = writingTaskResult.content;
        } else if (typeof writingTaskResult.report === 'string') {
          report = writingTaskResult.report;
        } else {
          report = JSON.stringify(writingTaskResult);
        }
      } else {
        report = String(writingTaskResult);
      }
      
      return {
        report,
        summary: this.extractSummary(report),
        keyFindings: this.extractKeyFindings(report)
      };
      
    } catch (error) {
      logger.error('Error processing results:', error);
      return {
        report: result?.result || result || 'No report generated',
        summary: 'Unable to extract summary',
        keyFindings: []
      };
    }
  }
  
  private extractSummary(report: string): string {
    // Look for Executive Summary section
    const execSummaryMatch = report.match(/## Executive Summary\s*\n([\s\S]*?)(?=\n##|$)/i);
    if (execSummaryMatch && execSummaryMatch[1]) {
      return execSummaryMatch[1].trim();
    }
    
    // Look for Introduction section
    const introMatch = report.match(/## Introduction\s*\n([\s\S]*?)(?=\n##|$)/i);
    if (introMatch && introMatch[1]) {
      return introMatch[1].trim();
    }
    
    // Fallback to first paragraph
    const firstParagraph = report.split('\n\n')[1];
    return firstParagraph || 'No summary available';
  }
  
  private extractKeyFindings(report: string): string[] {
    // Look for Key Findings section
    const keyFindingsMatch = report.match(/## Key Findings\s*\n([\s\S]*?)(?=\n##|$)/i);
    if (!keyFindingsMatch || !keyFindingsMatch[1]) {
      return [];
    }
    
    const findingsText = keyFindingsMatch[1];
    const findings: string[] = [];
    
    // Match numbered list items (1. 2. etc)
    const numberedMatches = findingsText.match(/^\d+\.\s+(.+?)(?=\n\d+\.|$)/gms);
    if (numberedMatches) {
      numberedMatches.forEach(match => {
        const cleaned = match.replace(/^\d+\.\s+/, '').trim();
        if (cleaned) findings.push(cleaned);
      });
    }
    
    // Match bullet points
    if (findings.length === 0) {
      const bulletMatches = findingsText.match(/^[\*\-]\s+(.+?)(?=\n[\*\-]|$)/gms);
      if (bulletMatches) {
        bulletMatches.forEach(match => {
          const cleaned = match.replace(/^[\*\-]\s+/, '').trim();
          if (cleaned) findings.push(cleaned);
        });
      }
    }
    
    return findings.slice(0, 5); // Return top 5 findings
  }
}