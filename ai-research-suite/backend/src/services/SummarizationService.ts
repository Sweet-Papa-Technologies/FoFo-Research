import { logger } from '../utils/logger';
import { Agent, Task, Team } from 'kaibanjs';
import { createLLMConfig } from '../orchestration/agents/AgentConfig';

interface SummarizationResult {
  url: string;
  title: string;
  summary: string;
  keyPoints: string[];
  relevance: number;
  error?: string;
}

export class SummarizationService {
  private static instance: SummarizationService;

  private constructor() {}

  static getInstance(): SummarizationService {
    if (!SummarizationService.instance) {
      SummarizationService.instance = new SummarizationService();
    }
    return SummarizationService.instance;
  }

  async summarizeContent(
    content: string, 
    title: string, 
    url: string, 
    searchQuery: string
  ): Promise<SummarizationResult> {
    try {
      logger.info(`Summarizing content from: ${url}`);
      
      // Truncate content if it's too long (to fit within LLM context limits)
      const maxContentLength = 30000; // Leave room for prompts and system messages
      const truncatedContent = content.length > maxContentLength 
        ? content.substring(0, maxContentLength) + '...' 
        : content;
      
      // Create a summarization agent with proper KaibanJS configuration
      const summarizationAgent = new Agent({
        name: 'Content Summarizer',
        role: 'Expert content summarizer',
        goal: 'Create concise, informative summaries of web content while extracting key points',
        background: `You are an expert at analyzing and summarizing web content. You excel at identifying key information, main ideas, and relevant details.
Always respond with valid JSON in the exact format specified.`,
        llmConfig: createLLMConfig(),
        maxIterations: 25
      });
      
      const taskDescription = `Analyze and summarize the following web content in the context of the search query "${searchQuery}".

URL: ${url}
Title: ${title}

Content:
${truncatedContent}

Please provide:
1. A concise summary (2-3 sentences) focusing on information relevant to the search query
2. 3-5 key points or facts from the content
3. A relevance score from 0-10 indicating how relevant this content is to the search query

You MUST format your response as valid JSON with the following structure:
{
  "summary": "Your concise summary here",
  "keyPoints": ["Point 1", "Point 2", "Point 3"],
  "relevance": 8
}

IMPORTANT: Respond ONLY with the JSON object, no additional text.`;

      // Create a task for summarization
      const summarizationTask = new Task({
        description: taskDescription,
        agent: summarizationAgent,
        expectedOutput: 'A JSON response with summary, keyPoints, and relevance score'
      });

      // Create a team and execute the task
      const team = new Team({
        name: 'Summarization Team',
        agents: [summarizationAgent],
        tasks: [summarizationTask],
        logLevel: 'error' // Reduce logging noise
      });

      const result = await team.start();
      
      logger.debug('Team result:', JSON.stringify(result, null, 2));
      
      // Parse the result
      const parsedResult = this.parseAgentResponse(result);
      
      return {
        url,
        title,
        summary: parsedResult.summary || 'Unable to generate summary',
        keyPoints: parsedResult.keyPoints || [],
        relevance: parsedResult.relevance || 0
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error summarizing content from ${url}: ${errorMessage}`);
      
      return {
        url,
        title,
        summary: '',
        keyPoints: [],
        relevance: 0,
        error: errorMessage
      };
    }
  }

  private parseAgentResponse(response: any): any {
    try {
      // KaibanJS often returns the final output directly as a string
      if (typeof response === 'string') {
        return this.extractJSON(response);
      }
      
      // Handle KaibanJS team response structure
      if (response && typeof response === 'object') {
        // Check if response has an output property
        if (response.output) {
          return this.extractJSON(response.output);
        }
        // Check if response has a result property
        if (response.result) {
          return this.extractJSON(response.result);
        }
        // Check if response has a content property
        if (response.content) {
          return this.extractJSON(response.content);
        }
        // Check if response has a tasks array with results
        if (response.tasks && Array.isArray(response.tasks) && response.tasks.length > 0) {
          const task = response.tasks[0];
          const taskResult = task.output || task.result;
          if (taskResult) {
            return this.extractJSON(taskResult);
          }
        }
      }
      
      throw new Error('Unable to extract result from KaibanJS response');
    } catch (error) {
      logger.warn('Failed to parse agent response:', error);
      logger.debug('Raw response:', JSON.stringify(response, null, 2));
      
      // Return a basic structure if parsing fails
      return {
        summary: 'Unable to generate summary',
        keyPoints: [],
        relevance: 0
      };
    }
  }

  private extractJSON(text: string): any {
    try {
      // Try to parse as-is first
      return JSON.parse(text);
    } catch {
      // Try to find JSON in the text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No valid JSON found in response');
    }
  }

  async summarizeMultiple(
    contents: Array<{ content: string; title: string; url: string }>,
    searchQuery: string,
    maxConcurrent: number = 3
  ): Promise<SummarizationResult[]> {
    const results: SummarizationResult[] = [];
    
    // Process in batches to avoid overwhelming the LLM
    for (let i = 0; i < contents.length; i += maxConcurrent) {
      const batch = contents.slice(i, i + maxConcurrent);
      const batchResults = await Promise.all(
        batch.map(item => 
          this.summarizeContent(item.content, item.title, item.url, searchQuery)
        )
      );
      results.push(...batchResults);
    }
    
    return results;
  }
}