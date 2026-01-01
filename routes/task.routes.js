const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getStats
} = require('../controllers/task.controller');

router.use(protect);

router.route('/')
  .get(getTasks)
  .post(createTask);

router.get('/stats', getStats);

router.route('/:id')
  .get(getTask)
  .put(updateTask)
  .delete(deleteTask);

module.exports = router;