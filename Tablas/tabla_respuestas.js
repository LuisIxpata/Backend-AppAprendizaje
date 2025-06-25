require('dotenv').config();
const pool = require('../db');

(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS respuestas (
        id SERIAL PRIMARY KEY,
        usuario_id   INTEGER REFERENCES usuarios(id)  ON DELETE CASCADE,
        pregunta_id  INTEGER REFERENCES preguntas(id) ON DELETE CASCADE,
        respuesta    TEXT    NOT NULL,
        correcta     BOOLEAN NOT NULL,
        fecha_respuesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Tabla "respuestas" creada (o ya existía).');
  } catch (err) {
    console.error('❌ Error creando tabla "respuestas":', err);
  } finally {
    await pool.end();
    process.exit();
  }
})();
