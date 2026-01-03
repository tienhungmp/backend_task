const axios = require('axios');
const Note = require('../models/Note');
const Task = require('../models/Task');
const Project = require('../models/Project');
const Category = require('../models/Category');

const AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'http://localhost:8000';

// @desc    Analyze note with AI (Dynamic Projects & Topics)
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

    // Call Python AI backend (new dynamic version)
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
            estimatedTime: t.estimated_time_minutes,
            suggestedProject: t.suggested_project,  // AI-generated project name
            suggestedTopic: t.suggested_topic        // AI-generated topic name
          })),
          metadata: {
            projectsDiscovered: aiResult.metadata.projects_discovered,
            topicsDiscovered: aiResult.metadata.topics_discovered,
            tokensUsed: aiResult.metadata.tokens_used
          },
          analyzedAt: new Date()
        };
        await note.save();
      }
    }

    res.json({
      success: true,
      data: {
        tasks: aiResult.tasks,
        metadata: aiResult.metadata,
        processingTime: aiResult.processing_time_ms
      }
    });
  } catch (error) {
    console.error('AI Analysis Error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Lỗi phân tích AI: ' + error.message
    });
  }
};

// @desc    Create tasks from AI suggestions with auto project/category creation
// @route   POST /api/ai/create-tasks
// @access  Private
exports.createTasksFromAI = async (req, res) => {
  try {
    const { tasks, noteId, autoCreateProjectsAndTopics = true } = req.body;

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Danh sách tasks không hợp lệ'
      });
    }

    // Get user's existing projects and categories
    const [userProjects, userCategories] = await Promise.all([
      Project.find({ user: req.user.id }),
      Category.find({ user: req.user.id, type: { $in: ['task', 'both'] } })
    ]);

    const createdTasks = [];
    const createdProjects = new Map();
    const createdCategories = new Map();

    for (const taskData of tasks) {
      let projectId = null;
      let categoryId = null;

      // Handle suggested_project
      if (taskData.suggested_project) {
        const projectName = taskData.suggested_project;
        
        // Check if project exists (case-insensitive)
        let project = userProjects.find(p => 
          p.name.toLowerCase() === projectName.toLowerCase()
        );

        // Auto-create project if not exists and autoCreate is enabled
        if (!project && autoCreateProjectsAndTopics) {
          // Check if we already created it in this batch
          if (createdProjects.has(projectName.toLowerCase())) {
            project = createdProjects.get(projectName.toLowerCase());
          } else {
            project = await Project.create({
              user: req.user.id,
              name: projectName,
              description: `Tự động tạo từ AI - ${new Date().toLocaleDateString('vi-VN')}`,
              color: _generateRandomColor(),
              aiGenerated: true
            });
            createdProjects.set(projectName.toLowerCase(), project);
            userProjects.push(project); // Add to cache for next iterations
          }
        }

        projectId = project ? project._id : null;
      }

      // Handle suggested_topic (map to Category)
      if (taskData.suggested_topic) {
        const topicName = taskData.suggested_topic;
        
        // Check if category exists (case-insensitive)
        let category = userCategories.find(c => 
          c.name.toLowerCase() === topicName.toLowerCase()
        );

        // Auto-create category if not exists and autoCreate is enabled
        if (!category && autoCreateProjectsAndTopics) {
          // Check if we already created it in this batch
          if (createdCategories.has(topicName.toLowerCase())) {
            category = createdCategories.get(topicName.toLowerCase());
          } else {
            category = await Category.create({
              user: req.user.id,
              name: topicName,
              type: 'task',
              color: _generateRandomColor(),
              icon: _suggestIconForTopic(topicName),
              aiGenerated: true
            });
            createdCategories.set(topicName.toLowerCase(), category);
            userCategories.push(category); // Add to cache for next iterations
          }
        }

        categoryId = category ? category._id : null;
      }

      // Create task
      const task = await Task.create({
        user: req.user.id,
        title: taskData.task_text,
        priority: _mapPriorityToVietnamese(taskData.priority),
        estimatedTime: taskData.estimated_time_minutes,
        project: projectId,
        category: categoryId,
        aiGenerated: true,
        aiMetadata: {
          suggestedProject: taskData.suggested_project,
          suggestedTopic: taskData.suggested_topic,
          originalPriority: taskData.priority
        },
        createdFromNote: noteId || null,
        status: 'Chưa bắt đầu'
      });

      await task.populate('project category');
      createdTasks.push(task);
    }

    res.status(201).json({
      success: true,
      message: `Đã tạo ${createdTasks.length} tasks từ AI`,
      data: {
        tasks: createdTasks,
        summary: {
          tasksCreated: createdTasks.length,
          projectsCreated: createdProjects.size,
          categoriesCreated: createdCategories.size,
          newProjects: Array.from(createdProjects.values()).map(p => ({
            id: p._id,
            name: p.name
          })),
          newCategories: Array.from(createdCategories.values()).map(c => ({
            id: c._id,
            name: c.name
          }))
        }
      }
    });
  } catch (error) {
    console.error('Create Tasks Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi tạo tasks: ' + error.message
    });
  }
};

// @desc    Get AI suggested project/topic mapping for a single task
// @route   POST /api/ai/suggest-mapping
// @access  Private
exports.suggestMapping = async (req, res) => {
  try {
    const { taskText } = req.body;

    if (!taskText || taskText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Task text không được để trống'
      });
    }

    // Call AI backend
    const response = await axios.post(`${AI_BACKEND_URL}/api/analyze`, {
      text: taskText,
      user_id: req.user.id
    });

    if (!response.data.tasks || response.data.tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'AI không thể phân tích task này'
      });
    }

    const suggestion = response.data.tasks[0];

    // Get user's existing projects and categories
    const [projects, categories] = await Promise.all([
      Project.find({ user: req.user.id }),
      Category.find({ user: req.user.id })
    ]);

    // Find best matches (case-insensitive)
    const projectMatch = projects.find(p => 
      p.name.toLowerCase() === suggestion.suggested_project.toLowerCase()
    );
    
    const categoryMatch = categories.find(c => 
      c.name.toLowerCase() === suggestion.suggested_topic.toLowerCase()
    );

    res.json({
      success: true,
      data: {
        suggestedProject: {
          name: suggestion.suggested_project,
          existing: projectMatch || null,
          needsCreation: !projectMatch
        },
        suggestedTopic: {
          name: suggestion.suggested_topic,
          existing: categoryMatch || null,
          needsCreation: !categoryMatch
        },
        suggestedPriority: {
          value: suggestion.priority,
          vietnamese: _mapPriorityToVietnamese(suggestion.priority)
        },
        estimatedTime: {
          minutes: suggestion.estimated_time_minutes,
          formatted: _formatEstimatedTime(suggestion.estimated_time_minutes)
        },
        taskText: suggestion.task_text
      }
    });
  } catch (error) {
    console.error('Suggest Mapping Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi gợi ý mapping: ' + error.message
    });
  }
};

// @desc    Get available AI labels and info
// @route   GET /api/ai/labels
// @access  Private
exports.getAILabels = async (req, res) => {
  try {
    const response = await axios.get(`${AI_BACKEND_URL}/api/labels`);
    
    res.json({
      success: true,
      data: response.data,
      note: 'Projects và Topics được AI tự động tạo - không có danh sách cố định'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy labels: ' + error.message
    });
  }
};

// @desc    Get AI config and capabilities
// @route   GET /api/ai/config
// @access  Private
exports.getAIConfig = async (req, res) => {
  try {
    const response = await axios.get(`${AI_BACKEND_URL}/api/config`);
    
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi lấy config: ' + error.message
    });
  }
};

// @desc    Batch analyze multiple notes
// @route   POST /api/ai/batch-analyze
// @access  Private
exports.batchAnalyze = async (req, res) => {
  try {
    const { notes } = req.body;

    if (!notes || !Array.isArray(notes) || notes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Danh sách notes không hợp lệ'
      });
    }

    if (notes.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Tối đa 50 notes mỗi lần'
      });
    }

    // Format notes for AI backend
    const formattedNotes = notes.map(note => ({
      text: note.text,
      user_id: req.user.id
    }));

    const response = await axios.post(`${AI_BACKEND_URL}/api/batch-analyze`, {
      notes: formattedNotes
    });

    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Batch Analyze Error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi batch analyze: ' + error.message
    });
  }
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Map AI priority (Low/Medium/High) to Vietnamese
 */
function _mapPriorityToVietnamese(priority) {
  const priorityMap = {
    'Low': 'Thấp',
    'Medium': 'Trung bình',
    'High': 'Cao'
  };
  return priorityMap[priority] || 'Trung bình';
}

/**
 * Generate random color for new projects/categories
 */
function _generateRandomColor() {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316',
    '#6366F1', '#06B6D4', '#84CC16', '#A855F7'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Suggest icon for topic/category based on name
 */
function _suggestIconForTopic(topicName) {
  const lowerName = topicName.toLowerCase();
  
  const iconMap = {
    'lập trình': 'code',
    'phát triển': 'code',
    'coding': 'code',
    'thiết kế': 'palette',
    'design': 'palette',
    'quản lý': 'users',
    'management': 'users',
    'họp': 'users',
    'meeting': 'users',
    'báo cáo': 'file-text',
    'report': 'file-text',
    'email': 'mail',
    'marketing': 'trending-up',
    'nghiên cứu': 'search',
    'research': 'search',
    'học tập': 'book',
    'learning': 'book',
    'giao tiếp': 'message-circle',
    'communication': 'message-circle',
    'tài chính': 'dollar-sign',
    'finance': 'dollar-sign'
  };

  for (const [keyword, icon] of Object.entries(iconMap)) {
    if (lowerName.includes(keyword)) {
      return icon;
    }
  }

  return 'tag'; // Default icon
}

/**
 * Format estimated time to human-readable string
 */
function _formatEstimatedTime(minutes) {
  if (minutes < 60) {
    return `${minutes} phút`;
  } else {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} giờ`;
    }
    return `${hours} giờ ${remainingMinutes} phút`;
  }
}

