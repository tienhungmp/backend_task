const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema({
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
  content: {
    type: String,
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  tags: [{
    type: String,
    trim: true
  }],
  color: {
    type: String,
    default: '#FFFFFF'
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  lastOpenedAt: {
    type: Date,
    default: Date.now
  },
  reminderDate: {
    type: Date,
    default: null
  },
  attachments: [{
    name: String,
    url: String,
    type: String,
    size: Number
  }],
  aiSuggestions: {
    tasks: [{
      text: String,
      priority: String,
      category: String,
      confidence: Number
    }],
    analyzedAt: Date
  }
}, {
  timestamps: true
});

// Index for search
noteSchema.index({ title: 'text', content: 'text', tags: 'text' });

// Index for finding old notes
noteSchema.index({ lastOpenedAt: 1 });

module.exports = mongoose.model('Note', noteSchema);