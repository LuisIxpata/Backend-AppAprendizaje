import express from 'express';
import db from '../db.js';

const router = express.Router();

/*---------------------------------------------------------
  POST /preguntas → crear pregunta
---------------------------------------------------------*/
router.post('/', async (req, res) => {
  const { modulo_id, enunciado, tipo, opciones, respuesta_correcta } = req.body;

  if (!modulo_id || !enunciado || !tipo || !respuesta_correcta) {
    return res.status(400).json({ error: 'Campos obligatorios faltantes' });
  }

  try {
    const { rows } = await db.query(
      `INSERT INTO preguntas (modulo_id, enunciado, tipo, opciones, respuesta_correcta)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [modulo_id, enunciado, tipo, opciones || null, respuesta_correcta]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('Error creando pregunta:', err);
    res.status(500).json({ error: 'Error creando pregunta' });
  }
});

/*---------------------------------------------------------
  GET /preguntas → listar todas o por módulo
---------------------------------------------------------*/
router.get('/', async (req, res) => {
  const { modulo } = req.query;

  const query = modulo
    ? { text: 'SELECT * FROM preguntas WHERE modulo_id = $1 ORDER BY id', values: [modulo] }
    : { text: 'SELECT * FROM preguntas ORDER BY id' };

  try {
    const { rows } = await db.query(query.text, query.values || []);
    res.json(rows);
  } catch (err) {
    console.error('Error obteniendo preguntas:', err);
    res.status(500).json({ error: 'Error obteniendo preguntas' });
  }
});

/*---------------------------------------------------------
  GET /preguntas/:id → obtener una pregunta específica
---------------------------------------------------------*/
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { rows } = await db.query('SELECT * FROM preguntas WHERE id = $1', [id]);
    if (!rows.length) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error('Error obteniendo pregunta:', err);
    res.status(500).json({ error: 'Error obteniendo pregunta' });
  }
});

/*---------------------------------------------------------
  PUT /preguntas/:id → actualizar pregunta
---------------------------------------------------------*/
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { modulo_id, enunciado, tipo, opciones, respuesta_correcta } = req.body;

  try {
    const { rows } = await db.query(
      `UPDATE preguntas
         SET modulo_id          = COALESCE($1, modulo_id),
             enunciado          = COALESCE($2, enunciado),
             tipo               = COALESCE($3, tipo),
             opciones           = COALESCE($4, opciones),
             respuesta_correcta = COALESCE($5, respuesta_correcta)
       WHERE id = $6
       RETURNING *`,
      [modulo_id, enunciado, tipo, opciones, respuesta_correcta, id]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('Error actualizando pregunta:', err);
    res.status(500).json({ error: 'Error actualizando pregunta' });
  }
});

/*---------------------------------------------------------
  DELETE /preguntas/:id → eliminar pregunta
---------------------------------------------------------*/
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const del = await db.query('DELETE FROM preguntas WHERE id = $1 RETURNING id', [id]);
    if (!del.rowCount) {
      return res.status(404).json({ error: 'Pregunta no encontrada' });
    }

    res.json({ mensaje: `Pregunta ${id} eliminada` });
  } catch (err) {
    console.error('Error eliminando pregunta:', err);
    res.status(500).json({ error: 'Error eliminando pregunta' });
  }
});

export default router;

