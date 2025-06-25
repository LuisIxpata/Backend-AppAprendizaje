require('dotenv').config();
const pool = require('../db');

(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS progreso (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        modulo_id  INTEGER REFERENCES modulos(id)  ON DELETE CASCADE,
        porcentaje NUMERIC(5,2) NOT NULL DEFAULT 0,       -- 0 – 100 %
        ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (usuario_id, modulo_id)                    -- un registro por usuario-módulo
      );
    `);
    console.log('✅  Tabla "progreso" creada (o ya existía).');
  } catch (err) {
    console.error('❌ Error creando tabla "progreso":', err);
  } finally {
    await pool.end();
    process.exit();
  }
})();
