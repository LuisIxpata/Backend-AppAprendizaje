import express from 'express';
import db from '../db.js';
import verify from '../Autenticacion/verifyToken.js';

const router = express.Router();


router.get('/sync', async (req, res) => {
  const { usuario, modulo } = req.query;

  if (!usuario || !modulo) {
    return res.status(400).json({ error: 'Faltan parámetros usuario o modulo' });
  }

  try {
    // 1. Calcular respuestas correctas
    const result = await db.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE correcta) AS correctas,
        COUNT(*) AS total
      FROM respuestas
      WHERE usuario_id = $1 AND pregunta_id IN (
        SELECT id FROM preguntas WHERE modulo_id = $2
      )
      `,
      [usuario, modulo]
    );

    const correctas = parseInt(result.rows[0].correctas || 0);
    const total = parseInt(result.rows[0].total || 0);
    const porcentaje = total > 0 ? (correctas / total) * 100 : 0;

    // 2. Guardar en la tabla progreso
    const { rows } = await db.query(
      `INSERT INTO progreso (usuario_id, modulo_id, porcentaje)
       VALUES ($1, $2, $3)
       ON CONFLICT (usuario_id, modulo_id)
       DO UPDATE SET porcentaje = EXCLUDED.porcentaje,
                     ultima_actualizacion = CURRENT_TIMESTAMP
       RETURNING *`,
      [usuario, modulo, Math.round(porcentaje * 100) / 100]
    );

    res.status(200).json({
      mensaje: '✅ Progreso sincronizado correctamente',
      progreso: rows[0],
      detalle: {
        correctas,
        total,
        porcentaje: Math.round(porcentaje * 100) / 100
      }
    });

  } catch (err) {
    console.error('🔥 Error sincronizando progreso:', err);
    res.status(500).json({ error: 'Error sincronizando progreso' });
  }
});

export default router;