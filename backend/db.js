require('dotenv').config({ quiet: true });
const { Pool } = require('pg');

// Connection details live in .env so the password never sits in the code.
// On the server (AWS RDS) we get one DATABASE_URL and must use SSL.
// On your laptop DATABASE_URL is not set, so the separate DB_* values are used.
// Don't put ?sslmode=... in DATABASE_URL: it overrides the ssl setting below.
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // encrypted, without checking the RDS certificate
    })
  : new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT) || 5432,
    });

module.exports = pool;
