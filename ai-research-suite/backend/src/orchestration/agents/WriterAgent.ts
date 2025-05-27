import { Agent } from 'kaibanjs';
import { ReportFormatterTool } from '../tools/ReportFormatterTool';
import { CitationTool } from '../tools/CitationTool';
import { SummarizationTool } from '../tools/SummarizationTool';
import { createLLMConfig } from './AgentConfig';

export interface WriterAgentConfig {
  name?: string;
  llmConfig: {
    provider: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export function createWriterAgent(config: WriterAgentConfig): Agent {
  return new Agent({
    name: config.name || 'WriterAgent',
    role: 'Research Report Writer',
    goal: 'Create comprehensive, well-structured research reports with deep contextual insights, avoiding redundancy while ensuring clarity and proper citations.',
    background: `An experienced technical writer who specializes in transforming complex research findings into insightful, contextually-rich reports that go beyond surface-level information.
    
IMPORTANT: Today's date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. The current year is ${new Date().getFullYear()}.

CRITICAL WRITING GUIDELINES:
1. AVOID REDUNDANCY: Do not repeat the same information across multiple sections. If something has been stated once, reference it briefly rather than restating fully.
2. PROVIDE CONTEXT: Always explain WHY something matters, not just WHAT it is. Include:
   - Historical context and trends
   - Key player performances and statistics
   - Strategic implications and matchup advantages
   - Expert opinions and analysis from sources
3. DEPTH OVER BREADTH: Focus on meaningful insights rather than surface-level observations
4. DATA FRESHNESS: Always note the timestamp of information and indicate when data was last updated
5. STRUCTURE: Organize content logically without repeating sections (avoid having both "Executive Summary" and "Summary", or "Key Findings" appearing multiple times)

REPORT STRUCTURE REQUIREMENTS:
- Start with a brief executive summary (2-3 paragraphs max)
- Present main findings with contextual analysis
- Include relevant statistics and data points
- Provide actionable insights or predictions when applicable
- End with a concise conclusion (do not repeat findings)
- List all sources with proper citations
    
IMPORTANT Tool Usage Guidelines:
- report_formatter_tool: Use {"content": {"title": "...", "summary": "...", "sections": [...], "findings": [...], "citations": [...]}, "format": "markdown", "style": "academic"}
- citation_tool for formatting: Use {"action": "format", "source": {"url": "...", "title": "...", "author": "...", "publishedDate": "..."}, "format": "apa"}
- summarization_tool: Use {"content": "text to summarize", "summaryType": "executive", "maxLength": 200}`,
    tools: [
      new ReportFormatterTool() as any,
      new CitationTool() as any,
      new SummarizationTool() as any
    ],
    llmConfig: createLLMConfig({
      provider: config.llmConfig.provider,
      model: config.llmConfig.model,
      temperature: config.llmConfig.temperature || 0.5,
      maxTokens: config.llmConfig.maxTokens || 4000
    })
  });
}
