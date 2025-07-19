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
router.get('/detallado', async (_, res) => {
  try {
    const { rows } = await db.query(`
      SELECT 
        p.id,
        u.id   AS usuario_id,
        u.nombre AS usuario_nombre,
        u.correo AS usuario_correo,
        m.id   AS modulo_id,
        m.nombre AS modulo_nombre,
        p.porcentaje,
        p.ultima_actualizacion
      FROM progreso p
      JOIN usuarios u ON p.usuario_id = u.id
      JOIN modulos  m ON p.modulo_id = m.id
      ORDER BY p.ultima_actualizacion DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('Error obteniendo progreso detallado:', err);
    res.status(500).json({ error: 'Error obteniendo progreso detallado' });
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

export default router;

