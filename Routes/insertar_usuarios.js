import express from 'express';
import db from '../db.js';
import bcrypt from 'bcrypt';
import uploadCloud from '../cloudinary.js';  

const router = express.Router();

router.post('/', uploadCloud.single('foto'), async (req, res) => {
  try {
    const { nombre, apellido, carnet, rol, correo, password } = req.body;

    if (!nombre || !correo || !password) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    // Correo duplicado
    const dup = await db.query('SELECT 1 FROM usuarios WHERE correo = $1', [correo]);
    if (dup.rowCount) {
      return res.status(409).json({ error: 'Correo ya registrado' });
    }

    const hashed = await bcrypt.hash(password, 10);

    // URL pública que devuelve Cloudinary
    const photo_url   = req.file ? req.file.path     : null;
    const photo_id    = req.file ? req.file.filename : null; // public_id opcional

    const { rows } = await db.query(
      `INSERT INTO usuarios
         (nombre, apellido, carnet, rol, correo, password, photo_url, photo_public_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, nombre, apellido, carnet, rol, correo, photo_url`,
      [nombre, apellido, carnet, rol, correo, hashed, photo_url, photo_id]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error al registrar usuario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
