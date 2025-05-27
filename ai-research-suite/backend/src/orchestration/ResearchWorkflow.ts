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
    baseUrl?: string;
  };
}

export class ResearchWorkflow {
  private team: Team;
  private config: WorkflowConfig;
  
  constructor(config: WorkflowConfig) {
    this.config = config;
    
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
    // Create tasks for the workflow
    const researchTask = new Task({
      description: this.createResearchPrompt(),
      agent: researchAgent,
      expectedOutput: 'Comprehensive research findings with sources'
    });
    
    const analysisTask = new Task({
      description: `Analyze the research findings from the search results. 
      Focus on the actual data found, not hypothetical information.
      Extract key insights and patterns from the search results.
      Use the output from the previous research task.`,
      agent: analystAgent,
      expectedOutput: 'Detailed analysis with key findings and patterns based on search results'
    });
    
    const writingTask = new Task({
      description: `Create a well-structured report from the search results and analysis.
      Use ONLY the information found in the search results from previous tasks.
      Include all sources with proper citations.
      Format: ${this.config.parameters.reportLength} report in markdown.
      Base your report on the research findings and analysis from previous tasks.`,
      agent: writerAgent,
      expectedOutput: 'Final formatted research report based on actual search findings'
    });
    
    logger.info('Creating team...');
    this.team = new Team({
      name: 'Research Team',
      agents: [researchAgent, analystAgent, writerAgent],
      tasks: [researchTask, analysisTask, writingTask],
      inputs: {
        topic: config.topic,
        parameters: config.parameters
      }
    });
    
    logger.info('ResearchWorkflow constructor completed');
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
    
    IMPORTANT: You MUST use the search_tool to find information. DO NOT generate content without searching.
    
    Your task:
    1. USE the search_tool with query: "${topic}" to find relevant sources
    2. Search for at least ${parameters.minSources} different sources using variations of the search query
    3. Analyze the actual search results and extracted content
    4. Extract key insights and findings from the search results
    5. Ensure proper citation of all sources found
    6. Base your report ONLY on the information found through searches
    
    Example search tool usage:
    Action: search_tool
    Action Input: {"query": "${topic}", "maxResults": ${Math.min(parameters.maxSources, 10)}, "extractContent": true}
    `;
  }
  
  async execute(): Promise<any> {
    try {
      logger.info(`Starting research workflow for topic: ${this.config.topic}`);
      logger.info(`LLM Config: Provider=${this.config.llmConfig.provider}, Model=${this.config.llmConfig.model}, BaseURL=${this.config.llmConfig.baseUrl}`);
      
      emitStatusChange({
        sessionId: this.config.sessionId,
        status: 'processing',
        message: 'Research workflow started'
      });
      
      logger.info('Initializing KaibanJS team...');
      
      // Execute the team workflow
      logger.info('Starting team workflow execution...');
      const result = await this.team.start();
      
      logger.info('Team workflow completed, processing results...');
      logger.debug('Raw team result type:', typeof result);
      
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

    return {
      content: parsedContent,
      summary: this.extractSummary(parsedContent),
      keyFindings: this.extractKeyFindings(parsedContent),
      sources: this.extractSources(parsedContent),
      citations: this.extractCitations(parsedContent),
      metadata: {
        topic: this.config.topic,
        generatedAt: new Date().toISOString(),
        parameters: this.config.parameters,
        statistics: {
          totalSources: this.extractSources(parsedContent).length,
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