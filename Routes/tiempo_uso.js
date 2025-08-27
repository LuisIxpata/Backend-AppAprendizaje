import express from 'express';
import pool from '../db.js';

const router = express.Router();

// util: toma usuario_id desde token/params/query/body
function getUserId(req) {
  const fromToken = req.user?.id ? Number(req.user.id) : null; // si tienes auth
  const fromParams = Number(req.params?.usuario_id);
  const fromQuery  = Number(req.query?.usuario_id);
  const fromBody   = Number(req.body?.usuario_id);
  return fromToken || fromParams || fromQuery || fromBody || null;
}

/* =======================
 * POST /tiempo-uso  (sumar)
 * Body: { usuario_id, tiempo_en_segundos | tiempo_segundos }
 * ======================= */
router.post('/tiempo-uso', async (req, res) => {
  try {
    const usuario_id = getUserId(req);
    const raw = req.body?.tiempo_en_segundos ?? req.body?.tiempo_segundos;
    const tiempo = Number.parseInt(raw, 10);

    if (!usuario_id) return res.status(400).json({ error: 'Falta usuario_id' });
    if (!Number.isFinite(tiempo) || tiempo <= 0) {
      return res.status(400).json({ error: 'tiempo_en_segundos debe ser entero > 0' });
    }

    // 1) intenta actualizar (suma)
    const upd = await pool.query(
      `UPDATE tiempo_uso
         SET tiempo_total_segundos = COALESCE(tiempo_total_segundos, 0) + $1,
             ultima_fecha = CURRENT_TIMESTAMP
       WHERE usuario_id = $2
       RETURNING tiempo_total_segundos`,
      [tiempo, usuario_id]
    );

    let total;
    if (upd.rowCount > 0) {
      total = Number(upd.rows[0].tiempo_total_segundos || 0);
    } else {
      // 2) si no existía fila, inserta
      const ins = await pool.query(
        `INSERT INTO tiempo_uso (usuario_id, tiempo_total_segundos, ultima_fecha)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         RETURNING tiempo_total_segundos`,
        [usuario_id, tiempo]
      );
      total = Number(ins.rows[0].tiempo_total_segundos || 0);
    }

    return res.json({
      ok: true,
      mensaje: '⏱️ Tiempo registrado correctamente',
      agregado: tiempo,
      tiempo_total_segundos: total,
    });
  } catch (err) {
    console.error('❌ POST /tiempo-uso error:', err);
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

    const q = await pool.query(
      `SELECT COALESCE(tiempo_total_segundos, 0) AS tiempo_total_segundos
         FROM tiempo_uso
        WHERE usuario_id = $1`,
      [usuario_id]
    );
    const total = Number(q.rows?.[0]?.tiempo_total_segundos || 0);
    return res.json({ ok: true, tiempo_total_segundos: total });
  } catch (err) {
    console.error('❌ GET /tiempo-uso/:usuario_id error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
