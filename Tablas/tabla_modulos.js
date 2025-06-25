require('dotenv').config();
const pool = require('../db');

(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS modulos (
        id SERIAL PRIMARY KEY,
        nombre TEXT NOT NULL,
        descripcion TEXT,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Tabla "modulos" creada correctamente o ya existía.');
  } catch (err) {
    console.error('❌ Error al crear la tabla "modulos":', err);
  } finally {
    await pool.end();
    process.exit();
  }
})();
