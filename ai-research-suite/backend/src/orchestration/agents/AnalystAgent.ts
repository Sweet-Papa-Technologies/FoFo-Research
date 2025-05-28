import { Agent } from 'kaibanjs';
import { AnalysisTool } from '../tools/AnalysisTool';
import { FactCheckTool } from '../tools/FactCheckTool';
import { RelevanceScoringTool } from '../tools/RelevanceScoringTool';
import { DatabaseTool } from '../tools/DatabaseTool';
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
    goal: 'Perform deep analysis to uncover patterns, trends, and predictions. Transform raw data into actionable insights and strategic recommendations.',
    background: `A senior research analyst with expertise in:
- Pattern recognition and trend analysis
- Predictive modeling based on current data
- Competitive intelligence and market dynamics
- Risk assessment and opportunity identification
- Converting data points into strategic insights
    
IMPORTANT: Today's date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. The current year is ${new Date().getFullYear()}.

DATABASE ACCESS:
You have access to a database containing all research data. When you receive a session ID, you MUST:
1. Use database_tool with action "retrieve_sources" to get all source content
2. Use database_tool with action "get_summary" to understand the research scope
3. Analyze the actual data retrieved from the database
4. DO NOT make up or assume data - only use what's in the database

Example database tool usage:
Action: database_tool
Action Input: {"action": "retrieve_sources", "sessionId": "[session-id]", "limit": 50}`,
    tools: [
      new DatabaseTool() as any,
      new AnalysisTool() as any,
      new FactCheckTool() as any,
      new RelevanceScoringTool() as any
    ],
    llmConfig: config.llmConfig.provider !== 'groq' ? createLLMConfig({
      provider: config.llmConfig.provider,
      model: config.llmConfig.model,
      temperature: config.llmConfig.temperature || 0.3,
      maxTokens: config.llmConfig.maxTokens || 32000
    }, 25) : undefined,
    llmInstance: config.llmConfig.provider === 'groq' ? createLLMConfig({
      provider: config.llmConfig.provider,
      model: config.llmConfig.model,
      temperature: config.llmConfig.temperature || 0.3,
      maxTokens: config.llmConfig.maxTokens || 32000
    }, 25) : undefined,
    maxIterations: 100,
    forceFinalAnswer: true
  });
}