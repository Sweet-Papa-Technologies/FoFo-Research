export interface Todo {
  id: number;
  content: string;
}

export interface Meta {
  totalCount: number;
}

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

export interface SourceInfo {
  url: string;
  title: string;
  summary: string;
  credibilityScore?: number;
  captureTimestamp: Date;
}

export interface ReportSection {
  title: string;
  content: string;
  sources: string[]; // References to sourceInfoIds
}

export enum ReportFormat {
  MARKDOWN = 'markdown',
  HTML = 'html',
  PDF = 'pdf'
}

export interface Report {
  id: string;
  jobId: string;
  topic: string;
  executiveSummary: string;
  keyFindings: string[];
  sections: ReportSection[];
  sources: Record<string, SourceInfo>;
  createdAt: Date;
  updatedAt?: Date;
  format: ReportFormat;
}

export interface ExportOptions {
  format: ReportFormat;
  includeSources: boolean;
  summarizeSources: boolean;
}