 # Setup & Quickstart

 This file combines the Quick Start instructions and PostgreSQL setup steps into one concise guide.

 Prerequisites
 - Node.js v16+ and npm
 - PostgreSQL (for production/use beyond simple local testing)

 1) Install dependencies

 Backend:
 ```bash
 cd backend
 npm install
 ```

 Frontend:
 ```bash
 cd frontend
 npm install
 ```

 2) Configure the backend

 Copy `.env.example` to `.env` and set DB credentials (for local dev you can use a local postgres user):

 ```
 PORT=3001
 DB_USER=santa_user
 DB_PASSWORD=your_secure_password
 DB_HOST=localhost
 DB_PORT=5432
 DB_NAME=santa
 ```

 3) (Optional) PostgreSQL quick setup

 ```bash
 # run as a user with permission to create DBs (e.g., sudo -u postgres psql)
 # Inside psql prompt:
 CREATE USER santa_user WITH PASSWORD 'your_secure_password';
 CREATE DATABASE santa OWNER santa_user;
 GRANT ALL PRIVILEGES ON DATABASE santa TO santa_user;
 \q
 ```

 4) Start backend and frontend

 Backend (new terminal):
 ```bash
 cd backend
 npm run dev
 ```

 Frontend (new terminal):
 ```bash
 cd frontend
 npm run dev
 ```

 5) Basic usage

 1. Open `http://localhost:3000`
 2. Use the Organizer tab to create an event, add participants, then finalize
 3. Participants login with email and retrieve their assignment

 6) Verification notes

 - The backend will create necessary tables on startup if they do not exist.
 - If you change schemas or need to reset, you may drop and recreate the DB (see docs). Use caution: dropping a DB is destructive.

 If you encounter errors, see `docs/troubleshooting.md`.
