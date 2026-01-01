const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

router.use(protect);

// @desc    Update user profile
// @route   PUT /api/users/profile
router.put('/profile', async (req, res) => {
  try {
    const { name, avatar } = req.body;
    
    const user = await User.findById(req.user.id);
    
    if (name) user.name = name;
    if (avatar) user.avatar = avatar;
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Cập nhật profile thành công',
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật profile: ' + error.message
    });
  }
});

// @desc    Change password
// @route   PUT /api/users/password
router.put('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id).select('+password');
    
    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mật khẩu hiện tại không đúng'
      });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({
      success: true,
      message: 'Đổi mật khẩu thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi đổi mật khẩu: ' + error.message
    });
  }
});

module.exports = router;