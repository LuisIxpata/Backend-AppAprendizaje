// Routes/mensajes.js
import express from 'express';
import db from '../db.js';

const router = express.Router();

/*---------------------------------------------------------
  POST /api/mensajes  →  enviar mensaje
---------------------------------------------------------*/
router.post('/', async (req, res) => {
  const { emisor_id, receptor_id, mensaje } = req.body;

  if (!emisor_id || !receptor_id || !mensaje) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO mensajes (emisor_id, receptor_id, mensaje)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [emisor_id, receptor_id, mensaje]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error enviando mensaje:', err);
    res.status(500).json({ error: 'Error enviando mensaje' });
  }
});

/*---------------------------------------------------------
  GET /api/mensajes
  GET /api/mensajes?usuario=ID
  GET /api/mensajes?emisor=ID&receptor=ID
---------------------------------------------------------*/
router.get('/', async (req, res) => {
  const { usuario, emisor, receptor } = req.query;
  let sql = 'SELECT * FROM mensajes';
  const params = [];

  if (usuario) {
    params.push(usuario, usuario);
    sql += ` WHERE emisor_id = $1 OR receptor_id = $2`;
  } else if (emisor && receptor) {
    params.push(emisor, receptor, emisor, receptor);
    sql += `
      WHERE (emisor_id = $1 AND receptor_id = $2)
         OR (emisor_id = $3 AND receptor_id = $4)
    `;
  }
  sql += ' ORDER BY fecha_envio ASC';

  try {
    const { rows } = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error obteniendo mensajes:', err);
    res.status(500).json({ error: 'Error obteniendo mensajes' });
  }
});

/*---------------------------------------------------------
  GET /api/mensajes/:id  →  obtener mensaje único
---------------------------------------------------------*/
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM mensajes WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error obteniendo mensaje:', err);
    res.status(500).json({ error: 'Error obteniendo mensaje' });
  }
});

/*---------------------------------------------------------
  PATCH /api/mensajes/:id  →  marcar como leído
---------------------------------------------------------*/
router.patch('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      `UPDATE mensajes
         SET leido = TRUE
       WHERE id = $1
       RETURNING *`,
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error actualizando mensaje:', err);
    res.status(500).json({ error: 'Error actualizando mensaje' });
  }
});

/*---------------------------------------------------------
  DELETE /api/mensajes/:id  →  eliminar mensaje
---------------------------------------------------------*/
router.delete('/:id', async (req, res) => {
  try {
    const del = await db.query(
      'DELETE FROM mensajes WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!del.rowCount) {
      return res.status(404).json({ error: 'Mensaje no encontrado' });
    }
    res.json({ mensaje: `Mensaje ${req.params.id} eliminado` });
  } catch (err) {
    console.error('Error eliminando mensaje:', err);
    res.status(500).json({ error: 'Error eliminando mensaje' });
  }
});

export default router;

