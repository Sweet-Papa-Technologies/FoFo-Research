import { defineStore } from 'pinia';
import { api } from 'src/boot/axios';
import { JobConfig, SearchSettings, ModelSettings } from 'src/components/models';

interface ConfigState {
  availableModels: {
    id: string;
    provider: string;
    name: string;
    capabilities: string[];
    defaultParameters: Partial<ModelSettings>;
  }[];
  availableProviders: {
    id: string;
    name: string;
  }[];
  systemConfig: {
    research: JobConfig;
    models: {
      primary: ModelSettings;
      fallback?: ModelSettings;
      vision?: ModelSettings;
    };
    search: SearchSettings;
    reporting: {
      format: string;
      includeSources: boolean;
      summarizeSources: boolean;
      maxReportLength: number;
    };
    system: {
      maxConcurrentJobs: number;
      storageDirectory: string;
      loggingLevel: string;
    };
  } | null;
  loading: boolean;
  error: string | null;
}

export const useConfigStore = defineStore('config', {
  state: (): ConfigState => ({
    availableModels: [],
    availableProviders: [],
    systemConfig: null,
    loading: false,
    error: null
  }),

  getters: {
    modelsByProvider: (state) => {
      const modelsByProvider: Record<string, typeof state.availableModels> = {};

      state.availableModels.forEach(model => {
        if (!modelsByProvider[model.provider]) {
          modelsByProvider[model.provider] = [];
        }
        modelsByProvider[model.provider].push(model);
      });

      return modelsByProvider;
    },

    getModelById: (state) => (id: string) => {
      return state.availableModels.find(model => model.id === id) || null;
    },

    getProviderById: (state) => (id: string) => {
      return state.availableProviders.find(provider => provider.id === id) || null;
    },

    visionCapableModels: (state) => {
      return state.availableModels.filter(model =>
        model.capabilities.includes('vision')
      );
    }
  },

  actions: {
    async fetchAvailableModels() {
      this.loading = true;
      this.error = null;

      try {
        // This would be a real API call in production
        const response = await api.get('/api/config/models');
        const { providers } = response.data.data;

        this.availableProviders = providers.map((provider: any) => ({
          id: provider.id,
          name: provider.name
        }));

        this.availableModels = providers.flatMap((provider: any) =>
          provider.models.map((model: any) => ({
            id: model.id,
            provider: provider.id,
            name: model.name,
            capabilities: model.capabilities,
            defaultParameters: model.defaultParameters
          }))
        );
      } catch (error) {
        this.error = 'Failed to fetch available models';
        console.error('Error fetching models:', error);
      } finally {
        this.loading = false;
      }
    },

    async fetchSystemConfig() {
      this.loading = true;
      this.error = null;

      try {
        // This would be a real API call in production
        const response = await api.get('/api/config');
        this.systemConfig = response.data.data.config;
      } catch (error) {
        this.error = 'Failed to fetch system configuration';
        console.error('Error fetching config:', error);
      } finally {
        this.loading = false;
      }
    },

    async updateSystemConfig(config: Partial<ConfigState['systemConfig']>) {
      this.loading = true;
      this.error = null;

      try {
        // This would be a real API call in production
        const response = await api.put('/api/config', config);
        this.systemConfig = response.data.data.config;
        return true;
      } catch (error) {
        this.error = 'Failed to update system configuration';
        console.error('Error updating config:', error);
        return false;
      } finally {
        this.loading = false;
      }
    },

    // Mock implementation for development without backend
    async _mockFetchAvailableModels() {
      this.loading = true;

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));

      const mockProviders = [
        {
          id: 'anthropic',
          name: 'Anthropic'
        },
        {
          id: 'openai',
          name: 'OpenAI'
        },
        {
          id: 'google',
          name: 'Google'
        },
        {
          id: 'openai',
          name: 'LM Studio'
        }
      ];

      const mockModels = [
        {
          id: 'gemma-3-27b-it-abliterated',
          provider: 'anthropic',
          name: 'Claude 3.7 Sonnet',
          capabilities: ['text', 'vision'],
          defaultParameters: {
            temperature: 0.3,
            topP: 0.95,
            maxTokens: 4000
          }
        },
        {
          id: 'claude-3.5-sonnet',
          provider: 'anthropic',
          name: 'Claude 3.5 Sonnet',
          capabilities: ['text', 'vision'],
          defaultParameters: {
            temperature: 0.3,
            topP: 0.95,
            maxTokens: 4000
          }
        },
        {
          id: 'gpt-4o',
          provider: 'openai',
          name: 'GPT-4o',
          capabilities: ['text', 'vision'],
          defaultParameters: {
            temperature: 0.2,
            maxTokens: 1000
          }
        },
        {
          id: 'gpt-4-turbo',
          provider: 'openai',
          name: 'GPT-4 Turbo',
          capabilities: ['text'],
          defaultParameters: {
            temperature: 0.3,
            maxTokens: 2000
          }
        },
        {
          id: 'gemini-2.0-flash',
          provider: 'google',
          name: 'Gemini 2.0 Flash',
          capabilities: ['text', 'vision'],
          defaultParameters: {
            temperature: 0.4,
            maxTokens: 2000
          }
        },
        {
          id: 'gemma3-27b',
          provider: 'openai',
          name: 'Gemma3 27b',
          capabilities: ['text'],
          defaultParameters: {
            temperature: 0.5,
            topP: 0.9,
            maxTokens: 2000
          }
        },
        {
          id: 'phi-4-reasoning',
          provider: 'openai',
          name: 'Phi-4 Reasoning',
          capabilities: ['text'],
          defaultParameters: {
            temperature: 0.4,
            topP: 0.9,
            maxTokens: 2000
          }
        }
      ];

      this.availableProviders = mockProviders;
      this.availableModels = mockModels;
      this.loading = false;
    },

    async _mockFetchSystemConfig() {
      this.loading = true;

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));

      this.systemConfig = {
        research: {
          maxIterations: 5,
          maxParallelSearches: 10,
          followLinks: true,
          maxLinksPerPage: 3,
          informationGainThreshold: 0.2
        },
        models: {
          primary: {
            provider: 'anthropic',
            model: 'gemma-3-27b-it-abliterated',
            temperature: 0.3,
            topP: 0.95,
            maxTokens: 4000
          },
          fallback: {
            provider: 'openai',
            model: 'gemma3-27b',
            temperature: 0.5,
            topP: 0.9,
            maxTokens: 2000
          },
          vision: {
            provider: 'openai',
            model: 'gpt-4o',
            temperature: 0.2,
            maxTokens: 1000
          }
        },
        search: {
          engine: 'duckduckgo',
          resultsPerQuery: 8,
          domainFilters: {
            include: ['.edu', '.gov', '.org'],
            exclude: ['pinterest.com', 'quora.com']
          }
        },
        reporting: {
          format: 'markdown',
          includeSources: true,
          summarizeSources: true,
          maxReportLength: 5000
        },
        system: {
          maxConcurrentJobs: 5,
          storageDirectory: './data',
          loggingLevel: 'info'
        }
      };

      this.loading = false;
    }
  }
});
