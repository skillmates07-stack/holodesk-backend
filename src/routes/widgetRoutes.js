// backend/routes/widgets.js (or similar)
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth'); // Your auth middleware

// Get widgets for workspace
router.get('/:workspaceId', auth, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id; // From auth middleware

    // Find widgets in your database
    const widgets = await Widget.find({ 
      userId, 
      workspaceId 
    });

    res.json({ widgets });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch widgets' });
  }
});

// Save widgets layout
router.post('/:workspaceId', auth, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { widgets } = req.body;
    const userId = req.user.id;

    // Delete old widgets for this workspace
    await Widget.deleteMany({ userId, workspaceId });

    // Save new widgets
    const savedWidgets = await Widget.insertMany(
      widgets.map(w => ({ ...w, userId, workspaceId }))
    );

    res.json({ widgets: savedWidgets });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save widgets' });
  }
});

module.exports = router;
// src/routes/widgetRoutes.js - Placeholder for implementation
