require('dotenv').config();
const pool = require('../db');

(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mensajes (
        id           SERIAL PRIMARY KEY,
        emisor_id    INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        receptor_id  INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        mensaje      TEXT     NOT NULL,
        leido        BOOLEAN  DEFAULT FALSE,
        fecha_envio  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅  Tabla "mensajes" creada (o ya existía).');
  } catch (err) {
    console.error('❌  Error creando la tabla "mensajes":', err);
  } finally {
    await pool.end();
    process.exit();
  }
})();
