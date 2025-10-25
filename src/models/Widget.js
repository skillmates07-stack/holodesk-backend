const mongoose = require('mongoose');

const widgetSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    workspaceId: {
      type: String,
      required: true,
      default: 'default',
      index: true
    },
    type: {
      type: String,
      required: true,
      enum: [
        'pomodoro-timer',
        'clock',
        'sticky-note',
        'todo-list',
        'quick-links',
        'calendar',
        'habits'
      ]
    },
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 }
    },
    size: {
      width: { type: Number, default: 300 },
      height: { type: Number, default: 200 }
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

// Compound index for efficient queries
widgetSchema.index({ userId: 1, workspaceId: 1 });
widgetSchema.index({ userId: 1, workspaceId: 1, id: 1 }, { unique: true });

module.exports = mongoose.model('Widget', widgetSchema);
