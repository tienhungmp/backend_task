const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  color: {
    type: String,
    default: '#4A90E2'
  },
  icon: {
    type: String,
    default: 'folder'
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'archived'],
    default: 'active'
  },
  startDate: {
    type: Date,
    default: null
  },
  endDate: {
    type: Date,
    default: null
  },
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  }
}, {
  timestamps: true
});

// Virtual to count tasks
projectSchema.virtual('taskCount', {
  ref: 'Task',
  localField: '_id',
  foreignField: 'project',
  count: true
});

module.exports = mongoose.model('Project', projectSchema);