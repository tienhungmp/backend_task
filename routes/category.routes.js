const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/category.controller');

router.use(protect);

router.route('/')
  .get(getCategories)
  .post(createCategory);

router.route('/:id')
  .put(updateCategory)
  .delete(deleteCategory);

module.exports = router;