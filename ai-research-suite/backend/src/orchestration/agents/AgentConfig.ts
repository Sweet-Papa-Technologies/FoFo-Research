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
  const provider = overrides.provider || config.litellm.provider || 'openai';
  const llmConfig: any = {
    provider,
    model: overrides.model || config.litellm.defaultModel,
    temperature: overrides.temperature || 0.7,
    maxTokens: overrides.maxTokens || 2000,
    apiKey: overrides.apiKey || config.litellm.apiKey,
    maxRetries: 2
  };

  // Only add baseUrl for custom endpoints (not for standard providers)
  if (overrides.baseUrl || config.litellm.baseUrl) {
    llmConfig.apiBaseUrl = overrides.baseUrl || config.litellm.baseUrl;
  }

  return llmConfig;
}