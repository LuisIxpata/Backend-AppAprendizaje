// Routes/obtener_usuarios.js
import express from 'express';
import db from '../db.js';

const router = express.Router();

/*---------------------------------------------------------
  GET /obtener_usuarios/:id  →  Obtener un usuario por ID
---------------------------------------------------------*/
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await db.query(
      `SELECT
         id,
         nombre,
         apellido,
         carnet,
         rol,
         correo,         
         telefono,       
         carrera,        
         photo_url       
       FROM usuarios
       WHERE id = $1`,
      [id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(rows[0]);              // devolvemos el objeto completo
  } catch (err) {
    console.error('Error consultando usuario:', err);
    res.status(500).json({ error: 'Error consultando usuario' });
  }
});

/*---------------------------------------------------------
  GET /obtener_usuarios  →  Listar todos los usuarios
---------------------------------------------------------*/
router.get('/', async (_req, res) => {
  try {
    const result = await db.query(`
      SELECT
        id, nombre, apellido, carnet, rol,
        correo, telefono, carrera, photo_url
      FROM usuarios
      ORDER BY id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener los usuarios:', err);
    res.status(500).json({ error: 'Error al obtener los usuarios' });
  }
});

export default router;
