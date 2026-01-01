const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getProjects,
  createProject,
  updateProject,
  deleteProject
} = require('../controllers/project.controller');

router.use(protect);

router.route('/')
  .get(getProjects)
  .post(createProject);

router.route('/:id')
  .put(updateProject)
  .delete(deleteProject);

module.exports = router;