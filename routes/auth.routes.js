const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  register,
  login,
  getMe,
  updatePreferences
} = require('../controllers/auth.controller');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/preferences', protect, updatePreferences);

module.exports = router;