# Frontend Developer Notes

Location: `frontend/`

Overview
- React + Vite application. Contains `ParticipantView` and `AdminView` components and uses `fetch` to call the backend API.

Run
```bash
cd frontend
npm install
npm run dev
```

UI and behavior
- AdminView: organizers manage events and participants. Organizers log in using a short organizer token. The create-event form accepts `Event Name`, optional `Event Date`, optional `Max. Budget`, and a `Short Description` (max 200 characters).
- Organizer UX: the Organizer tab prioritizes token-based login for quick management workflows. The tab buttons allow switching between token login and event creation.
- ParticipantView: participants log in by supplying an `Event ID` and their email address. The frontend sends `eventId` as a trimmed string to the backend.
- Assignment flow: after successful login the server returns participant identifiers and the event metadata (name, date, budget, description). The frontend displays event details alongside assignment information.
- Wishlists: participants may add wishlist items and delete them; wishlist entries are scoped by `event_id` and the participant's `secret_id`. The wishlist UI is delete-only (no edit API), and each item shows a small delete control.

Styling notes
- Inputs and textareas are styled consistently for coherent form appearance; textareas are allowed to resize vertically and have a minimum height.

UI developer notes
- When changing form inputs, keep input and textarea styles consistent (see `frontend/index.html` where `textarea` styles match `input`).
- After a successful participant login the server returns `event` metadata (name, event_date, budget, description) — display it in both pre-assignment and assignment views.
