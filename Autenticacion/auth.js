// Autenticacion/auth.js
import express from 'express';
import db from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import 'dotenv/config';          

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'secreto_super_seguro';

/*---------------------------------------------------------
  POST /api/auth/register
---------------------------------------------------------*/
router.post('/register', async (req, res) => {
  const { nombre, correo, password } = req.body;

  if (!nombre || !correo || !password) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  // ¿Correo ya existe?
  const existe = await db.query(
    'SELECT 1 FROM usuarios WHERE correo = $1',
    [correo]
  );
  if (existe.rowCount) {
    return res.status(409).json({ error: 'Correo ya registrado' });
  }

  // Hashear contraseña y crear usuario
  const hashed = await bcrypt.hash(password, 10);
  const { rows } = await db.query(
    `INSERT INTO usuarios (nombre, correo, password)
     VALUES ($1, $2, $3)
     RETURNING id, nombre, correo`,
    [nombre, correo, hashed]
  );

  // Generar token
  const token = jwt.sign(
    { id: rows[0].id, correo },
    SECRET,
    { expiresIn: '7d' }
  );

  res.status(201).json({ usuario: rows[0], token });
  console.log("Los datos del token son: ", token.data);
});

/*---------------------------------------------------------
  POST /api/auth/login
---------------------------------------------------------*/
router.post('/login', async (req, res) => {
  const { correo, password } = req.body;

  // Buscar usuario
  const { rows } = await db.query(
    'SELECT * FROM usuarios WHERE correo = $1',
    [correo]
  );
  const usuario = rows[0];

  if (!usuario) {
    return res.status(401).json({ error: 'Usuario no encontrado' });
  }

  // Verificar contraseña
  const valid = await bcrypt.compare(password, usuario.password);
  if (!valid) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  // Generar token
  const token = jwt.sign(
    { id: usuario.id, correo: usuario.correo },
    SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
    },
    token,
  });
});

export default router;

