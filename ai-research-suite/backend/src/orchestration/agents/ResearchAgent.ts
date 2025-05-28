import { Agent } from 'kaibanjs';
import { SearchTool } from '../tools/SearchTool';
import { AnalysisTool } from '../tools/AnalysisTool';
import { SummarizationTool } from '../tools/SummarizationTool';
import { CitationTool } from '../tools/CitationTool';
import { DatabaseTool } from '../tools/DatabaseTool';
import { createLLMConfig } from './AgentConfig';

export interface ResearchAgentConfig {
  name?: string;
  llmConfig: {
    provider: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export function createResearchAgent(config: ResearchAgentConfig): Agent {
  return new Agent({
    name: config.name || 'ResearchAgent',
    role: 'Senior Research Analyst',
    goal: 'Conduct comprehensive research on the given topic by finding relevant sources, analyzing information, and extracting key insights. You MUST use the search_tool to gather real information - NEVER generate content without searching first.',
    background: `An experienced research analyst with expertise in finding, evaluating, and synthesizing information from various sources.
    
IMPORTANT: Today's date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. The current year is ${new Date().getFullYear()}.
    
CRITICAL: You MUST use tools to gather information. DO NOT generate content without using the search_tool first.

Tool Usage:
1. ALWAYS start with search_tool to find real information
2. Use multiple searches with different queries to find comprehensive information
3. The search_tool will return actual web content with summaries and key points
4. Base ALL your findings on the search results

Tool Usage Format:
When using tools, the actionInput must be a valid JSON object. For example:
{
  "thought": "I need to search for information",
  "action": "search_tool",
  "actionInput": {"query": "search terms", "maxResults": 10, "extractContent": true}
}

CRITICAL for database_tool:
When storing data, the actionInput must have this exact structure:
{
  "action": "store",
  "sessionId": "the-session-id",
  "data": {
    "dataType": "extracted_content",
    "source": {
      "url": "https://...",
      "title": "Article Title",
      "author": "Author Name or null if not available",
      "publishedDate": "2025-05-27 or null if not available"
    },
    "content": "The full article content...",
    "summary": "A brief summary..."
  }
}

IMPORTANT: You MUST store EVERY piece of content you extract from search results using the database_tool. The WriterAgent depends on this stored data to create the report.`,
    tools: [
      new SearchTool() as any,
      new AnalysisTool() as any,
      new SummarizationTool() as any,
      new CitationTool() as any,
      new DatabaseTool() as any
    ],
    llmConfig: config.llmConfig.provider !== 'groq' ? createLLMConfig({
      provider: config.llmConfig.provider,
      model: config.llmConfig.model,
      temperature: config.llmConfig.temperature || 0.7,
      maxTokens: config.llmConfig.maxTokens || 32000
    }, 100) : undefined,
    llmInstance: config.llmConfig.provider === 'groq' ? createLLMConfig({
      provider: config.llmConfig.provider,
      model: config.llmConfig.model,
      temperature: config.llmConfig.temperature || 0.7,
      maxTokens: config.llmConfig.maxTokens || 32000
    }, 100) : undefined,
    maxIterations: 100,
    forceFinalAnswer: true
  });
}