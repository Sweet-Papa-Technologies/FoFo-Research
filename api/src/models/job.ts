export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PAUSED = 'paused'
}

export interface JobConfig {
  maxIterations: number;
  maxParallelSearches: number;
  followLinks: boolean;
  maxLinksPerPage: number;
  informationGainThreshold: number;
}

export interface SearchSettings {
  engine: string;
  resultsPerQuery: number;
  domainFilters?: {
    include?: string[];
    exclude?: string[];
  };
}

export interface ModelSettings {
  provider: string;
  model: string;
  temperature: number;
  topP?: number;
  maxTokens?: number;
}

export interface ResearchJob {
  id: string;
  topic: string;
  status: JobStatus;
  config: JobConfig;
  search: SearchSettings;
  models: {
    primary: ModelSettings;
    fallback?: ModelSettings;
    vision?: ModelSettings;
  };
  progress: {
    currentIteration: number;
    processedUrls: number;
    totalUrls: number;
  };
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  reportId?: string;
}

export interface JobCreateRequest {
  topic: string;
  config?: Partial<JobConfig>;
  search?: Partial<SearchSettings>;
  models?: {
    primary?: Partial<ModelSettings>;
    fallback?: Partial<ModelSettings>;
    vision?: Partial<ModelSettings>;
  };
}

export const DEFAULT_JOB_CONFIG: JobConfig = {
  maxIterations: 5,
  maxParallelSearches: 10,
  followLinks: true,
  maxLinksPerPage: 3,
  informationGainThreshold: 0.2
};

export const DEFAULT_SEARCH_SETTINGS: SearchSettings = {
  engine: 'duckduckgo',
  resultsPerQuery: 8,
  domainFilters: {
    include: ['.edu', '.gov', '.org'],
    exclude: ['pinterest.com', 'quora.com']
  }
};

export const DEFAULT_MODEL_SETTINGS: ModelSettings = {
  provider: 'openai',
  model: 'gemma-3-27b-it-abliterated',
  temperature: 0.3,
  topP: 0.95,
  maxTokens: 12000
};