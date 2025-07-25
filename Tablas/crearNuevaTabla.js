import dotenv from 'dotenv';
import pool from '../db.js';

dotenv.config();

(async () => {
  try {
    // 1. Eliminar la tabla si existe
    await pool.query(`DROP TABLE IF EXISTS respuestas CASCADE`);
    console.log('🗑️ Tabla "respuestas" eliminada.');

    // 2. Crear nuevamente la tabla con restricción UNIQUE
    await pool.query(`
      CREATE TABLE respuestas (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        pregunta_id INTEGER REFERENCES preguntas(id) ON DELETE CASCADE,
        respuesta TEXT NOT NULL,
        correcta BOOLEAN NOT NULL,
        fecha_respuesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT respuestas_unicas UNIQUE (usuario_id, pregunta_id)
      );
    `);
    console.log('✅ Tabla "respuestas" creada correctamente con restricción UNIQUE.');
  } catch (err) {
    console.error('❌ Error recreando la tabla "respuestas":', err.message);
  } finally {
    await pool.end();
    process.exit();
  }
})();
