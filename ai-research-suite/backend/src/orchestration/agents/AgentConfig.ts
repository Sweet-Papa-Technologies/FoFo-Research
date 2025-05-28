import { config } from '../../config';
import { ChatGroq } from "@langchain/groq";
import { logger } from '../../utils/logger';

export interface AgentLLMConfig {
  provider: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  baseUrl?: string;
  maxIterations?: number;
}

export function createLLMConfig(overrides: Partial<AgentLLMConfig> = {}, maxIterations=10): any {
  // Create LLM configuration for KaibanJS
  const provider = overrides.provider || config.litellm.provider || 'openai';

  if (provider === 'groq') {
    logger.info('Using Groq provider -- ' + overrides.model || config.litellm.defaultModel);
    const groqModel = new ChatGroq({
      model: overrides.model || config.litellm.defaultModel,
      apiKey: overrides.apiKey || config.litellm.apiKey,
    });
    return groqModel;
  }
  const llmConfig: any = {
    provider,
    model: overrides.model || config.litellm.defaultModel,
    temperature: overrides.temperature || 0.7,
    maxTokens: overrides.maxTokens || 32000,
    apiKey: overrides.apiKey || config.litellm.apiKey,
    maxRetries: 3,
    maxIterations: overrides.maxIterations || maxIterations
  };

  // Only add baseUrl for custom endpoints (not for standard providers)
  if (overrides.baseUrl || config.litellm.baseUrl) {
    llmConfig.apiBaseUrl = overrides.baseUrl || config.litellm.baseUrl;
  }

  return llmConfig;
}