import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const agregarConstraintUnique = async () => {
  try {
    await pool.query(`
      ALTER TABLE reset_tokens
      ADD CONSTRAINT unique_email UNIQUE(email);
    `);
    console.log('✅ Restricción UNIQUE agregada a la columna "email".');
  } catch (error) {
    console.error('❌ Error al agregar la restricción UNIQUE:', error.message);
  } finally {
    await pool.end();
  }
};

agregarConstraintUnique();