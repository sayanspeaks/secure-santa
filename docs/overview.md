# Secure Santa — Overview

Welcome! This repository is a small, secure Secure Santa application that protects participant privacy using a two-ID security model. The project is full-stack: a Node.js/Express backend and a React + Vite frontend.

What this repo provides:
- A privacy-first Secure Santa flow (organizer creates event, adds participants, finalizes assignments)
- A two-ID model per participant (Secret ID for login; Public ID used in assignment relationships)
- Fair assignments using Fisher–Yates shuffle (no self-assignments)
- PostgreSQL-ready backend

Start here:
- Quick start: `docs/setup.md`
- Security model: `docs/security.md`
- Troubleshooting: `docs/troubleshooting.md`

High-level structure

```
secure-santa/
  backend/    # Express server, DB schema and API routes
  frontend/   # React + Vite UI
  docs/       # Consolidated documentation (this folder)
  README.md   # Project entrypoint (this file)
```

Quick links
- Admin API: `POST /api/admin/events`, `POST /api/admin/events/:id/participants`, `POST /api/admin/events/:id/finalize`
- Participant API: `POST /api/participants/login`, `GET /api/participants/:secretId/assignment`

Why two IDs?
- Prevents identity leakage: the ID a participant sees is different from the ID their Santa sees.
- Both IDs are random, cryptographically secure, and unique.

If you are an organizer or developer new to the project, open `docs/setup.md` next.
