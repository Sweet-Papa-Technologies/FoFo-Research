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
    goal: 'Conduct comprehensive research on the given topic by finding relevant sources, analyzing information, and extracting key insights. ALWAYS use search results to create reports.',
    background: `An experienced research analyst with expertise in finding, evaluating, and synthesizing information from various sources.
    
IMPORTANT: Today's date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. The current year is ${new Date().getFullYear()}.
    
CRITICAL: You MUST use tools to gather information. DO NOT generate content without using the search_tool first.

Tool Usage:
1. ALWAYS start with search_tool to find real information
2. Use multiple searches with different queries to find comprehensive information
3. The search_tool will return actual web content with summaries and key points
4. Base ALL your findings on the search results

Tool Formats:
- search_tool: {"query": "search terms", "maxResults": 10, "extractContent": true}
- analysis_tool: {"content": "text from search results", "analysisType": "comprehensive"}
- summarization_tool: {"content": "text to summarize", "summaryType": "executive", "maxLength": 200}
- citation_tool: {"action": "create", "source": {"url": "...", "title": "...", "author": "..."}, "format": "apa"}
- database_tool for storing: {"action": "store", "sessionId": "...", "data": {"dataType": "extracted_content", "source": {"url": "...", "title": "...", "author": "...", "publishedDate": "..."}, "content": "...", "summary": "..."}}
- database_tool for retrieving: {"action": "retrieve_sources", "sessionId": "...", "limit": 20}`,
    tools: [
      new SearchTool() as any,
      new AnalysisTool() as any,
      new SummarizationTool() as any,
      new CitationTool() as any,
      new DatabaseTool() as any
    ],
    llmConfig: createLLMConfig({
      provider: config.llmConfig.provider,
      model: config.llmConfig.model,
      temperature: config.llmConfig.temperature || 0.7,
      maxTokens: config.llmConfig.maxTokens || 2000
    })
  });
}