// Routes/progreso.js
import express from 'express';
import db from '../db.js';
import verify from '../Autenticacion/verifyToken.js';

const router = express.Router();

/*---------------------------------------------------------
  POST /api/progreso
  Crea o actualiza (upsert) el registro de progreso
---------------------------------------------------------*/
router.post('/', async (req, res) => {
  console.log('📨 POST /progreso recibido:', req.body);
  const { usuario_id, modulo_id, porcentaje } = req.body;
  
  if (!usuario_id || !modulo_id || porcentaje == null) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO progreso (usuario_id, modulo_id, porcentaje)
       VALUES ($1, $2, $3)
       ON CONFLICT (usuario_id, modulo_id)
       DO UPDATE SET porcentaje = EXCLUDED.porcentaje,
                     ultima_actualizacion = CURRENT_TIMESTAMP
       RETURNING *`,
      [usuario_id, modulo_id, porcentaje]
    );
    console.log('Cuerpo recibido:', req.body);
    res.status(201).json(rows[0]);
    
  } catch (err) {
    console.error('Error guardando progreso:', err);
    res.status(500).json({ error: 'Error guardando progreso' });
  }
});

/*---------------------------------------------------------
  GET /api/progreso/detallado  →  Progreso con JOIN a usuarios y módulos
  (colocada ANTES de /:id para que no la capture)
---------------------------------------------------------*/
router.get('/', async (req, res) => {
  const { usuario, modulo } = req.query;
  let sql = 'SELECT * FROM progreso';
  const params = [];

  if (usuario) {
    params.push(usuario);
    sql += ` WHERE usuario_id = $${params.length}`;
  }
  if (modulo) {
    params.push(modulo);
    sql += params.length === 1 ? ' WHERE' : ' AND';
    sql += ` modulo_id = $${params.length}`;
  }

  sql += ' ORDER BY ultima_actualizacion DESC';

  try {
    console.log('🔍 Ejecutando SQL:', sql, params);
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('🔥 Error ejecutando SELECT en progreso:', err); // << más claro
    res.status(500).json({ error: 'Error obteniendo progreso' });
  }
});


/*---------------------------------------------------------
  GET /api/progreso
  ?usuario=ID             → progreso por usuario
  ?usuario=ID&modulo=ID   → progreso específico
---------------------------------------------------------*/
router.get('/', async (req, res) => {
  const { usuario, modulo } = req.query;
  let sql = 'SELECT * FROM progreso';
  const params = [];

  if (usuario) {
    params.push(usuario);
    sql += ` WHERE usuario_id = $${params.length}`;
  }
  if (modulo) {
    params.push(modulo);
    sql += params.length === 1 ? ' WHERE' : ' AND';
    sql += ` modulo_id = $${params.length}`;
  }
    sql += ' ORDER BY ultima_actualizacion DESC';

  try {
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error obteniendo progreso:', err);
    res.status(500).json({ error: 'Error obteniendo progreso' });
  }
});

/*---------------------------------------------------------
  DELETE /api/progreso/:id  → eliminar registro
---------------------------------------------------------*/
router.delete('/:id', async (req, res) => {
  try {
    const del = await db.query(
      'DELETE FROM progreso WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!del.rowCount) {
      return res.status(404).json({ error: 'Registro no encontrado' });
    }
    res.json({ mensaje: `Progreso ${req.params.id} eliminado` });
  } catch (err) {
    console.error('Error eliminando progreso:', err);
    res.status(500).json({ error: 'Error eliminando progreso' });
  }
});

//Calcular el progreso y guardarlo
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

