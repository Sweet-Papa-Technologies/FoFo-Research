"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadReport = exports.getReport = exports.getReportsByJobId = void 0;
const errorHandler_1 = require("../utils/errorHandler");
const reportService_1 = require("../services/reportService");
const report_1 = require("../models/report");
/**
 * Get all reports for a job
 */
const getReportsByJobId = async (req, res, next) => {
    try {
        const { jobId } = req.params;
        const reports = reportService_1.reportService.getReportsByJobId(jobId);
        res.status(200).json({
            status: 'success',
            data: {
                reports: reports.map(report => ({
                    id: report.id,
                    topic: report.topic,
                    createdAt: report.createdAt,
                    updatedAt: report.updatedAt,
                    keyFindings: report.keyFindings.length > 3
                        ? report.keyFindings.slice(0, 3)
                        : report.keyFindings,
                    sourceCount: Object.keys(report.sources).length
                }))
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getReportsByJobId = getReportsByJobId;
/**
 * Get a specific report
 */
const getReport = async (req, res, next) => {
    try {
        const { id } = req.params;
        const report = reportService_1.reportService.getReport(id);
        if (!report) {
            throw new errorHandler_1.AppError(`Report not found with ID: ${id}`, 404);
        }
        res.status(200).json({
            status: 'success',
            data: {
                report
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getReport = getReport;
/**
 * Download a report in the specified format
 */
const downloadReport = async (req, res, next) => {
    try {
        const { id } = req.params;
        const format = req.query.format || report_1.ReportFormat.PDF;
        // Validate format
        if (!Object.values(report_1.ReportFormat).includes(format)) {
            throw new errorHandler_1.AppError(`Invalid format: ${format}`, 400);
        }
        // Export the report
        const exportOptions = {
            format,
            includeSources: req.query.includeSources !== 'false',
            summarizeSources: req.query.summarizeSources !== 'false'
        };
        const exportedReport = await reportService_1.reportService.exportReport(id, exportOptions);
        // Set content type based on format
        let contentType = 'text/plain';
        switch (format) {
            case report_1.ReportFormat.HTML:
                contentType = 'text/html';
                break;
            case report_1.ReportFormat.PDF:
                contentType = 'application/pdf';
                break;
            case report_1.ReportFormat.MARKDOWN:
                contentType = 'text/markdown';
                break;
        }
        // Set headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${exportedReport.filename}"`);
        // Send the file
        res.send(exportedReport.content);
    }
    catch (error) {
        next(error);
    }
};
exports.downloadReport = downloadReport;
