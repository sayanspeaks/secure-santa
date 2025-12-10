import express from 'express';
import { getDatabase } from '../db.js';
import { generateSecretId, generatePublicId, generateOrganizerToken, generateEventId } from '../utils/crypto.js';
import { createAssignments } from '../utils/assignment.js';
import bcrypt from 'bcrypt';

export const adminRoutes = express.Router();

/**
 * Create a new event
 * POST /api/admin/events
 * Body: { name: string }
 * Response: { eventId: string, organizerToken: string }
 */
adminRoutes.post('/events', (req, res) => {
  try {
    const { name, eventDate, budget, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Event name is required' });
    }

    if (description && description.length > 200) {
      return res.status(400).json({ error: 'Description must be 200 characters or fewer' });
    }

    const db = getDatabase();
    const eventId = generateEventId();
    const organizerToken = generateOrganizerToken();

    db.query(
      'INSERT INTO events (id, name, organizer_token, event_date, budget, description) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      [eventId, name, organizerToken, eventDate || null, budget || null, description || null],
      (err, result) => {
        if (err) {
          console.error('Error creating event:', err);
          return res.status(500).json({ error: 'Failed to create event' });
        }

        res.json({
          eventId,
          organizerToken,
          message: 'Event created. Use this token to manage participants.'
        });
      }
    );
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

/**
 * Add participant to event
 * POST /api/admin/events/:eventId/participants
 * Headers: { Authorization: organizerToken }
 * Body: { name: string, email: string }
 */
adminRoutes.post('/events/:eventId/participants', authenticateOrganizer, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { name, email } = req.body; // plaintext email from client

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const db = getDatabase();
    const secretId = generateSecretId();
    const publicId = generatePublicId();

    // Fetch existing email hashes (bcrypt) for this event and compare
    const existing = await db.query('SELECT email FROM participants WHERE event_id = $1', [eventId]);

    for (const row of existing.rows) {
      try {
        const match = await bcrypt.compare(String(email), row.email);
        if (match) {
          return res.status(409).json({ error: 'Participant with this email already exists for this event' });
        }
      } catch (e) {
        console.error('Error comparing email hash:', e);
      }
    }

    // Hash the email before storing
    const saltRounds = 10;
    const hashedEmail = await bcrypt.hash(String(email), saltRounds);

    await db.query(
      'INSERT INTO participants (real_name, email, event_id, secret_id, public_id) VALUES ($1, $2, $3, $4, $5)',
      [name, hashedEmail, eventId, secretId, publicId]
    );

    res.json({ message: 'Participant added', secretId, publicId });
  } catch (error) {
    console.error('Error adding participant:', error);
    res.status(500).json({ error: 'Failed to add participant' });
  }
});

/**
 * Finalize assignments for an event
 * POST /api/admin/events/:eventId/finalize
 * Headers: { Authorization: organizerToken }
 */
adminRoutes.post('/events/:eventId/finalize', authenticateOrganizer, (req, res) => {
  try {
    const { eventId } = req.params;
    const db = getDatabase();

    // Get all participants for this event
    db.query('SELECT * FROM participants', (err, result) => {
      if (err) {
        console.error('Error fetching participants:', err);
        return res.status(500).json({ error: 'Failed to finalize assignments' });
      }

      const participants = result.rows;

      if (!participants || participants.length < 2) {
        return res.status(400).json({ error: 'Need at least 2 participants' });
      }

      try {
        // Create assignments
        const assignments = createAssignments(participants);

        // Insert assignments
        let completed = 0;
        assignments.forEach((assignment) => {
          db.query(
            'INSERT INTO assignments (event_id, giver_id, receiver_id) VALUES ($1, $2, $3)',
            [eventId, assignment.giver_id, assignment.receiver_id],
            (err) => {
              if (err) {
                console.error('Error inserting assignment:', err);
              }
              completed++;

              // After all assignments inserted, mark event as finalized
              if (completed === assignments.length) {
                db.query(
                  'UPDATE events SET finalized = true WHERE id = $1',
                  [eventId],
                  (err) => {
                    if (err) {
                      console.error('Error finalizing event:', err);
                      return res.status(500).json({ error: 'Failed to finalize assignments' });
                    }

                    res.json({
                      message: ' Assignments finalized',
                      count: assignments.length
                    });
                  }
                );
              }
            }
          );
        });
      } catch (error) {
        console.error('Error creating assignments:', error);
        res.status(500).json({ error: 'Failed to create valid assignments' });
      }
    });
  } catch (error) {
    console.error('Error finalizing assignments:', error);
    res.status(500).json({ error: 'Failed to finalize assignments' });
  }
});

/**
 * Get event details and participant count
 * GET /api/admin/events/:eventId
 * Headers: { Authorization: organizerToken }
 */
// Also support token-only lookup: GET /api/admin/events with Authorization header
// This returns the event associated with the provided organizer token.
adminRoutes.get('/events', authenticateOrganizer, (req, res) => {
  try {
    const token = req.organizerToken;
    const db = getDatabase();

    db.query(
      'SELECT id, name, finalized, event_date, budget, description FROM events WHERE organizer_token = $1',
      [token],
      (err, result) => {
        if (err) {
          console.error('Error fetching event by token:', err);
          return res.status(500).json({ error: 'Failed to fetch event' });
        }

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Event not found for this token' });
        }

        const event = result.rows[0];

        db.query(
          'SELECT COUNT(*) as count FROM participants WHERE event_id = $1',
          [event.id],
          (err, countResult) => {
            if (err) {
              console.error('Error counting participants:', err);
              return res.status(500).json({ error: 'Failed to fetch event' });
            }

            res.json({
              event,
              participantCount: parseInt(countResult.rows[0].count)
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Error fetching event by token:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

adminRoutes.get('/events/:eventId', authenticateOrganizer, (req, res) => {
  try {
    const { eventId } = req.params;
    const db = getDatabase();

    db.query(
      'SELECT id, name, finalized, event_date, budget, description FROM events WHERE id = $1',
      [eventId],
      (err, result) => {
        if (err) {
          console.error('Error fetching event:', err);
          return res.status(500).json({ error: 'Failed to fetch event' });
        }

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Event not found' });
        }

        const event = result.rows[0];

        db.query(
          'SELECT COUNT(*) as count FROM participants WHERE event_id = $1',
          [eventId],
          (err, countResult) => {
            if (err) {
              console.error('Error counting participants:', err);
              return res.status(500).json({ error: 'Failed to fetch event' });
            }

            res.json({
              event,
              participantCount: parseInt(countResult.rows[0].count)
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

/**
 * Delete an event and all associated data
 * DELETE /api/admin/events/:eventId
 * Headers: { Authorization: organizerToken }
 */
adminRoutes.delete('/events/:eventId', authenticateOrganizer, (req, res) => {
  try {
    const { eventId } = req.params;
    const token = req.organizerToken;
    const db = getDatabase();

    // Start a transaction to remove related rows
    db.query('BEGIN', (err) => {
      if (err) {
        console.error('Error starting transaction for delete event:', err);
        return res.status(500).json({ error: 'Failed to delete event' });
      }

      // Verify event belongs to this token
      db.query(
        'SELECT id FROM events WHERE id = $1 AND organizer_token = $2',
        [eventId, token],
        (err, result) => {
          if (err) {
            console.error('Error verifying event for delete:', err);
            db.query('ROLLBACK', () => {});
            return res.status(500).json({ error: 'Failed to delete event' });
          }

          if (result.rows.length === 0) {
            db.query('ROLLBACK', () => {});
            return res.status(404).json({ error: 'Event not found or unauthorized' });
          }

          // Delete assignments, wishlists, participants, then event
          db.query('DELETE FROM assignments WHERE event_id = $1', [eventId], (err) => {
            if (err) {
              console.error('Error deleting assignments for event:', err);
              db.query('ROLLBACK', () => {});
              return res.status(500).json({ error: 'Failed to delete event' });
            }

            db.query('DELETE FROM wishlists WHERE event_id = $1', [eventId], (err) => {
              if (err) {
                console.error('Error deleting wishlists for event:', err);
                db.query('ROLLBACK', () => {});
                return res.status(500).json({ error: 'Failed to delete event' });
              }

              db.query('DELETE FROM participants WHERE event_id = $1', [eventId], (err) => {
                if (err) {
                  console.error('Error deleting participants for event:', err);
                  db.query('ROLLBACK', () => {});
                  return res.status(500).json({ error: 'Failed to delete event' });
                }

                db.query('DELETE FROM events WHERE id = $1', [eventId], (err) => {
                  if (err) {
                    console.error('Error deleting event row:', err);
                    db.query('ROLLBACK', () => {});
                    return res.status(500).json({ error: 'Failed to delete event' });
                  }

                  db.query('COMMIT', (err) => {
                    if (err) {
                      console.error('Error committing delete event transaction:', err);
                      return res.status(500).json({ error: 'Failed to delete event' });
                    }

                    res.json({ message: 'Event and related data deleted' });
                  });
                });
              });
            });
          });
        }
      );
    });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

/**
 * Middleware: Authenticate organizer token
 */
function authenticateOrganizer(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  // In production, validate the token against the database
  req.organizerToken = token;
  next();
}
