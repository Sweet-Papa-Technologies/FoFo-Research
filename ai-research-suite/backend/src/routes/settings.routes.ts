import { Router } from 'express';
import { SettingsController } from '../controllers/SettingsController';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import Joi from 'joi';

const router = Router();
const settingsController = new SettingsController();

const userSettingsSchema = Joi.object({
  defaultReportLength: Joi.string().valid('short', 'medium', 'long', 'comprehensive').optional(),
  defaultLanguage: Joi.string().length(2).optional(),
  defaultMaxSources: Joi.number().min(5).max(50).optional(),
  emailNotifications: Joi.boolean().optional(),
  theme: Joi.string().valid('light', 'dark', 'auto').optional()
});

const systemSettingsSchema = Joi.object({
  searxEndpoint: Joi.string().uri().optional(),
  litellmModel: Joi.string().optional(),
  maxConcurrentResearch: Joi.number().min(1).max(20).optional(),
  cacheTimeout: Joi.number().min(60).max(86400).optional()
});

router.use(authMiddleware);

router.get(
  '/user',
  settingsController.getUserSettings.bind(settingsController)
);

router.put(
  '/user',
  validateRequest(userSettingsSchema),
  settingsController.updateUserSettings.bind(settingsController)
);

router.get(
  '/system',
  settingsController.getSystemSettings.bind(settingsController)
);

router.put(
  '/system',
  validateRequest(systemSettingsSchema),
  settingsController.updateSystemSettings.bind(settingsController)
);

router.get(
  '/models',
  settingsController.getAvailableModels.bind(settingsController)
);

router.get(
  '/search-engines',
  settingsController.getSearchEngines.bind(settingsController)
);

export default router;