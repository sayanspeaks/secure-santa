# Required Node Modules and Why They Matter

This table lists the primary Node modules this project depends on and why each is important.

Backend dependencies

| Package | Purpose | Why it's important |
|---------|---------|--------------------|
| express | Web framework | Lightweight, ubiquitous HTTP server for building API endpoints and middleware. Used for all routing and request handling. |
| cors | Cross-Origin Resource Sharing | Enables the frontend (running on a different port during development) to talk to the backend safely. |
| dotenv | Environment variable loading | Loads `.env` into `process.env` for local configuration (DB credentials, PORT). Keeps secrets out of source. |
| pg | PostgreSQL client | Production-ready driver for connecting to Postgres using `pg.Pool` and running queries. |
| uuid | Random/unique IDs (UUIDs) | Generates event IDs when a globally unique ID is desirable (optional). Useful for event identifiers. |

Frontend dependencies

| Package | Purpose | Why it's important |
|---------|---------|--------------------|
| react | UI library | Core library for building the interactive UI. |
| react-dom | DOM renderer | Renders React components into the browser DOM. |

Dev tooling (frontend)

| Package | Purpose | Why it's important |
|---------|---------|--------------------|
| vite | Dev server & bundler | Fast development server and build tool; supports HMR (hot module reload) for a snappy dev experience. |
| @vitejs/plugin-react | React-specific plugin | Enables React fast refresh and JSX transformation in Vite builds. |

Notes & guidance
- The backend intentionally uses a minimal set of well-known modules to reduce attack surface.
- `crypto` (Node builtin) is used for generating cryptographically secure random IDs — no external package required.
- If you add packages, run `npm audit` and pin versions for production.
