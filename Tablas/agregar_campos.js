// Tablas/add_columns_usuarios.js
import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const migrate = async () => {
  try {
    // Ejecutar ALTER TABLE una sola vez con columnas separadas correctamente
    await pool.query(`
      ALTER TABLE usuarios
        ADD COLUMN IF NOT EXISTS carrera VARCHAR(100),
        ADD COLUMN IF NOT EXISTS telefono VARCHAR(20),
        ADD COLUMN IF NOT EXISTS correo VARCHAR(255) UNIQUE;
    `);

    console.log('✅ Columnas agregadas correctamente (o ya existían)');
  } catch (err) {
    console.error('❌ Error alterando tabla usuarios:', err);
  } finally {
    await pool.end();
  }
};

migrate();
