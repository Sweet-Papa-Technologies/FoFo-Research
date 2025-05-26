import { Router } from 'express';
import { SearchController } from '../controllers/SearchController';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { rateLimiter } from '../middleware/rateLimiter';
import Joi from 'joi';

const router = Router();
const searchController = new SearchController();

const searchSchema = Joi.object({
  query: Joi.string().min(2).max(500).required(),
  maxResults: Joi.number().min(1).max(50).default(10),
  filters: Joi.object({
    dateRange: Joi.string().pattern(/^[0-9]+[dwmy]$/).optional(),
    language: Joi.string().length(2).default('en'),
    categories: Joi.array().items(Joi.string()).optional(),
    domains: Joi.array().items(Joi.string().domain()).optional()
  }).optional()
});

router.use(authMiddleware);

router.post(
  '/',
  rateLimiter('search'),
  validateRequest(searchSchema),
  searchController.search.bind(searchController)
);

router.get(
  '/history',
  searchController.getSearchHistory.bind(searchController)
);

export default router;