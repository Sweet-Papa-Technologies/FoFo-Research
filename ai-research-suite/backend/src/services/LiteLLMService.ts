import axios, { AxiosInstance } from 'axios';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface LLMConfig {
  provider?: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
}

export interface CompletionOptions extends LLMConfig {
  systemPrompt?: string;
  responseFormat?: 'text' | 'json';
}

export class LiteLLMService {
  private client: AxiosInstance;
  private baseUrl: string;
  private apiKey?: string;
  private defaultModel: string;
  
  constructor() {
    this.baseUrl = config.litellm.baseUrl || 'https://api.openai.com/v1';
    this.apiKey = config.litellm.apiKey;
    this.defaultModel = config.litellm.defaultModel;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: config.litellm.timeout,
      headers: this.getHeaders()
    });
    
    logger.info(`LiteLLM service initialized with base URL: ${this.baseUrl}`);
  }
  
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    
    return headers;
  }
  
  async complete(prompt: string, options: Partial<CompletionOptions> = {}): Promise<string> {
    const model = options.model || this.defaultModel;
    
    try {
      const messages = [];
      
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      
      messages.push({ role: 'user', content: prompt });
      
      const requestBody: any = {
        model,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
        top_p: options.topP || 1,
        stream: false
      };
      
      // Handle different API formats
      if (this.isOllamaEndpoint()) {
        requestBody.format = options.responseFormat || 'text';
      } else if (options.responseFormat === 'json') {
        requestBody.response_format = { type: 'json_object' };
      }
      
      logger.debug(`Sending completion request to ${model}`, {
        messageCount: messages.length,
        temperature: requestBody.temperature
      });
      
      const response = await this.client.post('/chat/completions', requestBody);
      
      const content = response.data.choices?.[0]?.message?.content || '';
      
      logger.debug(`Received completion response`, {
        model,
        contentLength: content.length
      });
      
      return content;
    } catch (error) {
      logger.error('LiteLLM completion error:', error);
      
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message || error.message;
        
        if (status === 401) {
          throw new Error('Invalid API key or authentication failed');
        } else if (status === 429) {
          throw new Error('Rate limit exceeded');
        } else if (status === 404) {
          throw new Error(`Model ${model} not found`);
        }
        
        throw new Error(`LLM request failed: ${message}`);
      }
      
      throw error;
    }
  }
  
  async streamComplete(
    prompt: string,
    onChunk: (chunk: string) => void,
    options: Partial<CompletionOptions> = {}
  ): Promise<void> {
    const model = options.model || this.defaultModel;
    
    try {
      const messages = [];
      
      if (options.systemPrompt) {
        messages.push({ role: 'system', content: options.systemPrompt });
      }
      
      messages.push({ role: 'user', content: prompt });
      
      const requestBody = {
        model,
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
        stream: true
      };
      
      const response = await this.client.post('/chat/completions', requestBody, {
        responseType: 'stream'
      });
      
      response.data.on('data', (chunk: Buffer) => {
        const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              return;
            }
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              logger.warn('Failed to parse streaming chunk:', e);
            }
          }
        }
      });
      
      return new Promise((resolve, reject) => {
        response.data.on('end', resolve);
        response.data.on('error', reject);
      });
    } catch (error) {
      logger.error('LiteLLM streaming error:', error);
      throw error;
    }
  }
  
  async listModels(): Promise<string[]> {
    try {
      if (this.isOllamaEndpoint()) {
        const response = await this.client.get('/api/tags');
        return response.data.models?.map((m: any) => m.name) || [];
      } else {
        const response = await this.client.get('/models');
        return response.data.data?.map((m: any) => m.id) || [];
      }
    } catch (error) {
      logger.error('Failed to list models:', error);
      return [this.defaultModel];
    }
  }
  
  private isOllamaEndpoint(): boolean {
    return this.baseUrl.includes('localhost:11434') || 
           this.baseUrl.includes('ollama');
  }
  
  getModelConfig(model: string): LLMConfig {
    // Model-specific configurations
    const modelConfigs: Record<string, Partial<LLMConfig>> = {
      'gpt-4': { temperature: 0.7, maxTokens: 4000 },
      'gpt-3.5-turbo': { temperature: 0.7, maxTokens: 2000 },
      'claude-3-opus': { temperature: 0.5, maxTokens: 4000 },
      'claude-3-sonnet': { temperature: 0.5, maxTokens: 4000 },
      'llama2': { temperature: 0.8, maxTokens: 2000 },
      'mistral': { temperature: 0.7, maxTokens: 2000 },
      'mixtral': { temperature: 0.7, maxTokens: 4000 }
    };
    
    return {
      model,
      ...modelConfigs[model] || { temperature: 0.7, maxTokens: 2000 }
    };
  }
}