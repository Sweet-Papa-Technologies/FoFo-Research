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
    
    // Task 1: Planning - Generate multiple search queries based on source requirements
    const planningTask = new Task({
      referenceId: 'planning',
      description: `Create a comprehensive search strategy for the topic: ${config.topic}
      
      Source Requirements:
      - Minimum sources required: ${config.parameters.minSources}
      - Maximum sources allowed: ${config.parameters.maxSources}
      - Each query typically yields 5-10 sources
      
      Generate search queries that will efficiently gather diverse, high-quality sources within these limits.
      Include the minSourcesRequired and maxSourcesAllowed values in your output.`,
      agent: plannerAgent,
      expectedOutput: 'A comprehensive search strategy with multiple queries, each having priority, purpose, and expected source counts'
    });
    
    // Task 2: Research - Execute searches and store results with source limits
    const researchTask = new Task({
      referenceId: 'research',
      description: `Execute the search queries from the planning task: {taskResult:planning}
      
      Session ID: ${config.sessionId}
      
      Instructions:
      1. Extract the search queries from the planning task output
      2. Execute each query using search_tool in priority order
      3. For EVERY search result with extracted content, YOU MUST:
         a. First use search_tool to get the content
         b. Then IMMEDIATELY use database_tool with action:"store" to save it
         c. Do NOT skip storing any extracted content
      4. Track the total number of sources stored
      5. Stop searching once you reach ${config.parameters.maxSources} sources
      6. Ensure you collect at least ${config.parameters.minSources} high-quality sources
      
      IMPORTANT: Pass tool parameters as objects, not JSON strings!
      
      Tool usage - use these exact parameter names:
      - For search_tool: 
        - query: "the search query"
        - maxResults: 10
        - extractContent: true
      - For database_tool to store:
        - action: "store"
        - sessionId: "${config.sessionId}"
        - data: {dataType: "extracted_content", source: {url: "...", title: "...", author: "...", publishedDate: "..."}, content: "...", summary: "..."}
      
      Source selection criteria:
      - Prioritize recent sources (within last 6 months)
      - Prefer reputable organizations
      - Ensure diversity of perspectives
      - Avoid duplicate content
      
      Return a detailed summary including:
      - Total sources found and stored
      - Breakdown by query
      - Confirmation that min/max requirements were met`,
      agent: researchAgent,
      dependencies: ['planning'],
      expectedOutput: 'Detailed summary of sources collected with counts and confirmation of meeting min/max requirements'
    });
    
    // Task 3: Analysis - Analyze the collected data
    const analysisTask = new Task({
      referenceId: 'analysis',
      description: `Analyze all research data stored in the database.
      
      Session ID: ${config.sessionId}
      Research Summary: {taskResult:research}
      
      Instructions:
      1. Note the total number of sources collected from the research summary
      2. Retrieve all stored research data using database_tool (limit: ${config.parameters.maxSources})
      3. Perform DEEP ANALYSIS to extract:
         - PATTERNS: What trends emerge across multiple sources?
         - PREDICTIONS: Based on data, what are likely future outcomes?
         - CONSENSUS vs OUTLIERS: Where do experts agree/disagree?
         - QUANTITATIVE INSIGHTS: Statistics, percentages, measurable data
         - CAUSATION: WHY are things happening, not just WHAT
         - IMPLICATIONS: What does this mean for stakeholders?
         - OPPORTUNITIES & RISKS: What should people watch for?
      4. Synthesize findings into ACTIONABLE INTELLIGENCE
      5. Identify knowledge gaps or areas needing more research
      6. Provide confidence levels for predictions
      7. Ensure analysis covers all ${config.parameters.minSources}-${config.parameters.maxSources} sources
      
      Your analysis should enable the writer to create a report that provides genuine strategic value, not just a summary of facts.`,
      agent: analystAgent,
      dependencies: ['research'],
      expectedOutput: 'Comprehensive analysis with key findings, patterns, insights, and source count verification'
    });
    
    // Task 4: Writing - Create the final report
    const writingTask = new Task({
      referenceId: 'writing',
      description: `Create a ${config.parameters.reportLength} research report.
      
      Session ID: ${config.sessionId}
      Analysis findings: {taskResult:analysis}
      Research summary: {taskResult:research}
      
      CRITICAL REQUIREMENTS:
      1. Use database_tool to retrieve all source data (limit: ${config.parameters.maxSources})
      2. Verify you're using ${config.parameters.minSources}-${config.parameters.maxSources} sources total
      3. Structure the report with MANDATORY sections:
         - ## Executive Summary (2-3 comprehensive paragraphs)
         - ## Key Findings (5-8 numbered findings with bold titles)
         - Main analytical sections that provide DEEP INSIGHTS
         - ## References with proper citations
      4. NEVER cite "Internal Research Data"
      5. Include actual source citations (Organization, Date, Title, URL)
      6. Only cite sources that were actually collected and stored
      
      QUALITY GUIDELINES for a SUPERIOR report:
      - GO BEYOND FACTS: Don't just report what happened - analyze WHY it matters
      - PROVIDE PREDICTIONS: Based on data, what are likely outcomes?
      - IDENTIFY TRENDS: What patterns emerge from the research?
      - OFFER EXPERT SYNTHESIS: Combine multiple viewpoints into coherent insights
      - ADDRESS CONTROVERSIES: If sources disagree, explain different perspectives
      - QUANTIFY WHEN POSSIBLE: Use specific numbers, percentages, statistics
      - CONTEXTUALIZE: How does this fit into the bigger picture?
      
      Report depth: ${config.parameters.reportLength}
      Format: Markdown with proper heading hierarchy
      Include footnote: "*This report is based on [X] carefully selected sources.*"`,
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
      logLevel: 'debug',
      inputs: {
        topic: config.topic,
        sessionId: config.sessionId,
        parameters: config.parameters
      },
      memory: true, // Enable full context sharing between tasks
      insights: `
        Research Standards and Guidelines:
        
        1. Source Requirements:
           - CRITICAL: Collect between ${config.parameters.minSources} and ${config.parameters.maxSources} sources total
           - Track source count throughout the research process
           - Stop collecting sources once ${config.parameters.maxSources} is reached
           - Ensure at least ${config.parameters.minSources} high-quality sources are collected
        
        2. Source Quality Requirements:
           - Prioritize recent sources (within last 6 months for current events)
           - Use reputable news outlets, official statistics, and expert analysis
           - Verify information across multiple sources when possible
           - Avoid duplicate or redundant sources
           
        3. Research Coverage:
           - Always include multiple perspectives on controversial topics
           - Cover predictions, odds, statistics, and expert opinions
           - Look for both quantitative data and qualitative insights
           - Balance breadth with the source count limits
           
        4. Citation Standards:
           - Every claim must be backed by a source
           - Include publication date, author/organization, and URL
           - Never use generic citations like "Internal Research Data"
           - Only cite sources that were actually stored in the database
           
        5. Report Structure:
           - Executive Summary: 2-3 paragraphs highlighting key findings
           - Key Findings: 3-5 bullet points with most important insights
           - Main Sections: Organized by theme with clear subheadings
           - References: Full citation list at the end
           
        6. Writing Style:
           - Professional, objective tone
           - Clear and concise language
           - Use data and statistics to support arguments
           - Highlight actionable insights and implications
           
        Current Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
        Session ID: ${config.sessionId}
        Min Sources: ${config.parameters.minSources}
        Max Sources: ${config.parameters.maxSources}
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
      logger.info('Team start() result type:', typeof result);
      logger.info('Team start() result:', JSON.stringify(result, null, 2));
      
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
  
  private processResults(teamResult: any): any {
    try {
      logger.info('Processing workflow results');
      
      // First check if we have a result from team.start()
      let report: string = '';
      
      // The team.start() returns {status, result, stats}
      if (teamResult && teamResult.status === 'FINISHED' && teamResult.result) {
        logger.info('Using result from team.start()');
        report = typeof teamResult.result === 'string' ? teamResult.result : JSON.stringify(teamResult.result);
      } else {
        // Fallback to checking task results directly
        logger.info('Checking task results from store');
        const teamStore = this.team.useStore();
        const tasks = teamStore.getState().tasks;
        
        // Debug logging
        logger.info(`Total tasks: ${tasks.length}`);
        tasks.forEach((task: any, index: number) => {
          logger.info(`Task ${index}: referenceId=${task.referenceId}, id=${task.id}, status=${task.status}, hasResult=${!!task.result}`);
        });
        
        const writingTask = tasks.find((t: any) => t.referenceId === 'writing' || t.name === 'writing' || t.id === 'writing');
        const writingTaskResult = writingTask?.result;
        
        if (!writingTaskResult) {
          logger.error('No writing task result found');
          return {
            report: '# Research Report\n\nNo report content was generated.',
            summary: 'No summary available',
            keyFindings: []
          };
        }
        
        // Parse the report content from task result
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
      }
      
      return {
        report,
        summary: this.extractSummary(report),
        keyFindings: this.extractKeyFindings(report)
      };
      
    } catch (error) {
      logger.error('Error processing results:', error);
      return {
        report: teamResult?.result || teamResult || 'No report generated',
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
    
    // Match numbered list items (1. 2. etc) - handle multi-line items and bold text
    const numberedMatches = findingsText.match(/^\d+\.\s+(.+?)(?=\n\d+\.|$)/gms);
    if (numberedMatches) {
      numberedMatches.forEach(match => {
        // Remove number prefix and clean up bold markdown
        const cleaned = match.replace(/^\d+\.\s+/, '')
          .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
          .replace(/\[\d+(?:,\s*\d+)*\]/g, '') // Remove citations like [1, 2, 3]
          .trim();
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