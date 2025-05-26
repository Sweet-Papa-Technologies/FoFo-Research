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
    goal: 'Create comprehensive, well-structured research reports that present findings clearly with proper citations and formatting.',
    background: `An experienced technical writer who specializes in transforming complex research findings into clear, accessible, and professionally formatted reports.
    
IMPORTANT Tool Usage Guidelines:
- report_formatter_tool: Use {"content": {"title": "...", "summary": "...", "sections": [...], "findings": [...], "citations": [...]}, "format": "markdown", "style": "academic"}
- citation_tool for single source: Use {"action": "format", "source": {"url": "...", "title": "...", "author": "..."}, "format": "apa"}
- citation_tool for multiple sources: Use {"action": "format", "source": [{"url": "...", "title": "..."}, ...], "format": "apa"}
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
