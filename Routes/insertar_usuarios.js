// routes/usuarios.register.js  (ESM)
import express from 'express';
import db from '../db.js';
import bcrypt from 'bcrypt';
import uploadCloud from '../cloudinary.js'; // tu multer-storage-cloudinary
import jwt from 'jsonwebtoken';

const router = express.Router();

router.post('/', uploadCloud.single('foto'), async (req, res) => {
  try {
    const {
      nombre,
      apellido,
      carnet,           // opcional si tu tabla lo permite NULL
      correo,
      telefono,         // opcional
      carrera,          // opcional
      password,
      // del front:
      rolSolicitado,    // 'docente' | 'estudiante'
      codigoDocente     // string
    } = req.body;

    if (!nombre || !correo || !password) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    // ---- rol seguro en servidor ----
    const solicitado = String(rolSolicitado || '').toLowerCase();
    const codigo = String(codigoDocente || '');
    let rol = 'estudiante';
    if (solicitado === 'docente') {
      if (codigo !== process.env.DOCENTE_CODE) {
        return res.status(400).json({ error: 'Código de docente inválido' });
      }
      rol = 'docente';
    }

    // ---- correo único ----
    const dup = await db.query('SELECT 1 FROM usuarios WHERE correo = $1', [correo]);
    if (dup.rowCount) {
      return res.status(409).json({ error: 'Correo ya registrado' });
    }

    // ---- hash de password ----
    const hashed = await bcrypt.hash(password, 10);

    // ---- foto (Cloudinary/multer) ----
    const file = req.file || {};
    const photo_url = file.secure_url || file.path || null;
    const photo_id  = file.public_id  || file.filename || null;

    // ---- INSERT acorde a tus columnas ----
    const { rows } = await db.query(
      `INSERT INTO usuarios
        (nombre, apellido, carnet, rol, correo, telefono, carrera, password, photo_url, photo_public_id)
       VALUES
        ($1,     $2,       $3,     $4,  $5,     $6,       $7,      $8,       $9,        $10)
       RETURNING id, nombre, apellido, carnet, rol, correo, telefono, carrera, photo_url`,
      [nombre, apellido || null, carnet || null, rol, correo, telefono || null, carrera || null, hashed, photo_url, photo_id]
    );

    const user = rows[0];

    // ---- token con rol ----
    const token = jwt.sign(
      { id: user.id, email: user.correo, rol: user.rol },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({ user, token });
  } catch (err) {
    console.error('Error al registrar usuario:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

export default router;
