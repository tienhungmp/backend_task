const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  analyzeNote,
  createTasksFromAI,
  suggestMapping,
  getAILabels,
  getAIConfig,
  batchAnalyze
} = require('../controllers/ai.controller');

// Protect all routes
router.use(protect);

// Analysis endpoints
router.post('/analyze-note', analyzeNote);
router.post('/batch-analyze', batchAnalyze);

// Task creation endpoint
router.post('/create-tasks', createTasksFromAI);

// Suggestion endpoint
router.post('/suggest-mapping', suggestMapping);

// Info endpoints
router.get('/labels', getAILabels);
router.get('/config', getAIConfig);

module.exports = router;