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
      ALTER TABLE modulos
        ADD COLUMN IF NOT EXISTS ruta VARCHAR(100)
    `);

    console.log('✅ Columna agregada correctamente (o ya existían)');
  } catch (err) {
    console.error('❌ Error alterando tabla modulos:', err);
  } finally {
    await pool.end();
  }
};

migrate();