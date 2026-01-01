const Note = require('../models/Note');

// @desc    Get all notes
// @route   GET /api/notes
// @access  Private
exports.getNotes = async (req, res) => {
  try {
    const { 
      category, 
      search, 
      isPinned, 
      isArchived,
      sortBy = '-updatedAt',
      page = 1,
      limit = 20
    } = req.query;

    const query = { user: req.user.id };

    // Filters
    if (category) query.category = category;
    if (isPinned !== undefined) query.isPinned = isPinned === 'true';
    if (isArchived !== undefined) query.isArchived = isArchived === 'true';
    
    // Search
    if (search) {
      query.$text = { $search: search };
    }

    const notes = await Note.find(query)
      .populate('category', 'name color')
      .sort(sortBy)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Note.countDocuments(query);

    res.json({
      success: true,
      data: notes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy ghi chú: ' + error.message
    });
  }
};

// @desc    Get single note
// @route   GET /api/notes/:id
// @access  Private
exports.getNote = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('category', 'name color');

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ghi chú'
      });
    }

    // Update last opened
    note.lastOpenedAt = new Date();
    await note.save();

    res.json({
      success: true,
      data: note
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy ghi chú: ' + error.message
    });
  }
};

// @desc    Create note
// @route   POST /api/notes
// @access  Private
exports.createNote = async (req, res) => {
  try {
    const note = await Note.create({
      ...req.body,
      user: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Tạo ghi chú thành công',
      data: note
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo ghi chú: ' + error.message
    });
  }
};

// @desc    Update note
// @route   PUT /api/notes/:id
// @access  Private
exports.updateNote = async (req, res) => {
  try {
    let note = await Note.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ghi chú'
      });
    }

    note = await Note.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('category', 'name color');

    res.json({
      success: true,
      message: 'Cập nhật ghi chú thành công',
      data: note
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật ghi chú: ' + error.message
    });
  }
};

// @desc    Delete note
// @route   DELETE /api/notes/:id
// @access  Private
exports.deleteNote = async (req, res) => {
  try {
    const note = await Note.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy ghi chú'
      });
    }

    await note.deleteOne();

    res.json({
      success: true,
      message: 'Xóa ghi chú thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi xóa ghi chú: ' + error.message
    });
  }
};

// @desc    Get old/inactive notes
// @route   GET /api/notes/inactive
// @access  Private
exports.getInactiveNotes = async (req, res) => {
  try {
    const daysAgo = parseInt(req.query.days) || 30;
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysAgo);

    const notes = await Note.find({
      user: req.user.id,
      lastOpenedAt: { $lt: dateThreshold },
      isArchived: false
    })
    .populate('category', 'name color')
    .sort('lastOpenedAt')
    .limit(20);

    res.json({
      success: true,
      data: notes,
      metadata: {
        daysAgo,
        count: notes.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy ghi chú cũ: ' + error.message
    });
  }
};