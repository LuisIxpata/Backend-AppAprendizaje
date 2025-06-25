require('dotenv').config();
const pool = require('../db');   // Ajusta la ruta si tu archivo db.js está en otro lugar

(async () => {
  try {
    // Crear tabla archivos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS archivos (
        id SERIAL PRIMARY KEY,
        titulo      VARCHAR(100) NOT NULL,
        descripcion TEXT,
        tipo        VARCHAR(50),          -- ej.: pdf, imagen, video
        url         TEXT NOT NULL,        -- ruta o URL final del archivo
        modulo_id   INTEGER REFERENCES modulos(id) ON DELETE CASCADE,
        fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅  Tabla "archivos" creada (o ya existía).');
  } catch (err) {
    console.error('❌  Error creando la tabla "archivos":', err);
  } finally {
    await pool.end();
    process.exit();
  }
})();
