# Backend Developer Notes

Location: `backend/`

Overview
- Express-based API server. Uses `pg` for PostgreSQL connections and `crypto` (Node) for secure random ID generation.

Important files
- `db.js` — DB pool and schema creation
- `routes/admin.js` — Event & participant management (organizer endpoints)
- `routes/participants.js` — Participant login and assignment retrieval
- `utils/crypto.js` — ID and token generation helpers
- `utils/assignment.js` — Fisher-Yates shuffle / derangement logic used to create fair assignments

Run
```bash
cd backend
npm install
npm run dev
```

Environment variables
- `DB_USER`, `DB_PASSWORD`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `PORT`

Operational details
- Schema: the `events` table includes `event_date TIMESTAMP`, `budget NUMERIC`, and `description VARCHAR(200)` to capture basic event metadata. The `participants` table stores `secret_id`, `public_id`, `name`, and `email` (bcrypt hash).
- Email storage: participant emails are stored as salted `bcrypt` hashes. The server verifies login attempts by comparing the plaintext email supplied at login with stored bcrypt hashes using `bcrypt.compare`.
- Wishlist scoping: wishlist entries are always associated with an `event_id` and the participant's `secret_id` to prevent cross-event data exposure.
- Delete behavior: deleting an event removes associated participants, assignments, and wishlists. Foreign-key constraints include `ON DELETE CASCADE` for clean teardown on fresh database initializations.

Design considerations
- Uniqueness: because bcrypt uses salts, hashes are non-deterministic and cannot be used directly for a DB-level UNIQUE constraint on `(event_id, email)`. 
- Backups: back up the database before applying schema or data migrations.
