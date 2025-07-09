import express from 'express';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import 'dotenv/config';

const router = express.Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

router.post('/', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requerido' });

  // 1) ¿existe usuario?
  const user = await pool.query('SELECT 1 FROM usuarios WHERE correo = $1', [email]);
  if (!user.rowCount) return res.status(404).json({ error: 'Usuario no encontrado' });

  // 2) Generar código de 6 dígitos
  const token = crypto.randomBytes(3).toString('hex').toUpperCase(); 
  const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  // 3) Guardar / reemplazar en BD
  await pool.query(
    `INSERT INTO reset_tokens (email, token, expires_at)
     VALUES ($1,$2,$3)
     ON CONFLICT (email) DO UPDATE
       SET token = $2, expires_at = $3`,
    [email, token, expires]
  );

  // 4) Enviar correo
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,   // 🔐 variable .env
      pass: process.env.EMAIL_PASS
    }
  });

  await transporter.sendMail({
    from: `"AppAprendizaje" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Tu código para restablecer contraseña',
    html: `<p>Hola. Tu código es <b>${token}</b>. Expira en 10 minutos.</p>`
  });

  res.json({ message: 'Código enviado a tu correo.' });
});

export default router;
