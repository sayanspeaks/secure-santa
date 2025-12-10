# Security & Two-ID Model

This document explains the two-ID security model used by Secure Santa and gives production considerations and threat mitigations.

Summary
- Each participant has TWO independent cryptographically-random IDs:
  - Secret ID: private, used for participant login and known only to the participant and backend
  - Public ID: used in assignment relationships and visible to a participant's Santa
- Both IDs are generated with `crypto.randomBytes(16).toString('hex')` (128 bits of entropy)
- Assignments are stored using Public IDs; login and authentication use Secret IDs

Why this prevents leaks
- If a Santa knows someone's Public ID they cannot identify the person because:
  - Public and Secret IDs are independent random values
  - IDs are not derived from names or emails
  - Only backend has name ↔ Secret ID mapping

API contract (high-level)
- `POST /api/participants/login` → returns `{ secretId, publicId }` to the participant
- `GET  /api/participants/:secretId/assignment` → returns `{ yourSecretId, yourPublicId, receiverPublicId }`

Implementation notes
Email storage and verification
 Participant emails are stored in the database as salted `bcrypt` hashes. The server verifies a login by running `bcrypt.compare(plaintextEmail, storedHash)`. This approach avoids persisting plaintext email addresses while allowing login verification.

Deterministic tag for uniqueness (recommended)
 Salted bcrypt hashes are intentionally non-deterministic and therefore incompatible with DB-level UNIQUE constraints for `(event_id, email)`. To enforce atomic uniqueness while preserving privacy, add a deterministic `email_tag` column computed as `HMAC-SHA256(server_secret, email)` and create a unique index on `(event_id, email_tag)`. Continue storing bcrypt hashes for verification and privacy.

Production recommendations
- Always enable HTTPS/TLS
- Use JWTs or signed tokens for longer-lived authenticated requests
- Add rate limiting on login endpoints
- Protect DB credentials and rotate tokens when necessary
- Add auditing for admin operations

Threat model (short)
- Threat: Santa tries to identify participant → Mitigation: IDs are random and unrelated
- Threat: Brute force IDs → Mitigation: 128-bit entropy (computationally infeasible)
- Threat: DB breach → Mitigation: IDs are meaningless without mapping logic and proper DB access controls

For a full deep-dive, see `docs/overview.md`.
