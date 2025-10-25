// backend/models/Widget.js
const mongoose = require('mongoose');

const widgetSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  workspaceId: {
    type: String,
    required: true
  },
  id: String,
  type: String,
  position: {
    x: Number,
    y: Number
  },
  size: {
    width: Number,
    height: Number
  },
  config: Object
}, { timestamps: true });

module.exports = mongoose.model('Widget', widgetSchema);
