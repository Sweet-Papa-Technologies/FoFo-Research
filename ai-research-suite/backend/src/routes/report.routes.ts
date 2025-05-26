import { Router } from 'express';
import { ReportController } from '../controllers/ReportController';
import { authMiddleware } from '../middleware/auth';
import { validateQuery, validateParams } from '../middleware/validation';
import Joi from 'joi';

const router = Router();
const reportController = new ReportController();

const reportIdSchema = Joi.object({
  reportId: Joi.string().uuid().required()
});

const reportFormatSchema = Joi.object({
  format: Joi.string().valid('markdown', 'html', 'pdf', 'docx').default('markdown')
});

router.use(authMiddleware);

router.get(
  '/:reportId',
  validateParams(reportIdSchema),
  validateQuery(reportFormatSchema),
  reportController.getReport.bind(reportController)
);

router.get(
  '/:reportId/download',
  validateParams(reportIdSchema),
  validateQuery(reportFormatSchema),
  reportController.downloadReport.bind(reportController)
);

router.get(
  '/:reportId/sources',
  validateParams(reportIdSchema),
  reportController.getReportSources.bind(reportController)
);

router.get(
  '/:reportId/citations',
  validateParams(reportIdSchema),
  reportController.getReportCitations.bind(reportController)
);

router.post(
  '/:reportId/export',
  validateParams(reportIdSchema),
  validateQuery(reportFormatSchema),
  reportController.exportReport.bind(reportController)
);

export default router;