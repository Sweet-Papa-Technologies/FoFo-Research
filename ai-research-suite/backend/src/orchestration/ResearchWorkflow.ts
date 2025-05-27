import { Team, Task } from 'kaibanjs';
import { createPlannerAgent } from './agents/PlannerAgent';
// import { createResearchAgent } from './agents/ResearchAgent';
import { createAnalystAgent } from './agents/AnalystAgent';
import { createWriterAgent } from './agents/WriterAgent';
import { ResearchDataService } from '../services/ResearchDataService';
import { SearchTool } from './tools/SearchTool';
import { logger } from '../utils/logger';
import { emitProgressUpdate, emitStatusChange } from '../utils/websocket';
import { DeduplicationService } from '../services/DeduplicationService';

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
  private team: Team;
  private config: WorkflowConfig;
  private dataService: ResearchDataService;
  private searchTool: SearchTool;
  
  constructor(config: WorkflowConfig) {
    this.config = config;
    this.dataService = new ResearchDataService();
    this.searchTool = new SearchTool();
    
    // logger.info('Creating planner agent...');
    // const plannerAgent = createPlannerAgent({
    //   name: 'Query Planner',
    //   llmConfig: config.llmConfig
    // });
    
    // logger.info('Creating research agent...');
    // const researchAgent = createResearchAgent({
    //   name: 'Primary Researcher',
    //   llmConfig: config.llmConfig
    // });
    
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
    // Note: Planning and research are handled separately, not as KaibanJS tasks
    
    const analysisTask = new Task({
      description: `Analyze the research findings stored in the database.
      Session ID: ${config.sessionId}
      Retrieve and analyze all research data to extract key insights.
      Focus on patterns, predictions, and expert opinions found in the sources.`,
      agent: analystAgent,
      expectedOutput: 'Comprehensive analysis with key findings and patterns'
    });
    
    const writingTask = new Task({
      description: `Create a well-structured report using data from the database.
      Session ID: ${config.sessionId}
      
      CRITICAL REQUIREMENTS:
      1. Retrieve all source data from the database for this session
      2. Include ALL sources with proper citations (Organization, Date, Title, URL)
      3. NEVER cite "Internal Research Data" - use the actual sources stored in database
      4. Include expert predictions, betting odds, and statistical analysis
      5. Format: ${this.config.parameters.reportLength} report in markdown
      
      The database contains all the search results and extracted content.
      Base your report on the comprehensive data available in the database.`,
      agent: writerAgent,
      expectedOutput: 'Final formatted research report with proper citations'
    });
    
    logger.info('Creating team...');
    // Create team without planner - we'll handle planning separately
    this.team = new Team({
      name: 'Research Team',
      agents: [analystAgent, writerAgent],
      tasks: [analysisTask, writingTask],
      inputs: {
        topic: config.topic,
        parameters: config.parameters,
        sessionId: config.sessionId
      }
    });
    
    logger.info('ResearchWorkflow constructor completed');
  }

  private createPlanningPrompt(): string {
    const { topic, parameters } = this.config;
    const currentDate = new Date();
    return `
    Today's date is ${currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.
    The current year is ${currentDate.getFullYear()}.
    
    Generate a comprehensive search plan for researching: ${topic}
    
    Create 5-10 different search queries that will provide thorough coverage of this topic.
    Consider different angles, time periods, and information types.
    
    Target ${parameters.minSources}-${parameters.maxSources} total sources across all queries.
    Depth level: ${parameters.depth}
    
    Your search queries should cover:
    - Current status and latest updates
    - Predictions and forecasts
    - Expert opinions and analysis
    - Statistical data and odds (if applicable)
    - Historical context and trends
    - Recent news and developments
    
    Output a JSON array with your search strategy.
    `;
  }
  
  async execute(): Promise<any> {
    try {
      logger.info(`Starting research workflow for topic: ${this.config.topic}`);
      logger.info(`Session ID: ${this.config.sessionId}`);
      logger.info(`LLM Config: Provider=${this.config.llmConfig.provider}, Model=${this.config.llmConfig.model}, BaseURL=${this.config.llmConfig.baseUrl}`);
      
      emitStatusChange({
        sessionId: this.config.sessionId,
        status: 'processing',
        message: 'Research workflow started'
      });
      
      // Phase 1: Planning
      emitProgressUpdate({
        sessionId: this.config.sessionId,
        progress: {
          percentage: 10,
          currentPhase: 'planning',
          phasesCompleted: [],
          estimatedTimeRemaining: 180
        }
      });
      
      logger.info('Initializing KaibanJS team...');
      
      // Override the research task to intercept planning results
      const originalTeam = this.team;
      
      // Execute planning first
      logger.info('Starting planning phase...');
      let planningResult;
      try {
        planningResult = await this.executePlanning();
        logger.info('Planning result:', JSON.stringify(planningResult));
      } catch (planError) {
        logger.error('Failed to execute planning:', planError);
        // Use fallback single query
        planningResult = {
          queries: [
            { query: this.config.topic, priority: 1, purpose: 'Main topic research' }
          ]
        };
      }
      
      if (planningResult && planningResult.queries) {
        // Phase 2: Execute searches in parallel
        emitProgressUpdate({
          sessionId: this.config.sessionId,
          progress: {
            percentage: 30,
            currentPhase: 'researching',
            phasesCompleted: ['planning'],
            estimatedTimeRemaining: 150
          }
        });
        
        await this.executeParallelSearches(planningResult.queries);
      } else {
        logger.error('No queries returned from planning phase');
      }
      
      // Phase 3: Continue with analysis and writing
      emitProgressUpdate({
        sessionId: this.config.sessionId,
        progress: {
          percentage: 60,
          currentPhase: 'analyzing',
          phasesCompleted: ['planning', 'researching'],
          estimatedTimeRemaining: 90
        }
      });
      
      // Execute the rest of the workflow
      logger.info('Starting team workflow execution...');
      const result = await originalTeam.start();
      
      logger.info('Team workflow completed, processing results...');
      
      emitProgressUpdate({
        sessionId: this.config.sessionId,
        progress: {
          percentage: 100,
          currentPhase: 'completed',
          phasesCompleted: ['planning', 'researching', 'analyzing', 'writing'],
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
  
  private async executePlanning(): Promise<any> {
    try {
      // Create a temporary team with just the planner
      const plannerAgent = createPlannerAgent({
        name: 'Query Planner',
        llmConfig: this.config.llmConfig
      });
      
      const planningTask = new Task({
        description: this.createPlanningPrompt(),
        agent: plannerAgent,
        expectedOutput: 'JSON array of search queries with priorities'
      });
      
      const planningTeam = new Team({
        name: 'Planning Team',
        agents: [plannerAgent],
        tasks: [planningTask],
        inputs: {
          topic: this.config.topic,
          parameters: this.config.parameters
        }
      });
      
      const result = await planningTeam.start();
      logger.info('Planning team raw result:', result);
      
      // Parse the result to get queries
      if (typeof result === 'string') {
        try {
          const parsed = JSON.parse(result);
          return parsed;
        } catch (e) {
          // Try to extract JSON from the string
          const jsonMatch = (result as string).match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
          }
        }
      }
      
      return result;
    } catch (error) {
      logger.error('Planning phase error:', error);
      // Fallback to single query
      return {
        queries: [
          { query: this.config.topic, priority: 1, purpose: 'Main topic research' }
        ]
      };
    }
  }
  
  private async executeParallelSearches(queries: Array<{query: string, priority: number, purpose: string}>): Promise<void> {
    try {
      logger.info(`Executing ${queries.length} search queries in parallel...`);
      
      // Sort by priority
      const sortedQueries = queries.sort((a, b) => a.priority - b.priority);
      
      // Store queries in database and get their IDs
      const storedQueries = [];
      for (const query of sortedQueries) {
        const id = await this.dataService.storeResearchQuery({
          sessionId: this.config.sessionId,
          query: query.query,
          priority: query.priority,
          status: 'pending'
        });
        storedQueries.push({ ...query, id });
      }
      
      // Process queries in batches of 2
      const batchSize = 2;
      for (let i = 0; i < storedQueries.length; i += batchSize) {
        const batch = storedQueries.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (queryInfo) => {
          try {
            // Update status
            await this.dataService.updateQueryStatus(queryInfo.id, 'processing');
            
            // Execute search
            const searchResults = await this.searchTool._call({
              query: queryInfo.query,
              maxResults: Math.min(Math.floor(this.config.parameters.maxSources / queries.length), 5),
              language: this.config.parameters.language || 'en',
              timeRange: this.config.parameters.dateRange || '1y',
              extractContent: true
            });
            
            // Parse results
            const results = JSON.parse(searchResults);
            
            // Store search results
            if (results.results) {
              for (const result of results.results) {
                await this.dataService.storeResearchData({
                  sessionId: this.config.sessionId,
                  dataType: 'search_results',
                  query: queryInfo.query,
                  title: result.title,
                  content: JSON.stringify(result),
                  metadata: {
                    url: result.link,
                    snippet: result.snippet,
                    purpose: queryInfo.purpose
                  },
                  relevanceScore: 90
                });
                
                // Store extracted content if available
                if (result.extractedContent) {
                  const contentId = await this.dataService.storeResearchData({
                    sessionId: this.config.sessionId,
                    dataType: 'source_content',
                    query: queryInfo.query,
                    title: result.title,
                    content: result.extractedContent.content || result.extractedContent.summary,
                    metadata: {
                      url: result.link,
                      publishedDate: result.extractedContent.publishedDate,
                      author: result.extractedContent.author
                    },
                    relevanceScore: 95
                  });
                  logger.info(`Stored source content ${contentId} for ${result.title}`);
                }
              }
            }
            
            // Update query status
            await this.dataService.updateQueryStatus(queryInfo.id, 'completed', {
              resultsCount: results.results?.length || 0
            });
            
          } catch (error) {
            logger.error(`Error processing query "${queryInfo.query}":`, error);
            await this.dataService.updateQueryStatus(queryInfo.id, 'failed');
          }
        }));
        
        // Small delay between batches
        if (i + batchSize < sortedQueries.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      logger.info('All searches completed and stored in database');
      
      // Log summary of what was stored
      try {
        const summary = await this.dataService.getResearchSummary(this.config.sessionId);
        logger.info(`Database summary - Total sources: ${summary.totalSources}, Queries: ${summary.searchQueries.length}`);
        if (summary.totalSources === 0) {
          logger.error('WARNING: No sources were stored in the database despite search completion!');
        }
      } catch (summaryError) {
        logger.error('Failed to get research summary:', summaryError);
      }
      
    } catch (error) {
      logger.error('Parallel search execution error:', error);
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
    
    // Parse the content if it's a JSON string
    let parsedContent = content;
    try {
      if (typeof content === 'string' && content.trim().startsWith('{')) {
        const parsed = JSON.parse(content);
        if (parsed.content) {
          parsedContent = parsed.content;
        }
      }
    } catch (e) {
      // Content is not JSON, use as-is
    }
    
    logger.debug('Parsed content type:', typeof parsedContent);
    logger.debug('Content preview:', parsedContent ? parsedContent.substring(0, 200) : 'No content');

    // Apply deduplication to remove redundant content
    const deduplicationService = DeduplicationService.getInstance();
    const deduplicatedContent = deduplicationService.consolidateFindings(parsedContent);
    const finalContent = deduplicationService.mergeSimilarContent(deduplicatedContent);

    return {
      content: finalContent,
      summary: this.extractSummary(finalContent),
      keyFindings: this.extractKeyFindings(finalContent),
      sources: this.extractSources(finalContent),
      citations: this.extractCitations(finalContent),
      metadata: {
        topic: this.config.topic,
        generatedAt: new Date().toISOString(),
        parameters: this.config.parameters,
        statistics: {
          totalSources: this.extractSources(finalContent).length,
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
        // Get all text until the next section header
        const summaryText = summaryMatch[1].trim();
        // Remove any table of contents or navigation elements
        const cleanSummary = summaryText
          .split('\n')
          .filter(line => !line.match(/^\d+\.\s*\[.*\]\(#.*\)$/)) // Remove TOC entries
          .join('\n')
          .trim();
        
        if (cleanSummary) return cleanSummary;
      }
      
      // Try to extract Introduction section - handle both plain and titled formats
      const introMatch = report.match(/##\s*Introduction(?:\s*:\s*[^\n]+)?\s*\n+([^#]+)/i);
      if (introMatch) {
        const introText = introMatch[1].trim();
        // Remove any table of contents entries
        const cleanIntro = introText
          .split('\n')
          .filter(line => !line.match(/^\d+\.\s*\[.*\]\(#.*\)$/))
          .join('\n')
          .trim();
        
        if (cleanIntro) {
          // For Introduction sections, use the full content as summary
          // since it typically contains the overview
          return cleanIntro;
        }
      }
      
      // If no Executive Summary or Introduction, get first content section after title
      // Look for the first section that's not Key Findings
      const titleMatch = report.match(/^#\s+[^\n]+\n/);
      const afterTitle = titleMatch ? report.substring(titleMatch.index! + titleMatch[0].length) : report;
      
      // Find first section that's not Key Findings
      const sectionMatch = afterTitle.match(/##\s+(?!Key Findings)([^\n]+)\n+([^#]+)/);
      if (sectionMatch) {
        const sectionContent = sectionMatch[2].trim();
        // Get first meaningful paragraph
        const paragraphs = sectionContent.split('\n\n').filter(p => p.trim());
        for (const paragraph of paragraphs) {
          // Skip if it's a list or reference
          if (!paragraph.match(/^[\d\[\*\-]/) && paragraph.length > 50) {
            return paragraph.trim();
          }
        }
      }
      
      return 'No summary available';
    }
    
    return report.summary || '';
  }
  
  private extractKeyFindings(report: any): string[] {
    if (!report) return [];
    
    if (typeof report === 'string') {
      const findings: string[] = [];
      
      // Look for Key Findings section with our standardized format
      const keyFindingsMatch = report.match(/##\s*Key Findings\s*\n+([^#]+)/i);
      if (keyFindingsMatch) {
        const findingsText = keyFindingsMatch[1].trim();
        
        // Extract numbered findings with format: "1. **Finding Title:** Description [references]"
        // Split by line numbers to handle multi-line findings
        const lines = findingsText.split('\n');
        let currentFinding = '';
        
        for (const line of lines) {
          // Check if this line starts a new numbered finding
          if (/^\d+\.\s*\*\*/.test(line)) {
            // Save previous finding if exists
            if (currentFinding) {
              findings.push(currentFinding.trim());
            }
            // Start new finding
            currentFinding = line;
          } else if (currentFinding && line.trim()) {
            // Continue current finding (for multi-line findings)
            currentFinding += ' ' + line.trim();
          }
        }
        
        // Don't forget the last finding
        if (currentFinding) {
          findings.push(currentFinding.trim());
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