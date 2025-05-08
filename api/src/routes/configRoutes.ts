import express from 'express';
import * as configController from '../controllers/configController';

const router = express.Router();

// Get available LLM models
router.get('/models', configController.getAvailableModels);

// Get current system configuration
router.get('/', configController.getSystemConfig);

// Update system configuration
router.put('/', configController.updateSystemConfig);

export default router;