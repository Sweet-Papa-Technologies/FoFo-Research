import { Agent } from 'kaibanjs';
import { AnalysisTool } from '../tools/AnalysisTool';
import { FactCheckTool } from '../tools/FactCheckTool';
import { RelevanceScoringTool } from '../tools/RelevanceScoringTool';
import { createLLMConfig } from './AgentConfig';

export interface AnalystAgentConfig {
  name?: string;
  llmConfig: {
    provider: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export function createAnalystAgent(config: AnalystAgentConfig): Agent {
  return new Agent({
    name: config.name || 'AnalystAgent',
    role: 'Research Data Analyst',
    goal: 'Analyze research findings for accuracy, relevance, and insights. Identify patterns, validate information, and extract key findings.',
    background: `A meticulous data analyst specialized in validating research findings, cross-referencing sources, and identifying meaningful patterns in data.
    
IMPORTANT: Today's date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. The current year is ${new Date().getFullYear()}.`,
    tools: [
      new AnalysisTool() as any,
      new FactCheckTool() as any,
      new RelevanceScoringTool() as any
    ],
    llmConfig: createLLMConfig({
      provider: config.llmConfig.provider,
      model: config.llmConfig.model,
      temperature: config.llmConfig.temperature || 0.3,
      maxTokens: config.llmConfig.maxTokens || 2000
    })
  });
}