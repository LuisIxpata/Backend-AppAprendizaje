// tabla_guardarTokens.js
import 'dotenv/config';          //  👈  carga las variables de .env
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const crearTabla = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reset_tokens (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token TEXT NOT NULL,
        expires_at TIMESTAMP NOT NULL
      );
    `);
    console.log('✅  Tabla "guardar_tokens" creada correctamente.');
  } catch (error) {
    console.error('❌  Error creando la tabla "reset_tokens":', error);
  } finally {
    await pool.end();
  }
};

crearTabla();
