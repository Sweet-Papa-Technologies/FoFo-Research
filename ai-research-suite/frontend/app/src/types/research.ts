export interface ResearchParameters {
  maxSources?: number;
  minSources?: number;
  reportLength?: 'short' | 'medium' | 'long';
  depth?: 'basic' | 'standard' | 'comprehensive';
  includeVisuals?: boolean;
  sourceTypes?: string[];
}

export interface ResearchSession {
  id: string;
  userId: string;
  topic: string;
  status: 'pending' | 'planning' | 'researching' | 'analyzing' | 'writing' | 'completed' | 'failed' | 'cancelled';
  parameters: ResearchParameters;
  progress: {
    percentage: number;
    currentPhase: string;
    phasesCompleted: string[];
    estimatedTimeRemaining?: number;
  };
  reportId?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
}

export interface ResearchSource {
  id: string;
  url: string;
  title: string;
  snippet: string;
  relevanceScore: number;
  summary?: string;
  metadata?: {
    author?: string;
    publishedDate?: string;
    type?: string;
  };
}

export interface Report {
  id: string;
  sessionId: string;
  title: string;
  content: string;
  summary: string;
  sources: ResearchSource[];
  metadata: {
    wordCount: number;
    readingTime: number;
    generatedAt: string;
    version: string;
  };
  sections?: ReportSection[];
  createdAt: string;
  updatedAt: string;
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  order: number;
  subsections?: ReportSection[];
}

export interface Citation {
  id: string;
  text: string;
  sourceId: string;
  pageNumber?: number;
  url?: string;
}

export interface SearchResult {
  id: string;
  query: string;
  results: ResearchSource[];
  totalResults: number;
  createdAt: string;
}

export interface CreateResearchRequest {
  topic: string;
  parameters?: ResearchParameters;
}

export interface ResearchListParams {
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'completedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}