// rutas/tiempoUso.js
import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.post('/tiempo-uso', async (req, res) => {
  const { usuario_id, tiempo_en_segundos } = req.body;

  try {
    const existente = await pool.query(
      'SELECT * FROM tiempo_uso WHERE usuario_id = $1',
      [usuario_id]
    );

    if (existente.rowCount > 0) {
      await pool.query(
        `UPDATE tiempo_uso
         SET tiempo_total_segundos = tiempo_total_segundos + $1,
             ultima_fecha = CURRENT_TIMESTAMP
         WHERE usuario_id = $2`,
        [tiempo_en_segundos, usuario_id]
      );
    } else {
      await pool.query(
        `INSERT INTO tiempo_uso (usuario_id, tiempo_total_segundos)
         VALUES ($1, $2)`,
        [usuario_id, tiempo_en_segundos]
      );
    }

    res.json({ mensaje: '⏱️ Tiempo registrado correctamente' });
  } catch (err) {
    console.error('❌ Error al registrar tiempo de uso:', err);
    res.status(500).json({ error: 'Error interno al guardar tiempo de uso' });
  }

  // Obtener tiempo total de uso por usuario
router.get('/tiempo-uso/:usuario_id', async (req, res) => {
  const { usuario_id } = req.params;

  try {
    const result = await pool.query(
      'SELECT tiempo_total_segundos FROM tiempo_uso WHERE usuario_id = $1',
      [usuario_id]
    );

    if (result.rowCount === 0) {
      // No hay registro aún, devolvemos tiempo 0
      return res.json({ tiempo_total_segundos: 0 });
    }

    res.json(result.rows[0]); // { tiempo_total_segundos: ... }
  } catch (err) {
    console.error('❌ Error al obtener tiempo de uso:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

});

export default router;
