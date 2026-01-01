const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
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
  color: {
    type: String,
    default: '#808080'
  },
  icon: {
    type: String,
    default: 'tag'
  },
  type: {
    type: String,
    enum: ['note', 'task', 'both'],
    default: 'both'
  }
}, {
  timestamps: true
});

// Unique index per user
categorySchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);