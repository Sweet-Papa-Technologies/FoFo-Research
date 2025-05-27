import { Agent } from 'kaibanjs';
import { createLLMConfig } from './AgentConfig';

export interface PlannerAgentConfig {
  name?: string;
  llmConfig: {
    provider: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
}

export function createPlannerAgent(config: PlannerAgentConfig): Agent {
  return new Agent({
    name: config.name || 'Query Planner',
    role: 'Research Query Planner',
    goal: 'Generate a comprehensive list of search queries to thoroughly research the given topic from multiple angles',
    background: `An expert research strategist who understands how to break down complex topics into multiple targeted search queries. You analyze topics and generate diverse search queries that will capture different aspects, perspectives, and time periods.
    
IMPORTANT: Today's date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. The current year is ${new Date().getFullYear()}.

Your job is to create a COMPREHENSIVE search plan with multiple queries that will ensure thorough research coverage while respecting source limits.

QUERY GENERATION GUIDELINES:
1. Adjust the number of queries based on source requirements
2. Include queries for:
   - Current status/state (e.g., "current standings", "latest updates")
   - Predictions and forecasts (e.g., "predictions", "who will win", "odds")
   - Expert analysis (e.g., "expert picks", "analysis")
   - Historical context (e.g., "history", "past performance")
   - Statistical data (e.g., "statistics", "betting odds", "power rankings")
   - Recent news and developments
3. Use variations in phrasing to capture different search results
4. Include specific terms that will find authoritative sources
5. Consider that each query typically yields 5-10 sources`,
    llmConfig: createLLMConfig({
      provider: config.llmConfig.provider,
      model: config.llmConfig.model,
      temperature: config.llmConfig.temperature || 0.3,
      maxTokens: config.llmConfig.maxTokens || 1000
    })
  });
}