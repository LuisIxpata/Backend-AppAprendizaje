// routes/docentes.js
/*import express from 'express';
import db from '../db.js';


const router = express.Router();

// Resumen para el dashboard
router.get('/overview', authorize('docente','admin'), async (req, res) => {
  try {
    const r1 = await db.query("SELECT COUNT(*)::int AS n FROM usuarios WHERE rol='estudiante'");
    const r2 = await db.query("SELECT COUNT(*)::int AS n FROM usuarios WHERE rol='docente'");
    // (opcionales) usa 0 si aún no tienes estas tablas:
    let modulos = 0, preguntas = 0;
    try { modulos = (await db.query("SELECT COUNT(*)::int AS n FROM modulos")).rows[0].n; } catch {}
    try { preguntas = (await db.query("SELECT COUNT(*)::int AS n FROM preguntas")).rows[0].n; } catch {}

    res.json({
      total_estudiantes: r1.rows[0].n,
      total_docentes: r2.rows[0].n,
      total_modulos: modulos,
      total_preguntas: preguntas
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo obtener overview' });
  }
});

// Lista de estudiantes (con búsqueda simple)
router.get('/estudiantes', auth, authorize('docente','admin'), async (req, res) => {
  const q = (req.query.q || '').trim();
  const limit = Math.min(parseInt(req.query.limit || '30', 10), 100);
  const offset = parseInt(req.query.offset || '0', 10);
  try {
    const like = `%${q}%`;
    const { rows } = await db.query(
      `SELECT id, nombre, apellido, carnet, correo, photo_url
       FROM usuarios
       WHERE rol='estudiante'
         AND ($1 = '' OR nombre ILIKE $2 OR apellido ILIKE $2 OR correo ILIKE $2 OR CAST(carnet AS TEXT) ILIKE $2)
       ORDER BY id DESC
       LIMIT $3 OFFSET $4`,
      [q, like, limit, offset]
    );
    const total = (await db.query(
      `SELECT COUNT(*)::int AS total
       FROM usuarios
       WHERE rol='estudiante'
         AND ($1 = '' OR nombre ILIKE $2 OR apellido ILIKE $2 OR correo ILIKE $2 OR CAST(carnet AS TEXT) ILIKE $2)`,
      [q, like]
    )).rows[0].total;
    res.json({ items: rows, total, limit, offset });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo listar estudiantes' });
  }
});

export default router;
*/