// Routes/modulos.js
import express from 'express';
import db from '../db.js';
import verify from '../Autenticacion/verifyToken.js'; 

const router = express.Router();

/*---------------------------------------------------------
  POST /api/modulos  → crear módulo
---------------------------------------------------------*/
router.post('/', async (req, res) => {
  const { nombre, descripcion } = req.body;

  if (!nombre) {
    return res.status(400).json({ error: 'nombre es requerido' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO modulos (nombre, descripcion)
       VALUES ($1, $2)
       RETURNING *`,
      [nombre, descripcion]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creando módulo:', err);
    res.status(500).json({ error: 'Error creando módulo' });
  }
});

/*---------------------------------------------------------
  GET /api/modulos  → listar todos los módulos
---------------------------------------------------------*/
router.get('/', async (_, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM modulos ORDER BY id'
    );
    res.json(rows);
  } catch (err) {
    console.error('Error obteniendo módulos:', err);
    res.status(500).json({ error: 'Error obteniendo módulos' });
  }
});

/*---------------------------------------------------------
  GET /api/modulos/:id  → obtener un módulo
---------------------------------------------------------*/
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM modulos WHERE id = $1',
      [req.params.id]
    );
    if (!rows.length) {
      return res.status(404).json({ error: 'Módulo no encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error obteniendo módulo:', err);
    res.status(500).json({ error: 'Error obteniendo módulo' });
  }
});

/*---------------------------------------------------------
  PUT /api/modulos/:id  → actualizar módulo
---------------------------------------------------------*/
router.put('/:id', async (req, res) => {
  const { nombre, descripcion, ruta} = req.body;

  try {
    const { rows } = await db.query(
      `UPDATE modulos
         SET nombre      = COALESCE($1, nombre),
             descripcion = COALESCE($2, descripcion),
             ruta = COALESCE($3, ruta)
       WHERE id = $4
       RETURNING *`,
      [nombre, descripcion, ruta, req.params.id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Módulo no encontrado' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error actualizando módulo:', err);
    res.status(500).json({ error: 'Error actualizando módulo' });
  }
});

/*---------------------------------------------------------
  DELETE /api/modulos/:id  → eliminar módulo
  (protegido con JWT)
---------------------------------------------------------*/
router.delete('/:id', verify, async (req, res) => {
  try {
    const del = await db.query(
      'DELETE FROM modulos WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!del.rowCount) {
      return res.status(404).json({ error: 'Módulo no encontrado' });
    }
    res.json({ mensaje: `Módulo ${req.params.id} eliminado` });
  } catch (err) {
    console.error('Error eliminando módulo:', err);
    res.status(500).json({ error: 'Error eliminando módulo' });
  }
});

export default router;
