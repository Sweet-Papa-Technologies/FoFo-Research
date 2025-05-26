import { config } from '../../config';
import { LiteLLMService } from '../../services/LiteLLMService';

export interface AgentLLMConfig {
  provider: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  apiKey?: string;
  baseUrl?: string;
}

export function createLLMConfig(overrides: Partial<AgentLLMConfig> = {}): any {
  const litellmService = new LiteLLMService();
  
  // Create configuration compatible with KaibanJS
  const llmConfig = {
    provider: overrides.provider || 'custom',
    model: overrides.model || config.litellm.defaultModel,
    temperature: overrides.temperature || 0.7,
    maxTokens: overrides.maxTokens || 2000,
    
    // Custom completion function that uses our LiteLLM service
    complete: async (prompt: string) => {
      return litellmService.complete(prompt, {
        model: overrides.model || config.litellm.defaultModel,
        temperature: overrides.temperature,
        maxTokens: overrides.maxTokens
      });
    }
  };
  
  // If baseUrl is provided, add it to the config
  if (config.litellm.baseUrl) {
    llmConfig['baseUrl'] = config.litellm.baseUrl;
  }
  
  // If apiKey is provided, add it to the config
  if (config.litellm.apiKey) {
    llmConfig['apiKey'] = config.litellm.apiKey;
  }
  
  return llmConfig;
}