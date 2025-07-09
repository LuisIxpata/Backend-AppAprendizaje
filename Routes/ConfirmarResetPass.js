// Routes/ConfirmarResetPass.js  (ES Module)
import express from 'express';
import bcrypt  from 'bcryptjs';
import pool    from '../db.js';

const router = express.Router();

router.post('/', async (req, res) => {
  // ────────────────────────── 1) Desestructurar body ──────────────────────────
  //  Aceptamos tanto "codigo" como "token" para evitar confusiones
  const { email, codigo, token, nuevaPassword } = req.body;
  const codigoRecibido = codigo || token;               // usa el que exista

  console.log('🔥  Payload recibido ->', { email, codigoRecibido, nuevaPassword });

  try {
    // ─────────────────── 2) Consultar si el token sigue vigente ──────────────────
    const queryText = `
      SELECT id, email, token, expires_at
      FROM reset_tokens
      WHERE email = $1 AND token = $2 AND expires_at > (CURRENT_TIMESTAMP AT TIME ZONE 'UTC')
    `;

    const { rows } = await pool.query(queryText, [email, codigoRecibido]);
    console.log('📄  Resultado SELECT ->', rows);

    if (!rows.length) {
      return res
        .status(400)
        .json({ error: 'Código inválido o expirado.', detalles: { email, codigoRecibido } });
    }

    // ────────────────────────── 3) Actualizar contraseña ─────────────────────────
    const hash = await bcrypt.hash(nuevaPassword, 10);

    const updRes = await pool.query(
      'UPDATE usuarios SET password = $1 WHERE correo = $2 RETURNING id, correo',
      [hash, email]
    );
    console.log('🔐  UPDATE usuarios ->', updRes.rows);
    // ─────────────────────────────── 5) Respuesta OK ────────────────────────────
    res.json({
      message: 'Contraseña actualizada correctamente',
      usuario: updRes.rows[0] ?? null
    });
  } catch (err) {
    console.error('💥  Error en /confirmar:', err); 
    res.status(500).json({
      error: 'Error interno del servidor',
      detalle: err.message
    });
  }
  
});

export default router;
