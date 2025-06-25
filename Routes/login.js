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

  if (!correo || !password) {
    return res.status(400).json({ error: 'Correo y contraseña requeridos' });
  }

  try {
    // Buscar usuario
    const result = await db.query(
      'SELECT * FROM usuarios WHERE correo = $1',
      [correo]
    );

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];

    // Verificar contraseña
    const passwordValida = await bcrypt.compare(password, user.password);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Crear token
    const token = jwt.sign(
      { id: user.id, correo: user.correo, rol: user.rol },
      SECRET_KEY,
      { expiresIn: '2h' }
    );

    res.json({ token });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});

export default router;
