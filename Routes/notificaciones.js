// Routes/notificaciones.js
import express from 'express';
import db from '../db.js';

const router = express.Router();

/*---------------------------------------------------------
  POST /api/notificaciones  → crear notificación
---------------------------------------------------------*/
router.post('/', async (req, res) => {
  const { usuario_id, mensaje } = req.body;

  if (!usuario_id || !mensaje) {
    return res
      .status(400)
      .json({ error: 'usuario_id y mensaje son requeridos' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO notificaciones (usuario_id, mensaje)
       VALUES ($1, $2)
       RETURNING *`,
      [usuario_id, mensaje]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creando notificación:', err);
    res.status(500).json({ error: 'Error creando notificación' });
  }
});

/*---------------------------------------------------------
  GET /api/notificaciones
  GET /api/notificaciones?usuario=ID
---------------------------------------------------------*/
router.get('/', async (req, res) => {
  const { usuario } = req.query;

  const sql = usuario
    ? 'SELECT * FROM notificaciones WHERE usuario_id = $1 ORDER BY fecha DESC'
    : 'SELECT * FROM notificaciones ORDER BY fecha DESC';

  const params = usuario ? [usuario] : [];

  try {
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error obteniendo notificaciones:', err);
    res.status(500).json({ error: 'Error obteniendo notificaciones' });
  }
});

/*---------------------------------------------------------
  PATCH /api/notificaciones/:id  → marcar como leída
---------------------------------------------------------*/
router.patch('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE notificaciones
         SET leido = TRUE
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error actualizando notificación:', err);
    res.status(500).json({ error: 'Error actualizando notificación' });
  }
});

/*---------------------------------------------------------
  DELETE /api/notificaciones/:id  → eliminar notificación
---------------------------------------------------------*/
router.delete('/:id', async (req, res) => {
  try {
    const del = await db.query(
      'DELETE FROM notificaciones WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (!del.rowCount) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }
    res.json({ mensaje: `Notificación ${req.params.id} eliminada` });
  } catch (err) {
    console.error('Error eliminando notificación:', err);
    res.status(500).json({ error: 'Error eliminando notificación' });
  }
});

export default router;
