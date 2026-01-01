const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  analyzeNote,
  createTasksFromAI,
  suggestMapping,
  getAILabels
} = require('../controllers/ai.controller');

router.use(protect);

router.post('/analyze-note', analyzeNote);
router.post('/create-tasks', createTasksFromAI);
router.post('/suggest-mapping', suggestMapping);
router.get('/labels', getAILabels);

module.exports = router;