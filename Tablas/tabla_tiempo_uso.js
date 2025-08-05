import 'dotenv/config';
import pool from '../db.js';

(async () => {
  try {
    await pool.query(`
      CREATE TABLE tiempo_uso (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id),
        tiempo_total_segundos INTEGER DEFAULT 0,
        ultima_fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    console.log('✅ Tabla "tiempo uso" creada correctamente o ya existía.');
  } catch (err) {
    console.error('❌ Error al crear la tabla "tiempo uso":', err);
  } finally {
    await pool.end();
    process.exit();
  }
})();
