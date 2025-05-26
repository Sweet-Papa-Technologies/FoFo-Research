import express from 'express';
import * as researchController from '../controllers/researchController';

const router = express.Router();

// Create a new research job
router.post('/', researchController.createResearchJob);

// Get all research jobs
router.get('/', researchController.getAllResearchJobs);

// Get a specific research job
router.get('/:id', researchController.getResearchJob);

// Update a research job (pause/resume)
router.put('/:id', researchController.updateResearchJob);

// Export a research report
router.post('/export/:id', researchController.exportResearchReport);

export default router;