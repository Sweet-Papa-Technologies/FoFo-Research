import express from 'express';
import * as reportController from '../controllers/reportController';

const router = express.Router();

// Get all reports for a job
router.get('/job/:jobId', reportController.getReportsByJobId);

// Get a specific report
router.get('/:id', reportController.getReport);

// Download a report
router.get('/:id/download', reportController.downloadReport);

export default router;