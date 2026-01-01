const axios = require('axios');
const Note = require('../models/Note');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Category = require('../models/Category');

const AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'http://localhost:8000';

// @desc    Analyze note with AI
// @route   POST /api/ai/analyze-note
// @access  Private
exports.analyzeNote = async (req, res) => {
  try {
    const { text, noteId } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung không được để trống'
      });
    }

    // Call Python AI backend
    const response = await axios.post(`${AI_BACKEND_URL}/api/analyze`, {
      text: text,
      user_id: req.user.id
    });

    const aiResult = response.data;

    // Save AI suggestions to note if noteId provided
    if (noteId) {
      const note = await Note.findOne({
        _id: noteId,
        user: req.user.id
      });

      if (note) {
        note.aiSuggestions = {
          tasks: aiResult.tasks.map(t => ({
            text: t.task_text,
            priority: t.priority,
            category: t.category,
            confidence: t.confidence.priority
          })),
          analyzedAt: new Date()
        };
        await note.save();
      }
    }

    res.json({
      success: true,
      data: aiResult
    });
  } catch (error) {
    console.error('AI Analysis Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Lỗi phân tích AI: ' + error.message
    });
  }
};

// @desc    Create tasks from AI suggestions
// @route   POST /api/ai/create-tasks
// @access  Private
exports.createTasksFromAI = async (req, res) => {
  try {
    const { tasks, noteId } = req.body;

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Danh sách tasks không hợp lệ'
      });
    }

    // Get user's projects and categories for mapping
    const [userProjects, userCategories] = await Promise.all([
      Project.find({ user: req.user.id }),
      Category.find({ user: req.user.id, type: { $in: ['task', 'both'] } })
    ]);

    const createdTasks = [];

    for (const taskData of tasks) {
      // Map project name to project ID
      let projectId = null;
      if (taskData.project) {
        const project = userProjects.find(p => 
          p.name.toLowerCase() === taskData.project.toLowerCase()
        );
        projectId = project ? project._id : null;
      }

      // Map category name to category ID
      let categoryId = null;
      if (taskData.category) {
        const category = userCategories.find(c => 
          c.name.toLowerCase() === taskData.category.toLowerCase()
        );
        categoryId = category ? category._id : null;
      }

      const task = await Task.create({
        user: req.user.id,
        title: taskData.task_text || taskData.text,
        priority: taskData.priority || 'Trung bình',
        project: projectId,
        category: categoryId,
        aiGenerated: true,
        aiConfidence: taskData.confidence,
        createdFromNote: noteId || null,
        status: 'Chưa bắt đầu'
      });

      await task.populate('project category');
      createdTasks.push(task);
    }

    res.status(201).json({
      success: true,
      message: `Đã tạo ${createdTasks.length} tasks từ AI`,
      data: createdTasks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo tasks: ' + error.message
    });
  }
};

// @desc    Get AI suggested project/category mapping
// @route   POST /api/ai/suggest-mapping
// @access  Private
exports.suggestMapping = async (req, res) => {
  try {
    const { taskText } = req.body;

    // Call AI backend
    const response = await axios.post(`${AI_BACKEND_URL}/api/analyze`, {
      text: taskText,
      user_id: req.user.id
    });

    const suggestions = response.data.tasks[0];

    // Get user's existing projects and categories
    const [projects, categories] = await Promise.all([
      Project.find({ user: req.user.id }),
      Category.find({ user: req.user.id })
    ]);

    // Find best matches
    const projectMatch = projects.find(p => 
      p.name.toLowerCase() === suggestions.project.toLowerCase()
    );
    
    const categoryMatch = categories.find(c => 
      c.name.toLowerCase() === suggestions.category.toLowerCase()
    );

    res.json({
      success: true,
      data: {
        suggestedProject: {
          name: suggestions.project,
          existing: projectMatch || null,
          confidence: suggestions.confidence.project
        },
        suggestedCategory: {
          name: suggestions.category,
          existing: categoryMatch || null,
          confidence: suggestions.confidence.category
        },
        suggestedPriority: {
          value: suggestions.priority,
          confidence: suggestions.confidence.priority
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi gợi ý: ' + error.message
    });
  }
};

// @desc    Get available AI labels
// @route   GET /api/ai/labels
// @access  Private
exports.getAILabels = async (req, res) => {
  try {
    const response = await axios.get(`${AI_BACKEND_URL}/api/labels`);
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy labels: ' + error.message
    });
  }
};