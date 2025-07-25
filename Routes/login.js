// Routes/login.js
import express from 'express';
import db from '../db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import 'dotenv/config';         

const router = express.Router();

const SECRET_KEY = process.env.JWT_SECRET || 'clave_super_secreta';

router.post('/', async (req, res) => {
  const { correo, password } = req.body;

  const result = await db.query('SELECT * FROM usuarios WHERE correo = $1', [correo]);
  const usuario = result.rows[0];

  if (!usuario) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const passwordValida = await bcrypt.compare(password, usuario.password);

  if (!passwordValida) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });

  
  res.json({ token, usuario });
});

export default router;
