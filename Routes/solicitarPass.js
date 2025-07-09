// Routes/solicitarPass.js   <-- BACKEND
import express from 'express';
import { Pool } from 'pg';
import nodemailer from 'nodemailer';
import 'dotenv/config';

const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { require: true, rejectUnauthorized: false }
});

router.post('/', async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ error: 'Email requerido' });

  try {
    // 1) ¿Existe el usuario?
    const user = await pool.query(
      'SELECT id FROM usuarios WHERE correo = $1 LIMIT 1',
      [email]
    );
    if (!user.rowCount) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // 2) Generar código numérico de 6 dígitos
    const token = Math.floor(100000 + Math.random() * 900000).toString();

    // 3) Guardar / sustituir token
    await pool.query(
      `INSERT INTO reset_tokens (email, token, expires_at)
       VALUES ($1,$2, NOW() + INTERVAL '10 minutes')
       ON CONFLICT (email) DO UPDATE
         SET token=$2, expires_at=NOW() + INTERVAL '10 minutes'`,
      [email, token]
    );

    // 4) Enviar correo
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Credenciales de correo no configuradas');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"AppAprendizaje" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Tu código para restablecer contraseña',
      html: `<p>Hola.<br>Tu código es <b>${token}</b>.<br>
             Expira en 10 minutos.</p>`
    });

    return res.json({ ok: true, message: 'Código enviado a tu correo.' });
  } catch (err) {
    console.error('Error solicitando reset:', err.message);
    return res.status(500).json({ error: 'Ocurrió un problema, inténtalo de nuevo.' });
  }
});

export default router;
