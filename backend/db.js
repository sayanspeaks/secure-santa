import pkg from 'pg';
const { Pool } = pkg;

let pool;

export function initializeDatabase() {
  return new Promise((resolve, reject) => {
    pool = new Pool({
      user: process.env.DB_USER || 'santa_user',
      host: process.env.DB_HOST || 'localhost',
      database: process.env.DB_NAME || 'secure_santa',
      password: process.env.DB_PASSWORD || 'password',
      port: process.env.DB_PORT || 5432,
    });

    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });

    pool.query('SELECT NOW()', (err, res) => {
      if (err) {
        reject(new Error(`Failed to connect to PostgreSQL: ${err.message}`));
        return;
      }

      console.log(' Connected to PostgreSQL');

      // Create tables (events first so other tables can reference it)
      pool.query(`
        CREATE TABLE IF NOT EXISTS events (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          organizer_token VARCHAR(255) NOT NULL UNIQUE,
          event_date TIMESTAMP NULL,
          budget NUMERIC NULL,
          description VARCHAR(200) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          finalized BOOLEAN DEFAULT FALSE
        );

        CREATE TABLE IF NOT EXISTS participants (
          id SERIAL PRIMARY KEY,
          real_name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          event_id VARCHAR(255) NOT NULL,
          secret_id VARCHAR(255) NOT NULL UNIQUE,
          public_id VARCHAR(255) NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
          UNIQUE (event_id, email)
        );

        CREATE TABLE IF NOT EXISTS assignments (
          id SERIAL PRIMARY KEY,
          event_id VARCHAR(255) NOT NULL,
          giver_id VARCHAR(255) NOT NULL,
          receiver_id VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (giver_id) REFERENCES participants(public_id),
          FOREIGN KEY (receiver_id) REFERENCES participants(public_id),
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
          UNIQUE(event_id, giver_id)
        );

        CREATE TABLE IF NOT EXISTS wishlists (
          id SERIAL PRIMARY KEY,
          event_id VARCHAR(255) NOT NULL,
          owner_public_id VARCHAR(255) NOT NULL,
          item_text TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (owner_public_id) REFERENCES participants(public_id) ON DELETE CASCADE,
          FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_participants_email ON participants(email);
        CREATE INDEX IF NOT EXISTS idx_participants_secret_id ON participants(secret_id);
        CREATE INDEX IF NOT EXISTS idx_participants_public_id ON participants(public_id);
        CREATE INDEX IF NOT EXISTS idx_assignments_giver_id ON assignments(giver_id);
        CREATE INDEX IF NOT EXISTS idx_assignments_event_id ON assignments(event_id);
        CREATE INDEX IF NOT EXISTS idx_wishlists_owner_public_id ON wishlists(owner_public_id);
      `, (err) => {
        if (err) {
          reject(new Error(`Failed to create tables: ${err.message}`));
          return;
        }

        console.log(' Database tables ready');
        resolve();
      });
    });
  });
}

export function getDatabase() {
  if (!pool) {
    throw new Error('Database not initialized');
  }
  return pool;
}
