const Category = require('../models/Category');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Private
exports.getCategories = async (req, res) => {
  try {
    const { type } = req.query;
    const query = { user: req.user.id };
    
    if (type) {
      query.type = { $in: [type, 'both'] };
    }

    const categories = await Category.find(query).sort('name');

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy categories: ' + error.message
    });
  }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private
exports.createCategory = async (req, res) => {
  try {
    const category = await Category.create({
      ...req.body,
      user: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Tạo category thành công',
      data: category
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Category này đã tồn tại'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo category: ' + error.message
    });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private
exports.updateCategory = async (req, res) => {
  try {
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy category'
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật category thành công',
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật category: ' + error.message
    });
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private
exports.deleteCategory = async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy category'
      });
    }

    await category.deleteOne();

    res.json({
      success: true,
      message: 'Xóa category thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi xóa category: ' + error.message
    });
  }
};