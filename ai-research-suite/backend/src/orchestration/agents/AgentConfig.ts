import { config } from '../../config';

export interface AgentLLMConfig {
  provider: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  baseUrl?: string;
}

export function createLLMConfig(overrides: Partial<AgentLLMConfig> = {}): any {
  // Create LLM configuration for KaibanJS
  return {
    provider: overrides.provider || 'openai',
    model: overrides.model || config.litellm.defaultModel,
    temperature: overrides.temperature || 0.7,
    maxTokens: overrides.maxTokens || 2000,
    apiKey: overrides.apiKey || config.litellm.apiKey,
    apiBaseUrl: overrides.baseUrl || config.litellm.baseUrl,
    maxRetries: 2
  };
}