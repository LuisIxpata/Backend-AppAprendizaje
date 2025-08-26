import express from 'express';
import pool from '../db.js';

const router = express.Router();

/* Utilidad: toma el usuario_id desde params o query o body (si no usas JWT) */
function getUserId(req) {
  const fromParams = Number(req.params?.usuario_id);
  const fromQuery = Number(req.query?.usuario_id);
  const fromBody  = Number(req.body?.usuario_id);
  // Si tu middleware de auth pone req.user.id, prefierelo:
  const fromToken = req.user?.id ? Number(req.user.id) : null;
  return fromToken || fromParams || fromQuery || fromBody || null;
}

/* ================================
 * POST /tiempo-uso  (acumular)
 * Body: { usuario_id, tiempo_en_segundos | tiempo_segundos }
 * ================================ */
router.post('/tiempo-uso', async (req, res) => {
  try {
    const usuario_id = getUserId(req);
    // acepta ambos nombres
    const raw = req.body?.tiempo_en_segundos ?? req.body?.tiempo_segundos;
    const tiempo = Number.parseInt(raw, 10);

    if (!usuario_id) {
      return res.status(400).json({ error: 'Falta usuario_id' });
    }
    if (!Number.isFinite(tiempo) || tiempo <= 0) {
      return res.status(400).json({ error: 'tiempo_en_segundos debe ser un entero > 0' });
    }

    // UPSERT: suma y actualiza ultima_fecha
    const upsert = `
      INSERT INTO tiempo_uso (usuario_id, tiempo_total_segundos, ultima_fecha)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (usuario_id) DO UPDATE
        SET tiempo_total_segundos = tiempo_uso.tiempo_total_segundos + EXCLUDED.tiempo_total_segundos,
            ultima_fecha = CURRENT_TIMESTAMP
      RETURNING tiempo_total_segundos;
    `;

    const { rows } = await pool.query(upsert, [usuario_id, tiempo]);
    const total = Number(rows?.[0]?.tiempo_total_segundos ?? 0);

    return res.json({
      ok: true,
      mensaje: '⏱️ Tiempo registrado correctamente',
      agregado: tiempo,
      tiempo_total_segundos: total,
    });
  } catch (err) {
    console.error('❌ Error al registrar tiempo de uso:', err);
    return res.status(500).json({ error: 'Error interno al guardar tiempo de uso' });
  }
});

/* =========================================
 * GET /tiempo-uso/:usuario_id  (leer total)
 * ========================================= */
router.get('/tiempo-uso/:usuario_id', async (req, res) => {
  try {
    const usuario_id = getUserId(req);
    if (!usuario_id) return res.status(400).json({ error: 'Falta usuario_id' });

    const q = `
      SELECT COALESCE(tiempo_total_segundos, 0) AS tiempo_total_segundos
      FROM tiempo_uso
      WHERE usuario_id = $1
    `;
    const { rows } = await pool.query(q, [usuario_id]);

    const total = Number(rows?.[0]?.tiempo_total_segundos ?? 0);
    return res.json({ ok: true, tiempo_total_segundos: total });
  } catch (err) {
    console.error('❌ Error al obtener tiempo de uso:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
