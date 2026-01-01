const Task = require('../models/Task');
const Project = require('../models/Project');

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res) => {
  try {
    const { 
      project,
      category,
      status,
      priority,
      dueDate,
      sortBy = '-createdAt',
      page = 1,
      limit = 50
    } = req.query;

    const query = { user: req.user.id };

    // Filters
    if (project) query.project = project;
    if (category) query.category = category;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    
    // Due date filter
    if (dueDate === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      query.dueDate = { $gte: today, $lt: tomorrow };
    } else if (dueDate === 'week') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);
      query.dueDate = { $gte: today, $lte: nextWeek };
    } else if (dueDate === 'overdue') {
      query.dueDate = { $lt: new Date() };
      query.status = { $ne: 'Hoàn thành' };
    }

    const tasks = await Task.find(query)
      .populate('project', 'name color')
      .populate('category', 'name color')
      .sort(sortBy)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Task.countDocuments(query);

    res.json({
      success: true,
      data: tasks,
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
      message: 'Lỗi lấy tasks: ' + error.message
    });
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user.id
    })
    .populate('project', 'name color')
    .populate('category', 'name color');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy task'
      });
    }

    res.json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy task: ' + error.message
    });
  }
};

// @desc    Create task
// @route   POST /api/tasks
// @access  Private
exports.createTask = async (req, res) => {
  try {
    const task = await Task.create({
      ...req.body,
      user: req.user.id
    });

    await task.populate('project category');

    res.status(201).json({
      success: true,
      message: 'Tạo task thành công',
      data: task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo task: ' + error.message
    });
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res) => {
  try {
    let task = await Task.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy task'
      });
    }

    // If marking as completed
    if (req.body.status === 'Hoàn thành' && task.status !== 'Hoàn thành') {
      req.body.completedAt = new Date();
    }

    task = await Task.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('project', 'name color')
    .populate('category', 'name color');

    res.json({
      success: true,
      message: 'Cập nhật task thành công',
      data: task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật task: ' + error.message
    });
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
exports.deleteTask = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy task'
      });
    }

    await task.deleteOne();

    res.json({
      success: true,
      message: 'Xóa task thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi xóa task: ' + error.message
    });
  }
};

// @desc    Get task statistics
// @route   GET /api/tasks/stats
// @access  Private
exports.getStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await Task.aggregate([
      { $match: { user: userId } },
      {
        $facet: {
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          byPriority: [
            { $group: { _id: '$priority', count: { $sum: 1 } } }
          ],
          overdue: [
            {
              $match: {
                dueDate: { $lt: new Date() },
                status: { $ne: 'Hoàn thành' }
              }
            },
            { $count: 'count' }
          ],
          dueToday: [
            {
              $match: {
                dueDate: {
                  $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                  $lt: new Date(new Date().setHours(23, 59, 59, 999))
                }
              }
            },
            { $count: 'count' }
          ]
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        byStatus: stats[0].byStatus,
        byPriority: stats[0].byPriority,
        overdue: stats[0].overdue[0]?.count || 0,
        dueToday: stats[0].dueToday[0]?.count || 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy thống kê: ' + error.message
    });
  }
};