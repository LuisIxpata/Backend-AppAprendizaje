require('dotenv').config();
const pool = require('../db');

(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notificaciones (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        mensaje    TEXT     NOT NULL,
        leido      BOOLEAN  DEFAULT FALSE,
        fecha      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅  Tabla "notificaciones" creada (o ya existía).');
  } catch (err) {
    console.error('❌ Error creando tabla "notificaciones":', err);
  } finally {
    await pool.end();
    process.exit();
  }
})();
