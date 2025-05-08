"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportService = exports.ReportService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const logger_1 = require("../utils/logger");
const errorHandler_1 = require("../utils/errorHandler");
const report_1 = require("../models/report");
const ReportFormatterTool_1 = require("../kaiban/tools/ReportFormatterTool");
/**
 * Service for generating and managing research reports
 */
class ReportService {
    constructor() {
        this.reportsDir = path_1.default.join(process.cwd(), 'data', 'reports');
        this.reportFormatter = new ReportFormatterTool_1.ReportFormatterTool();
        // Create reports directory if it doesn't exist
        fs_1.default.mkdirSync(this.reportsDir, { recursive: true });
        logger_1.logger.info('ReportService initialized successfully');
    }
    /**
     * Convert KaibanJS report to our Report format
     */
    convertKaibanReport(kaibanReport, jobId, topic) {
        try {
            // Extract sections
            const sections = kaibanReport.sections?.map((section) => ({
                title: section.heading,
                content: section.content,
                sources: this.extractSourceReferences(section.content)
            })) || [];
            // Extract sources
            const sources = {};
            if (kaibanReport.sources) {
                kaibanReport.sources.forEach((source, index) => {
                    const sourceId = `source-${index + 1}`;
                    sources[sourceId] = {
                        url: source.url,
                        title: source.title || source.url,
                        summary: source.summary || 'No summary available',
                        credibilityScore: source.credibilityScore,
                        captureTimestamp: new Date()
                    };
                });
            }
            // Extract key findings
            const keyFindings = kaibanReport.keyFindings ||
                kaibanReport.key_findings ||
                kaibanReport.findings ||
                this.extractKeyFindings(kaibanReport);
            // Extract executive summary
            const executiveSummary = kaibanReport.executiveSummary ||
                kaibanReport.summary ||
                (kaibanReport.sections && kaibanReport.sections.length > 0
                    ? kaibanReport.sections[0].content.substring(0, 500) + '...'
                    : 'No summary available');
            // Create and return report
            return {
                id: (0, uuid_1.v4)(),
                jobId,
                topic,
                executiveSummary: typeof executiveSummary === 'string' ? executiveSummary : JSON.stringify(executiveSummary),
                keyFindings: Array.isArray(keyFindings) ? keyFindings : [String(keyFindings)],
                sections,
                sources,
                createdAt: new Date(),
                format: report_1.ReportFormat.MARKDOWN
            };
        }
        catch (error) {
            logger_1.logger.error(`Failed to convert KaibanJS report: ${error}`);
            throw new errorHandler_1.AppError('Failed to convert report format', 500);
        }
    }
    /**
     * Extract source references from content
     */
    extractSourceReferences(content) {
        try {
            const sourceRefs = [];
            const sourceRegex = /\[(\d+)\]/g;
            let match;
            while ((match = sourceRegex.exec(content)) !== null) {
                const sourceId = `source-${match[1]}`;
                if (!sourceRefs.includes(sourceId)) {
                    sourceRefs.push(sourceId);
                }
            }
            return sourceRefs;
        }
        catch (error) {
            logger_1.logger.error(`Failed to extract source references: ${error}`);
            return [];
        }
    }
    /**
     * Extract key findings from report
     */
    extractKeyFindings(report) {
        try {
            // Try to find key findings in different possible locations in the report
            if (report.keyPoints)
                return Array.isArray(report.keyPoints) ? report.keyPoints : [report.keyPoints];
            if (report.insights)
                return Array.isArray(report.insights) ? report.insights : [report.insights];
            // If there's a conclusions section, extract from there
            const conclusionsSection = report.sections?.find((s) => s.heading.toLowerCase().includes('conclusion') ||
                s.heading.toLowerCase().includes('finding'));
            if (conclusionsSection) {
                // Try to split by bullet points or numbers
                const bulletPoints = conclusionsSection.content.split(/\n\s*[-•*]\s+/);
                if (bulletPoints.length > 1) {
                    return bulletPoints.slice(1).map((point) => point.trim()).filter(Boolean);
                }
                const numberedPoints = conclusionsSection.content.split(/\n\s*\d+\.\s+/);
                if (numberedPoints.length > 1) {
                    return numberedPoints.slice(1).map((point) => point.trim()).filter(Boolean);
                }
            }
            // Fallback: Take first few sentences from first section
            if (report.sections && report.sections.length > 0) {
                const firstSection = report.sections[0].content;
                const sentences = firstSection.split(/[.!?]+\s+/).filter(Boolean);
                return sentences.slice(0, 3).map((s) => s.trim() + '.');
            }
            return ['No key findings available'];
        }
        catch (error) {
            logger_1.logger.error(`Failed to extract key findings: ${error}`);
            return ['Error extracting key findings'];
        }
    }
    /**
     * Save a report
     */
    async saveReport(jobId, topic, kaibanReport) {
        try {
            // Convert the KaibanJS report to our Report format
            const report = this.convertKaibanReport(kaibanReport, jobId, topic);
            // Save to disk
            const reportPath = path_1.default.join(this.reportsDir, `${report.id}.json`);
            fs_1.default.writeFileSync(reportPath, JSON.stringify(report, null, 2));
            logger_1.logger.info(`Saved report ${report.id} for job ${jobId}`);
            return report;
        }
        catch (error) {
            logger_1.logger.error(`Failed to save report for job ${jobId}: ${error}`);
            throw new errorHandler_1.AppError('Failed to save report', 500);
        }
    }
    /**
     * Get a report by ID
     */
    getReport(reportId) {
        try {
            const reportPath = path_1.default.join(this.reportsDir, `${reportId}.json`);
            if (!fs_1.default.existsSync(reportPath)) {
                logger_1.logger.warn(`Report ${reportId} not found`);
                return null;
            }
            const reportData = JSON.parse(fs_1.default.readFileSync(reportPath, 'utf8'));
            return reportData;
        }
        catch (error) {
            logger_1.logger.error(`Failed to get report ${reportId}: ${error}`);
            return null;
        }
    }
    /**
     * Get all reports for a job
     */
    getReportsByJobId(jobId) {
        try {
            const reports = [];
            const files = fs_1.default.readdirSync(this.reportsDir)
                .filter(file => file.endsWith('.json'));
            for (const file of files) {
                try {
                    const reportPath = path_1.default.join(this.reportsDir, file);
                    const report = JSON.parse(fs_1.default.readFileSync(reportPath, 'utf8'));
                    if (report.jobId === jobId) {
                        reports.push(report);
                    }
                }
                catch (error) {
                    logger_1.logger.error(`Failed to read report file ${file}: ${error}`);
                }
            }
            return reports;
        }
        catch (error) {
            logger_1.logger.error(`Failed to get reports for job ${jobId}: ${error}`);
            return [];
        }
    }
    /**
     * Export a report in the requested format
     */
    async exportReport(reportId, options) {
        try {
            const report = this.getReport(reportId);
            if (!report) {
                throw new errorHandler_1.AppError(`Report ${reportId} not found`, 404);
            }
            // Convert report to format suitable for ReportFormatterTool
            const formatterInput = this.convertToFormatterInput(report, options);
            // Use ReportFormatterTool to format the report
            const result = await this.reportFormatter._call(formatterInput);
            // Generate filename
            const timestamp = new Date().toISOString().replace(/:/g, '-');
            const filename = `${report.topic.replace(/[^a-z0-9]/gi, '_')}_${timestamp}.${this.getFileExtension(options.format)}`;
            return {
                content: result,
                filename
            };
        }
        catch (error) {
            logger_1.logger.error(`Failed to export report ${reportId}: ${error}`);
            throw new errorHandler_1.AppError('Failed to export report', 500);
        }
    }
    /**
     * Convert report to input format for ReportFormatterTool
     */
    convertToFormatterInput(report, options) {
        // Convert sections
        const sections = report.sections.map(section => ({
            heading: section.title,
            content: section.content,
            subsections: [] // We don't support subsections in our model currently
        }));
        // Convert sources if included
        const sources = options.includeSources ?
            Object.entries(report.sources).map(([id, source]) => ({
                url: source.url,
                title: source.title,
                author: source.title.split(' - ')[1], // Attempt to extract author
                publishDate: source.captureTimestamp.toString(),
                credibilityScore: source.credibilityScore
            })) : [];
        // Add executive summary as first section if not already included
        if (!sections.some(s => s.heading.toLowerCase().includes('summary'))) {
            sections.unshift({
                heading: 'Executive Summary',
                content: report.executiveSummary,
                subsections: []
            });
        }
        // Add key findings section if not already included
        if (!sections.some(s => s.heading.toLowerCase().includes('finding'))) {
            sections.push({
                heading: 'Key Findings',
                content: report.keyFindings.map(f => `- ${f}`).join('\n\n'),
                subsections: []
            });
        }
        return {
            title: report.topic,
            sections,
            sources,
            formatOptions: {
                template: this.mapFormatToTemplate(options.format),
                includeTableOfContents: true,
                includeCoverPage: true,
                includeExecutiveSummary: true,
                format: this.mapReportFormatToFormatterFormat(options.format)
            }
        };
    }
    /**
     * Map report format to template name
     */
    mapFormatToTemplate(format) {
        switch (format) {
            case report_1.ReportFormat.PDF:
                return 'detailed';
            case report_1.ReportFormat.HTML:
                return 'web';
            case report_1.ReportFormat.MARKDOWN:
            default:
                return 'detailed';
        }
    }
    /**
     * Map report format to formatter format
     */
    mapReportFormatToFormatterFormat(format) {
        switch (format) {
            case report_1.ReportFormat.HTML:
                return 'html';
            case report_1.ReportFormat.PDF:
                return 'markdown'; // PDF is generated from markdown
            case report_1.ReportFormat.MARKDOWN:
            default:
                return 'markdown';
        }
    }
    /**
     * Get file extension for report format
     */
    getFileExtension(format) {
        switch (format) {
            case report_1.ReportFormat.HTML:
                return 'html';
            case report_1.ReportFormat.PDF:
                return 'pdf';
            case report_1.ReportFormat.MARKDOWN:
            default:
                return 'md';
        }
    }
}
exports.ReportService = ReportService;
// Create and export singleton instance
exports.reportService = new ReportService();
