// Routes/respuestas.js
import express from 'express';
import db from '../db.js';
import verify from '../Autenticacion/verifyToken.js';

const router = express.Router();

/*---------------------------------------------------------
  POST /api/respuestas
  Guarda la respuesta de un usuario y marca si es correcta
---------------------------------------------------------*/
router.post('/', async (req, res) => {
  
  try {
    const { usuario_id, pregunta_id, respuesta } = req.body;
    console.log('🧾 Datos recibidos:', { usuario_id, pregunta_id, respuesta });

    if (!usuario_id || !pregunta_id || respuesta == null) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // Verificar existencia del usuario
    const userCheck = await db.query(
      'SELECT 1 FROM usuarios WHERE id = $1',
      [usuario_id]
    );
    if (!userCheck.rowCount) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Obtener respuesta correcta y modulo_id
    const preg = await db.query(
      'SELECT respuesta_correcta, modulo_id FROM preguntas WHERE id = $1',
      [pregunta_id]
    );
    if (!preg.rowCount) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }

    const { respuesta_correcta, modulo_id } = preg.rows[0];
    const correcta = respuesta_correcta === respuesta;

    // Guardar respuesta
    console.log('✅ Guardando en DB con:', usuario_id, pregunta_id, respuesta, correcta);
    const { rows } = await db.query(
  `INSERT INTO respuestas (usuario_id, pregunta_id, respuesta, correcta)
   VALUES ($1, $2, $3, $4)
   ON CONFLICT (usuario_id, pregunta_id)
   DO UPDATE SET respuesta = EXCLUDED.respuesta,
                 correcta = EXCLUDED.correcta
   RETURNING *`,
  [usuario_id, pregunta_id, respuesta, correcta]
);

    // ----------------------------------------------
    // 🔄 Calcular progreso automáticamente
    // ----------------------------------------------

    // Total de preguntas del módulo
    const totalPreg = await db.query(
      `SELECT COUNT(*) FROM preguntas WHERE modulo_id = $1`,
      [modulo_id]
    );
    const total = parseInt(totalPreg.rows[0].count);

    // Total de respuestas correctas de este usuario en ese módulo
    const correctas = await db.query(
      `SELECT COUNT(*) FROM respuestas r
       INNER JOIN preguntas p ON r.pregunta_id = p.id
       WHERE r.usuario_id = $1 AND p.modulo_id = $2 AND r.correcta = true`,
      [usuario_id, modulo_id]
    );
    const aciertos = parseInt(correctas.rows[0].count);

    const porcentaje = total > 0 ? Math.round((aciertos / total) * 100) : 0;

    // UPSERT a progreso
    await db.query(
      `INSERT INTO progreso (usuario_id, modulo_id, porcentaje)
       VALUES ($1, $2, $3)
       ON CONFLICT (usuario_id, modulo_id)
       DO UPDATE SET porcentaje = EXCLUDED.porcentaje,
                     ultima_actualizacion = CURRENT_TIMESTAMP`,
      [usuario_id, modulo_id, porcentaje]
    );

    // ----------------------------------------------

    res.status(201).json({ ...rows[0], porcentaje_actualizado: porcentaje });

  } catch (err) {
    console.error('Error guardando respuesta:', err);
    res.status(500).json({ error: 'Error guardando respuesta' });
  }
});


/*---------------------------------------------------------
  GET /api/respuestas/:id → obtener una respuesta
---------------------------------------------------------*/
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM respuestas WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Respuesta no encontrada' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error obteniendo respuesta:', err);
    res.status(500).json({ error: 'Error obteniendo respuesta' });
  }
});

/*---------------------------------------------------------
  GET /api/respuestas
  ?usuario=ID      → filtrar por usuario
  ?pregunta=ID     → filtrar por pregunta
---------------------------------------------------------*/
router.get('/', async (req, res) => {
  const { usuario, pregunta } = req.query;

  let sql = 'SELECT * FROM respuestas';
  const params = [];

  if (usuario) {
    params.push(usuario);
    sql += ` WHERE usuario_id = $${params.length}`;
  }
  if (pregunta) {
    params.push(pregunta);
    sql += params.length === 1 ? ' WHERE' : ' AND';
    sql += ` pregunta_id = $${params.length}`;
  }
  sql += ' ORDER BY id';

  try {
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error obteniendo respuestas:', err);
    res.status(500).json({ error: 'Error obteniendo respuestas' });
  }
});

/*---------------------------------------------------------
  DELETE /api/respuestas/:id → eliminar respuesta
---------------------------------------------------------*/
router.delete('/:id', async (req, res) => {
  try {
    const del = await db.query(
      'DELETE FROM respuestas WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!del.rowCount) {
      return res.status(404).json({ error: 'Respuesta no encontrada' });
    }
    res.json({ mensaje: `Respuesta ${req.params.id} eliminada` });
  } catch (err) {
    console.error('Error eliminando respuesta:', err);
    res.status(500).json({ error: 'Error eliminando respuesta' });
  }
});

export default router;
