import express from 'express';
import { getDatabase } from '../db.js';
import bcrypt from 'bcrypt';

export const participantRoutes = express.Router();

/**
 * Authenticate participant with encrypted email provided by the client
 * POST /api/participants/login
 * Body: { email: string (encrypted), eventId: string }
 * Response: { secretId: string, publicId: string }
 */
participantRoutes.post('/login', async (req, res) => {
  try {
    const { email, eventId } = req.body; // email is plaintext from client

    if (!email || !eventId) {
      return res.status(400).json({ error: 'Email and eventId are required' });
    }

    const db = getDatabase();

    // Fetch all participants for the event and compare bcrypt hashes
    const result = await db.query('SELECT secret_id, public_id, email FROM participants WHERE event_id = $1', [eventId]);

    for (const row of result.rows) {
      try {
        const match = await bcrypt.compare(String(email), row.email);
        if (match) {
          // Also include event details in the response so participant UI can display them
          const ev = await db.query('SELECT id, name, event_date, budget, description, finalized FROM events WHERE id = $1', [eventId]);
          const event = ev.rows[0] || null;
          return res.json({ message: ' Login successful', secretId: row.secret_id, publicId: row.public_id, event });
        }
      } catch (e) {
        console.error('Error comparing email hash during login:', e);
      }
    }

    // No match
    return res.status(401).json({ error: 'Invalid credentials or event' });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});


/**
 * Get participant's assignment
 * GET /api/participants/:secretId/assignment
 */
participantRoutes.get('/:secretId/assignment', (req, res) => {
  try {
    const { secretId } = req.params;

    const db = getDatabase();

    // Verify the secret_id exists and get the public_id
    db.query(
      'SELECT id, public_id FROM participants WHERE secret_id = $1',
      [secretId],
      (err, result) => {
        if (err) {
          console.error('Error fetching participant:', err);
          return res.status(500).json({ error: 'Failed to fetch assignment' });
        }

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Participant not found' });
        }

        const participant = result.rows[0];
        const yourPublicId = participant.public_id;

        // Get assignment using public_id (as the giver)
        db.query(
          'SELECT receiver_id FROM assignments WHERE giver_id = $1',
          [yourPublicId],
          (err, assignmentResult) => {
            if (err) {
              console.error('Error fetching assignment:', err);
              return res.status(500).json({ error: 'Failed to fetch assignment' });
            }

            if (assignmentResult.rows.length === 0) {
              return res.status(404).json({ error: 'Assignment not yet finalized' });
            }

            const assignment = assignmentResult.rows[0];

            res.json({
              yourSecretId: secretId,
              yourPublicId: yourPublicId,
              receiverPublicId: assignment.receiver_id,
              message: ' Your Secret ID stays private. Your Santa only knows your Public ID.'
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Error fetching assignment:', error);
    res.status(500).json({ error: 'Failed to fetch assignment' });
  }
});


/**
 * Get own wishlist items
 * GET /api/participants/:secretId/wishlist
 */
participantRoutes.get('/:secretId/wishlist', (req, res) => {
  try {
    const { secretId } = req.params;
    const db = getDatabase();

    db.query(
      'SELECT public_id, event_id FROM participants WHERE secret_id = $1',
      [secretId],
      (err, result) => {
        if (err) {
          console.error('Error fetching participant for wishlist:', err);
          return res.status(500).json({ error: 'Failed to fetch wishlist' });
        }

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Participant not found' });
        }

        const publicId = result.rows[0].public_id;
        const eventId = result.rows[0].event_id;

        db.query(
          'SELECT id, item_text, created_at FROM wishlists WHERE owner_public_id = $1 AND event_id = $2 ORDER BY created_at DESC',
          [publicId, eventId],
          (err, itemsResult) => {
            if (err) {
              console.error('Error fetching wishlist items:', err);
              return res.status(500).json({ error: 'Failed to fetch wishlist' });
            }

            res.json({ items: itemsResult.rows });
          }
        );
      }
    );
  } catch (error) {
    console.error('Error in wishlist route:', error);
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});


/**
 * Add a wishlist item for the logged-in participant
 */
participantRoutes.post('/:secretId/wishlist', (req, res) => {
  try {
    const { secretId } = req.params;
    const { item } = req.body;

    if (!item || typeof item !== 'string' || item.trim() === '') {
      return res.status(400).json({ error: 'Item text is required' });
    }

    const db = getDatabase();

    db.query('SELECT public_id, event_id FROM participants WHERE secret_id = $1', [secretId], (err, result) => {
      if (err) {
        console.error('Error fetching participant for adding wishlist:', err);
        return res.status(500).json({ error: 'Failed to add wishlist item' });
      }

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Participant not found' });
      }

      const publicId = result.rows[0].public_id;
      const eventId = result.rows[0].event_id;

      db.query(
        'INSERT INTO wishlists (event_id, owner_public_id, item_text) VALUES ($1, $2, $3) RETURNING id, item_text, created_at',
        [eventId, publicId, item.trim()],
        (err, insertResult) => {
          if (err) {
            console.error('Error inserting wishlist item:', err);
            return res.status(500).json({ error: 'Failed to add wishlist item' });
          }

          res.status(201).json({ item: insertResult.rows[0] });
        }
      );
    });
  } catch (error) {
    console.error('Error adding wishlist item:', error);
    res.status(500).json({ error: 'Failed to add wishlist item' });
  }
});


/**
 * Delete a wishlist item (only owner)
 */
participantRoutes.delete('/:secretId/wishlist/:itemId', (req, res) => {
  try {
    const { secretId, itemId } = req.params;
    const db = getDatabase();

    db.query('SELECT public_id, event_id FROM participants WHERE secret_id = $1', [secretId], (err, pResult) => {
      if (err) {
        console.error('Error fetching participant for deleting wishlist:', err);
        return res.status(500).json({ error: 'Failed to delete wishlist item' });
      }

      if (pResult.rows.length === 0) {
        return res.status(404).json({ error: 'Participant not found' });
      }

      const publicId = pResult.rows[0].public_id;
      const eventId = pResult.rows[0].event_id;

      // Verify ownership and event
      db.query('SELECT owner_public_id, event_id FROM wishlists WHERE id = $1', [itemId], (err, wRes) => {
        if (err) {
          console.error('Error fetching wishlist item for delete:', err);
          return res.status(500).json({ error: 'Failed to delete wishlist item' });
        }

        if (wRes.rows.length === 0) {
          return res.status(404).json({ error: 'Wishlist item not found' });
        }

        if (wRes.rows[0].owner_public_id !== publicId || wRes.rows[0].event_id !== eventId) {
          return res.status(403).json({ error: 'Not authorized to delete this item' });
        }

        db.query('DELETE FROM wishlists WHERE id = $1', [itemId], (err) => {
          if (err) {
            console.error('Error deleting wishlist item:', err);
            return res.status(500).json({ error: 'Failed to delete wishlist item' });
          }

          res.status(204).end();
        });
      });
    });
  } catch (error) {
    console.error('Error deleting wishlist item:', error);
    res.status(500).json({ error: 'Failed to delete wishlist item' });
  }
});


/**
 * Get wishlist items of the participant you are assigned to (your receiver)
 * GET /api/participants/:secretId/receiver-wishlist
 */
participantRoutes.get('/:secretId/receiver-wishlist', (req, res) => {
  try {
    const { secretId } = req.params;
    const db = getDatabase();

    // Get your public id first
    db.query('SELECT public_id FROM participants WHERE secret_id = $1', [secretId], (err, result) => {
      if (err) {
        console.error('Error fetching participant for receiver wishlist:', err);
        return res.status(500).json({ error: 'Failed to fetch receiver wishlist' });
      }

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Participant not found' });
      }

      const yourPublicId = result.rows[0].public_id;

      // Find assignment where you are the giver
      db.query('SELECT receiver_id, event_id FROM assignments WHERE giver_id = $1', [yourPublicId], (err, assignmentResult) => {
        if (err) {
          console.error('Error fetching assignment for receiver wishlist:', err);
          return res.status(500).json({ error: 'Failed to fetch receiver wishlist' });
        }

        if (assignmentResult.rows.length === 0) {
          return res.status(404).json({ error: 'Assignment not yet finalized' });
        }

        const receiverPublicId = assignmentResult.rows[0].receiver_id;
        const eventId = assignmentResult.rows[0].event_id;

        db.query(
          'SELECT id, item_text, created_at FROM wishlists WHERE owner_public_id = $1 AND event_id = $2 ORDER BY created_at DESC',
          [receiverPublicId, eventId],
          (err, itemsResult) => {
            if (err) {
              console.error('Error fetching receiver wishlist items:', err);
              return res.status(500).json({ error: 'Failed to fetch receiver wishlist' });
            }

            res.json({ receiverPublicId, items: itemsResult.rows });
          }
        );
      });
    });
  } catch (error) {
    console.error('Error fetching receiver wishlist:', error);
    res.status(500).json({ error: 'Failed to fetch receiver wishlist' });
  }
});