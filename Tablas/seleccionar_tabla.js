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
    const res = await pool.query('SELECT * FROM progreso');
    console.log('📊 Resultados de la tabla progreso:');
    console.table(res.rows);
  } catch (err) {
    console.error('❌ Error al consultar progreso:', err);
  } finally {
    await pool.end(); // Cierra la conexión
  }
}

// Ejecuta la función
obtenerProgreso();
