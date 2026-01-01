const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  priority: {
    type: String,
    enum: ['Thấp', 'Trung bình', 'Cao', 'Khẩn cấp'],
    default: 'Trung bình'
  },
  status: {
    type: String,
    enum: ['Chưa bắt đầu', 'Đang làm', 'Hoàn thành', 'Tạm dừng'],
    default: 'Chưa bắt đầu'
  },
  startDate: {
    type: Date,
    default: null
  },
  dueDate: {
    type: Date,
    default: null
  },
  completedAt: {
    type: Date,
    default: null
  },
  estimatedMinutes: {
    type: Number,
    default: null
  },
  reminderDate: {
    type: Date,
    default: null
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  tags: [{
    type: String,
    trim: true
  }],
  subtasks: [{
    title: String,
    isCompleted: {
      type: Boolean,
      default: false
    },
    completedAt: Date
  }],
  createdFromNote: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note',
    default: null
  },
  aiGenerated: {
    type: Boolean,
    default: false
  },
  aiConfidence: {
    priority: Number,
    project: Number,
    category: Number
  }
}, {
  timestamps: true
});

// Index for queries
taskSchema.index({ status: 1, dueDate: 1 });
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ reminderDate: 1, reminderSent: 1 });

// Virtual for checking if overdue
taskSchema.virtual('isOverdue').get(function() {
  return this.dueDate && this.dueDate < new Date() && this.status !== 'Hoàn thành';
});

// Method to mark as completed
taskSchema.methods.markCompleted = function() {
  this.status = 'Hoàn thành';
  this.completedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Task', taskSchema);