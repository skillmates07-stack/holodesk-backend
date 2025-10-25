const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const Widget = require('../models/Widget');

/**
 * GET /api/widgets/:workspaceId
 * Get all widgets for a workspace
 */
router.get('/:workspaceId', auth, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const userId = req.user.id;

    console.log(`📦 Fetching widgets for workspace: ${workspaceId}, user: ${userId}`);

    const widgets = await Widget.find({ 
      userId, 
      workspaceId 
    }).sort({ createdAt: -1 });

    console.log(`✅ Found ${widgets.length} widgets`);

    res.json({ 
      status: 'success',
      widgets 
    });
  } catch (error) {
    console.error('❌ Error fetching widgets:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Failed to fetch widgets',
      message: error.message
    });
  }
});

/**
 * POST /api/widgets/:workspaceId
 * Save/update widgets layout for workspace
 */
router.post('/:workspaceId', auth, async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { widgets } = req.body;
    const userId = req.user.id;

    console.log(`💾 Saving ${widgets?.length || 0} widgets for workspace: ${workspaceId}`);

    if (!widgets || !Array.isArray(widgets)) {
      return res.status(400).json({
        status: 'error',
        error: 'Widgets array is required'
      });
    }

    await Widget.deleteMany({ userId, workspaceId });
    console.log('🗑️  Deleted old widgets');

    const savedWidgets = await Widget.insertMany(
      widgets.map(w => ({ 
        ...w, 
        userId, 
        workspaceId 
      }))
    );

    console.log(`✅ Saved ${savedWidgets.length} widgets`);

    res.json({ 
      status: 'success',
      widgets: savedWidgets,
      message: `Saved ${savedWidgets.length} widgets`
    });
  } catch (error) {
    console.error('❌ Error saving widgets:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Failed to save widgets',
      message: error.message
    });
  }
});

/**
 * DELETE /api/widgets/:workspaceId/:widgetId
 * Delete a single widget
 */
router.delete('/:workspaceId/:widgetId', auth, async (req, res) => {
  try {
    const { workspaceId, widgetId } = req.params;
    const userId = req.user.id;

    console.log(`🗑️  Deleting widget: ${widgetId} from workspace: ${workspaceId}`);

    const result = await Widget.deleteOne({ 
      id: widgetId,
      userId, 
      workspaceId 
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        status: 'error',
        error: 'Widget not found'
      });
    }

    console.log('✅ Widget deleted');

    res.json({ 
      status: 'success',
      message: 'Widget deleted successfully'
    });
  } catch (error) {
    console.error('❌ Error deleting widget:', error);
    res.status(500).json({ 
      status: 'error',
      error: 'Failed to delete widget',
      message: error.message
    });
  }
});

module.exports = router;
