const Project = require('../models/Project');
const Task = require('../models/Task');

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res) => {
  try {
    const { status } = req.query;
    const query = { user: req.user.id };
    
    if (status) query.status = status;

    const projects = await Project.find(query).sort('-createdAt');

    // Calculate task counts for each project
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        const taskStats = await Task.aggregate([
          { $match: { project: project._id } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]);

        const stats = {
          total: 0,
          completed: 0,
          inProgress: 0,
          notStarted: 0
        };

        taskStats.forEach(stat => {
          stats.total += stat.count;
          if (stat._id === 'Hoàn thành') stats.completed = stat.count;
          if (stat._id === 'Đang làm') stats.inProgress = stat.count;
          if (stat._id === 'Chưa bắt đầu') stats.notStarted = stat.count;
        });

        return {
          ...project.toObject(),
          taskStats: stats
        };
      })
    );

    res.json({
      success: true,
      data: projectsWithStats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy projects: ' + error.message
    });
  }
};

// @desc    Create project
// @route   POST /api/projects
// @access  Private
exports.createProject = async (req, res) => {
  try {
    const project = await Project.create({
      ...req.body,
      user: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Tạo dự án thành công',
      data: project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo dự án: ' + error.message
    });
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
exports.updateProject = async (req, res) => {
  try {
    const project = await Project.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dự án'
      });
    }

    res.json({
      success: true,
      message: 'Cập nhật dự án thành công',
      data: project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi cập nhật dự án: ' + error.message
    });
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
exports.deleteProject = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dự án'
      });
    }

    // Check if project has tasks
    const taskCount = await Task.countDocuments({ project: project._id });
    if (taskCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa dự án có ${taskCount} tasks. Vui lòng xóa hoặc chuyển tasks trước.`
      });
    }

    await project.deleteOne();

    res.json({
      success: true,
      message: 'Xóa dự án thành công'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi xóa dự án: ' + error.message
    });
  }
};