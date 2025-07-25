import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

// Configura tu conexión
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // si estás en Render, deja esto
});

async function obtenerProgreso() {
  try {
    const res = await pool.query('SELECT * FROM preguntas');
    console.log('📊 Resultados de la tabla :');
    console.table(res.rows);
  } catch (err) {
    console.error('❌ Error al consultar:', err);
  } finally {
    await pool.end(); // Cierra la conexión
  }
}


obtenerProgreso();
