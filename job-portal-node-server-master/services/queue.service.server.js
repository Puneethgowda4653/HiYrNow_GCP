/**
 * Queue Management Service
 * Provides endpoints for queue stats and management
 */

const { requireAdmin } = require('../middleware/rbac');
const { getAllQueueStats, getQueueStats } = require('../queues');

module.exports = function(app) {
  /**
   * Get stats for all queues
   * GET /api/queues/stats
   */
  app.get('/api/queues/stats', requireAdmin, async (req, res) => {
    try {
      const stats = await getAllQueueStats();
      res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error fetching queue stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch queue stats',
      });
    }
  });

  /**
   * Get stats for a specific queue
   * GET /api/queues/stats/:queueName
   */
  app.get('/api/queues/stats/:queueName', requireAdmin, async (req, res) => {
    try {
      const { queueName } = req.params;
      const stats = await getQueueStats(queueName);
      res.json({
        success: true,
        stats,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error fetching queue stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch queue stats',
        message: error.message,
      });
    }
  });
};

