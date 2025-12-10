import express from 'express';
import { getDatabase } from '../db.js';

export const assignmentRoutes = express.Router();

/**
 * Get assignment statistics (admin only)
 * GET /api/assignments/stats
 * Headers: { Authorization: organizerToken }
 */
assignmentRoutes.get('/stats', async (req, res) => {
  try {
    const db = getDatabase();

    db.query(
      'SELECT COUNT(*) as total_assignments FROM assignments',
      (err, result) => {
        if (err) {
          console.error('Error fetching stats:', err);
          return res.status(500).json({ error: 'Failed to fetch stats' });
        }

        res.json({
          total_assignments: parseInt(result.rows[0].total_assignments)
        });
      }
    );
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});
