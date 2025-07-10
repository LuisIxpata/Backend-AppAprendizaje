// Routes/actualizar_usuario.js
import express from 'express';
import db from '../db.js';
import verify from '../Autenticacion/verifyToken.js';
import uploadCloud from '../cloudinary.js';  // middleware con .single()
import { v2 as cloudinary } from 'cloudinary';

const router = express.Router();

/*---------------------------------------------------------
  PUT /api/usuarios/:id
  Campos permitidos: nombre, apellido, carnet, rol, foto
---------------------------------------------------------*/
router.put('/:id', verify, uploadCloud.single('foto'), async (req, res) => {
  const { id } = req.params;
  const { nombre, apellido, carnet, rol, telefono } = req.body;

  try {
    /* 1) Obtener datos actuales para conocer el public_id previo */
    const { rows: userRows } = await db.query(
      'SELECT photo_public_id FROM usuarios WHERE id = $1',
      [id]
    );
    if (!userRows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    const oldPublicId = userRows[0].photo_public_id;

    /* 2) Si se subió nueva imagen, preparamos nueva URL e ID  */
    let photo_url = undefined;
    let photo_public_id = undefined;

    if (req.file) {
      photo_url = req.file.path;          // URL Cloudinary
      photo_public_id = req.file.filename; // public_id Cloudinary

     
      if (oldPublicId) {
        try {
          await cloudinary.uploader.destroy(oldPublicId);
        } catch (e) {
          console.warn('⚠️  No se pudo borrar imagen anterior:', e.message);
        }
      }
    }

    /* 3) Actualizar registro */
    const { rows } = await db.query(
      `UPDATE usuarios
         SET nombre           = COALESCE($1, nombre),
             apellido         = COALESCE($2, apellido),
             carnet           = COALESCE($3, carnet),
             rol              = COALESCE($4, rol),
             telefono         = COALESCE($5, telefono),
             photo_url        = COALESCE($6, photo_url),
             photo_public_id  = COALESCE($7, photo_public_id)
       WHERE id = $8
       RETURNING id, nombre, apellido, carnet, rol, telefono, photo_url`,
      [nombre, apellido, carnet, rol, telefono, photo_url, photo_public_id, id]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error('Error actualizando usuario:', err);
    res.status(500).json({ error: 'Error actualizando usuario' });
  }
});

export default router;
