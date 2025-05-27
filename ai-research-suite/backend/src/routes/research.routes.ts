import { Router } from 'express';
import { ResearchController } from '../controllers/ResearchController';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { rateLimiter } from '../middleware/rateLimiter';
import Joi from 'joi';

const router = Router();
const researchController = new ResearchController();

const researchSchema = Joi.object({
  topic: Joi.string().min(3).max(500).required(),
  parameters: Joi.object({
    maxSources: Joi.number().min(5).max(500).default(20), //limit-change
    minSources: Joi.number().min(3).max(200).default(5), //limit-change
    reportLength: Joi.string().valid('short', 'medium', 'long', 'comprehensive').default('medium'),
    allowedDomains: Joi.array().items(Joi.string().domain()).optional(),
    blockedDomains: Joi.array().items(Joi.string().domain()).optional(),
    depth: Joi.string().valid('surface', 'standard', 'comprehensive').default('standard'),
    language: Joi.string().length(2).default('en'),
    dateRange: Joi.string().pattern(/^[0-9]+[dwmy]$/).optional()
  }).default()
});

router.use(authMiddleware);

router.post(
  '/',
  rateLimiter('research', { max: 10, windowMs: 3600000 }),
  validateRequest(researchSchema),
  researchController.startResearch.bind(researchController)
);

router.get(
  '/',
  researchController.listResearch.bind(researchController)
);

router.get(
  '/:sessionId',
  researchController.getResearch.bind(researchController)
);

router.delete(
  '/:sessionId',
  researchController.cancelResearch.bind(researchController)
);

router.get(
  '/:sessionId/progress',
  researchController.getProgress.bind(researchController)
);

router.post(
  '/:sessionId/retry',
  rateLimiter('research', { max: 5, windowMs: 3600000 }),
  researchController.retryResearch.bind(researchController)
);

export default router;