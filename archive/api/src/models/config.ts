import { JobConfig, SearchSettings, ModelSettings } from './job';

export interface AppConfig {
  research: JobConfig;
  models: {
    primary: ModelSettings;
    fallback: ModelSettings;
    vision: ModelSettings;
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
}

export interface ModelInfo {
  id: string;
  provider: string;
  name: string;
  capabilities: string[];
  defaultParameters: Partial<ModelSettings>;
}

export interface ProviderInfo {
  id: string;
  name: string;
  models: ModelInfo[];
}