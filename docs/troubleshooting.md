# Troubleshooting

Common issues and quick solutions.

1) ENOENT or missing env variables
- Ensure `backend/.env` exists and variables are set (PORT, DB_*). Copy `.env.example` if needed.

2) PostgreSQL connection errors
- Check the DB is running and credentials match. Use `psql` to manually connect.
- Verify `DB_HOST` and `DB_PORT` are correct.

3) Port already in use
- If backend port (3001) or frontend port (3000) is in use, change `PORT` in `.env` or stop the conflicting process (`lsof -i :3001`).

4) Vite watcher issues on Linux (ENOSPC)
- Increase inotify watchers: `sudo sysctl fs.inotify.max_user_watches=524288`
- Or add to `/etc/sysctl.conf` for persistence.

5) IDs look duplicated or collisions (very unlikely)
- IDs are generated with `crypto.randomBytes(16)` (128 bits). Collisions are practically impossible. If collisions appear, ensure your server code isn't reusing a seed or running in a deterministic test mode.

6) Admin token not accepted
- Ensure you send the `Authorization: Bearer <token>` header. Tokens are generated when creating an event; store them securely.

7) Assignments look invalid (someone got themselves)
- The shuffle should ensure no self-assignments. If you observe self-assignments, restart the server and re-run finalize; inspect `backend/utils/assignment.js` to ensure the derangement logic is intact.

If problems persist, consult logs (`backend` terminal) and open an issue with the stack trace and a description of steps to reproduce.
