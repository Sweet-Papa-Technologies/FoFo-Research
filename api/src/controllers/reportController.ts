import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errorHandler';
import { reportService } from '../services/reportService';
import { ReportFormat } from '../models/report';

/**
 * Get all reports for a job
 */
export const getReportsByJobId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId } = req.params;
    
    const reports = reportService.getReportsByJobId(jobId);
    
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
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific report
 */
export const getReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    
    const report = reportService.getReport(id);
    if (!report) {
      throw new AppError(`Report not found with ID: ${id}`, 404);
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        report
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Download a report in the specified format
 */
export const downloadReport = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const format = req.query.format as ReportFormat || ReportFormat.PDF;
    
    // Validate format
    if (!Object.values(ReportFormat).includes(format)) {
      throw new AppError(`Invalid format: ${format}`, 400);
    }
    
    // Export the report
    const exportOptions = {
      format,
      includeSources: req.query.includeSources !== 'false',
      summarizeSources: req.query.summarizeSources !== 'false'
    };
    
    const exportedReport = await reportService.exportReport(id, exportOptions);
    
    // Set content type based on format
    let contentType = 'text/plain';
    switch (format) {
      case ReportFormat.HTML:
        contentType = 'text/html';
        break;
      case ReportFormat.PDF:
        contentType = 'application/pdf';
        break;
      case ReportFormat.MARKDOWN:
        contentType = 'text/markdown';
        break;
    }
    
    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${exportedReport.filename}"`);
    
    // Send the file
    res.send(exportedReport.content);
  } catch (error) {
    next(error);
  }
};