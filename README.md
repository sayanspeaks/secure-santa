# Secure Santa — Anonymous Secret Gift Exchange (Privacy-first)

Overview

Secure Santa is a privacy-first Secret Santa application designed to keep participant identities private while enabling simple event management and anonymous gift assignments. The project implements a two-ID model where each participant receives both a Secret ID (private) and a Public ID (visible to their Santa). The application includes organizer-facing event management and participant-facing login and assignment retrieval.

Why this project exists

- Eliminates identity leakage common in naive Secure Santa apps by using independent, random Secret and Public IDs for each participant.
- Keeps name ↔ Secret ID mappings strictly on the backend.
- Ensures fair assignments (no self-assignments) with a provably correct shuffle.

Key features
- Organizer workflow: Create events (name, optional date, optional max budget, short description), add participants, and finalize assignments. Organizers manage events using a short organizer token.
- Participant workflow: Participants log in with their email and the Event ID to receive a Secret ID, Public ID, and their anonymous assignment.
- Privacy model: The system uses independent Secret and Public IDs to prevent identity leakage. Secret IDs remain private to participants and are never exposed to other users.
- Email handling: Participant emails are stored as bcrypt hashes; the server verifies logins by comparing plaintext emails with stored bcrypt hashes. Plaintext emails are not stored in the database.
- Wishlists: Participants may add wishlist items and delete them; wishlist entries are scoped to the event and to the participant's Secret ID.

Top-level quick start

1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

2. Configure backend (copy `.env.example` to `backend/.env` and set DB credentials)

3. Start servers

```bash
# terminal 1
cd backend && npm run dev

# terminal 2
cd frontend && npm run dev
```

4. Open `http://localhost:3000`, use the Organizer tab to create an event, add participants, finalize, then participants log in with their email and event id to retrieve assignments.

Developer notes

- Backend: `backend/` (Express + pg). See `docs/backend.md` for schema details and migration guidance.
- Frontend: `frontend/` (React + Vite). See `docs/frontend.md` for UI behavior and developer notes.
- Security: see `docs/security.md` for the two-ID model, email handling, and production recommendations.

If you are new here, read `docs/overview.md` then `docs/setup.md`.

Contributing

- Please open issues or PRs. For major changes (schema, API), open an issue first to discuss design and migration steps.
