require('dotenv').config();
const pool = require('../db');

(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS preguntas (
        id SERIAL PRIMARY KEY,
        modulo_id INTEGER REFERENCES modulos(id) ON DELETE CASCADE,
        enunciado TEXT NOT NULL,
        tipo TEXT NOT NULL,               -- ej.: opcion_multiple, vf, code
        opciones JSONB,                   -- arreglo de opciones si aplica
        respuesta_correcta TEXT NOT NULL,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabla "preguntas" creada (o ya existía).');
  } catch (err) {
    console.error('❌ Error creando tabla "preguntas":', err);
  } finally {
    await pool.end();
    process.exit();
  }
})();
