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