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
 * Bulk add participants from CSV
 * POST /api/admin/events/:eventId/participants/bulk
 * Headers: { Authorization: organizerToken }
 * Body: { csvData: string } - CSV format: name,email (one per line)
 */
adminRoutes.post('/events/:eventId/participants/bulk', authenticateOrganizer, async (req, res) => {
  try {
    const { eventId } = req.params;
    const { csvData } = req.body;

    if (!csvData) {
      return res.status(400).json({ error: 'CSV data is required' });
    }

    const db = getDatabase();
    const lines = csvData.split('\n').map(line => line.trim()).filter(line => line);
    
    // Remove header if present (check if first line contains 'name' and 'email')
    let dataLines = lines;
    if (lines.length > 0 && lines[0].toLowerCase().includes('name') && lines[0].toLowerCase().includes('email')) {
      dataLines = lines.slice(1);
    }

    const participants = [];
    const errors = [];
    
    // Parse CSV rows
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      const parts = line.split(',').map(p => p.trim());
      
      if (parts.length !== 2) {
        errors.push({ line: i + 1, error: 'Invalid format - expected name,email' });
        continue;
      }
      
      const [name, email] = parts;
      if (!name || !email) {
        errors.push({ line: i + 1, error: 'Name and email cannot be empty' });
        continue;
      }
      
      participants.push({ name, email });
    }

    if (participants.length === 0) {
      return res.status(400).json({ error: 'No valid participants found in CSV', errors });
    }

    // Fetch existing email hashes for duplicate detection
    const existing = await db.query('SELECT email FROM participants WHERE event_id = $1', [eventId]);
    const existingHashes = existing.rows.map(row => row.email);

    const added = [];
    const duplicates = [];
    const saltRounds = 10;

    // Start transaction
    await db.query('BEGIN');

    try {
      for (const participant of participants) {
        // Check for duplicates
        let isDuplicate = false;
        for (const hash of existingHashes) {
          try {
            const match = await bcrypt.compare(String(participant.email), hash);
            if (match) {
              isDuplicate = true;
              duplicates.push(participant.email);
              break;
            }
          } catch (e) {
            console.error('Error comparing email hash:', e);
          }
        }

        if (isDuplicate) continue;

        // Also check against already-added in this batch
        const alreadyInBatch = added.find(p => p.email === participant.email);
        if (alreadyInBatch) {
          duplicates.push(participant.email);
          continue;
        }

        // Hash email and insert
        const secretId = generateSecretId();
        const publicId = generatePublicId();
        const hashedEmail = await bcrypt.hash(String(participant.email), saltRounds);

        await db.query(
          'INSERT INTO participants (real_name, email, event_id, secret_id, public_id) VALUES ($1, $2, $3, $4, $5)',
          [participant.name, hashedEmail, eventId, secretId, publicId]
        );

        added.push(participant);
        existingHashes.push(hashedEmail); // Update for subsequent checks
      }

      await db.query('COMMIT');

      res.json({
        message: 'Bulk upload completed',
        added: added.length,
        skipped: duplicates.length,
        duplicates,
        errors
      });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error bulk adding participants:', error);
    res.status(500).json({ error: 'Failed to bulk add participants' });
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
    db.query('SELECT * FROM participants WHERE event_id = $1', [eventId], (err, result) => {
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
