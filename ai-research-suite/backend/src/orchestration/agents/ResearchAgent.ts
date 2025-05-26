import { Agent } from 'kaibanjs';
import { SearchTool } from '../tools/SearchTool';
import { AnalysisTool } from '../tools/AnalysisTool';
import { SummarizationTool } from '../tools/SummarizationTool';
import { CitationTool } from '../tools/CitationTool';
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
    goal: 'Conduct comprehensive research on the given topic by finding relevant sources, analyzing information, and extracting key insights',
    background: 'An experienced research analyst with expertise in finding, evaluating, and synthesizing information from various sources.',
    tools: [
      new SearchTool() as any,
      new AnalysisTool() as any,
      new SummarizationTool() as any,
      new CitationTool() as any
    ],
    llmConfig: createLLMConfig({
      provider: config.llmConfig.provider,
      model: config.llmConfig.model,
      temperature: config.llmConfig.temperature || 0.7,
      maxTokens: config.llmConfig.maxTokens || 2000
    })
  });
}