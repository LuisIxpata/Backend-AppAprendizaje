// Routes/archivos.js
import express from 'express';
import db from '../db.js';

const router = express.Router();

/* -----------------------------------------------------------
   GET /api/archivos  – Listar todos los archivos
------------------------------------------------------------*/
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.*, m.nombre AS modulo_nombre
      FROM archivos a
      LEFT JOIN modulos m ON a.modulo_id = m.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo archivos:', err);
    res.status(500).json({ error: 'Error obteniendo archivos' });
  }
});

/* -----------------------------------------------------------
   GET /api/archivos/:id  – Obtener un archivo por ID
------------------------------------------------------------*/
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM archivos WHERE id = $1',
      [req.params.id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error obteniendo archivo:', err);
    res.status(500).json({ error: 'Error obteniendo archivo' });
  }
});

/* -----------------------------------------------------------
   POST /api/archivos  – Crear nuevo archivo
------------------------------------------------------------*/
router.post('/', async (req, res) => {
  try {
    const { titulo, descripcion, tipo, url, modulo_id } = req.body;

    const result = await db.query(
      `INSERT INTO archivos (titulo, descripcion, tipo, url, modulo_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [titulo, descripcion, tipo, url, modulo_id]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creando archivo:', err);
    res.status(500).json({ error: 'Error creando archivo' });
  }
});

/* -----------------------------------------------------------
   PUT /api/archivos/:id  – Actualizar archivo
------------------------------------------------------------*/
router.put('/:id', async (req, res) => {
  try {
    const { titulo, descripcion, tipo, url, modulo_id } = req.body;

    const result = await db.query(
      `UPDATE archivos
         SET titulo      = $1,
             descripcion = $2,
             tipo        = $3,
             url         = $4,
             modulo_id   = $5
       WHERE id = $6
       RETURNING *`,
      [titulo, descripcion, tipo, url, modulo_id, req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error actualizando archivo:', err);
    res.status(500).json({ error: 'Error actualizando archivo' });
  }
});

/* -----------------------------------------------------------
   DELETE /api/archivos/:id  – Eliminar archivo
------------------------------------------------------------*/
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM archivos WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    res.json({ mensaje: 'Archivo eliminado correctamente' });
  } catch (err) {
    console.error('Error eliminando archivo:', err);
    res.status(500).json({ error: 'Error eliminando archivo' });
  }
});

export default router;
