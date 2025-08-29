// Routes/archivos.js
import express from 'express';
import db from '../db.js';

// === Cloudinary & upload ===
import multer from 'multer';
import streamifier from 'streamifier';
import { v2 as cloudinary } from 'cloudinary';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Helpers
const sanitizeId = (name = 'archivo') =>
  name
    .replace(/\.[^/.]+$/, '')    // quita extensión
    .replace(/\s+/g, '_')        // espacios -> _
    .replace(/[^a-zA-Z0-9_\-]/g, ''); // solo seguro

const uploadToCloudinary = (buf, filename = 'archivo') =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',                // << IMPORTANTE para docs
        folder: 'appaprendizaje/archivos',  // cambia si quieres
        public_id: sanitizeId(filename),
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    streamifier.createReadStream(buf).pipe(stream);
  });

// Fallback para reparar URLs antiguas (sin public_id)
const repairUrlHeuristics = (raw = '') => {
  if (!raw) return raw;
  let u = raw;
  try { u = decodeURIComponent(u); } catch {}
  u = u.replace(/%2520/gi, '%20').replace(/%252F/gi, '%2F');
  if (u.includes('/image/upload/')) {
    u = u.replace('/image/upload/', '/raw/upload/');
  }
  return encodeURI(u);
};

/* -----------------------------------------------------------
   GET /api/archivos  – Listar todos los archivos
------------------------------------------------------------*/
router.get('/', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT a.id, a.titulo, a.descripcion, a.tipo, a.url, a.modulo_id,
             a.public_id, a.resource_type,
             m.nombre AS modulo_nombre
      FROM archivos a
      LEFT JOIN modulos m ON a.modulo_id = m.id
      ORDER BY a.id DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo archivos:', err);
    res.status(500).json({ error: 'Error obteniendo archivos' });
  }
});

/* -----------------------------------------------------------
   GET /api/archivos/:id  – Obtener un archivo por ID
------------------------------------------------------------*/
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM archivos WHERE id = $1',
      [req.params.id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error obteniendo archivo:', err);
    res.status(500).json({ error: 'Error obteniendo archivo' });
  }
});

/* -----------------------------------------------------------
   POST /api/archivos  – Crear nuevo archivo
   - Soporta:
     a) subida real (multipart/form-data con campo "archivo")
     b) registrar un archivo ya subido si envías solo { url, ... }
------------------------------------------------------------*/
router.post('/', upload.single('archivo'), async (req, res) => {
  try {
    const { titulo, descripcion, tipo, url, modulo_id } = req.body;
    let finalUrl = url || null;
    let public_id = null;
    let resource_type = null;

    if (req.file) {
      // Subimos a Cloudinary como RAW
      const cld = await uploadToCloudinary(req.file.buffer, req.file.originalname);
      finalUrl = cld.secure_url;
      public_id = cld.public_id;
      resource_type = cld.resource_type; // debería ser "raw"
    } else if (!finalUrl) {
      return res.status(400).json({ error: 'Falta archivo o url' });
    }

    const saved = await db.query(
      `INSERT INTO archivos (titulo, descripcion, tipo, url, modulo_id, public_id, resource_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        titulo || (req.file?.originalname) || 'archivo',
        descripcion || null,
        tipo || (req.file?.mimetype) || '',
        finalUrl,
        modulo_id || null,
        public_id,
        resource_type,
      ]
    );

    res.status(201).json(saved.rows[0]);
  } catch (err) {
    console.error('Error creando archivo:', err);
    res.status(500).json({ error: 'Error creando archivo' });
  }
});

/* -----------------------------------------------------------
   PUT /api/archivos/:id  – Actualizar metadatos
------------------------------------------------------------*/
router.put('/:id', async (req, res) => {
  try {
    const { titulo, descripcion, tipo, url, modulo_id } = req.body;

    const result = await db.query(
      `UPDATE archivos
         SET titulo      = $1,
             descripcion = $2,
             tipo        = $3,
             url         = $4,
             modulo_id   = $5
       WHERE id = $6
       RETURNING *`,
      [titulo, descripcion, tipo, url, modulo_id, req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error actualizando archivo:', err);
    res.status(500).json({ error: 'Error actualizando archivo' });
  }
});

/* -----------------------------------------------------------
   DELETE /api/archivos/:id  – Eliminar archivo
   (opcional: podrías también borrar en Cloudinary con el public_id)
------------------------------------------------------------*/
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM archivos WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!result.rowCount) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    res.json({ mensaje: 'Archivo eliminado correctamente' });
  } catch (err) {
    console.error('Error eliminando archivo:', err);
    res.status(500).json({ error: 'Error eliminando archivo' });
  }
});

/* -----------------------------------------------------------
   GET /api/archivos/:id/download-url
   Devuelve SIEMPRE una URL válida para descargar/ver,
   generada con Cloudinary a partir del public_id.
------------------------------------------------------------*/
router.get('/:id/download-url', async (req, res) => {
  try {
    const r = await db.query(
      'SELECT url, public_id, resource_type FROM archivos WHERE id=$1',
      [req.params.id]
    );
    if (!r.rowCount) return res.status(404).json({ error: 'Archivo no encontrado' });

    const row = r.rows[0];
    let finalUrl;

    if (row.public_id) {
      finalUrl = cloudinary.url(row.public_id, {
        resource_type: row.resource_type || 'raw',
        type: 'upload',
        secure: true,
        // flags: 'attachment' // descomenta si quieres forzar descarga
      });
    } else {
      finalUrl = repairUrlHeuristics(row.url);
    }

    res.json({ ok: true, url: finalUrl });
  } catch (err) {
    console.error('download-url error:', err);
    res.status(500).json({ error: 'Error generando URL de descarga' });
  }
});

/* -----------------------------------------------------------
   (Opcional) redirección directa a la URL
   GET /api/archivos/:id/download  -> 302 hacia Cloudinary
------------------------------------------------------------*/
router.get('/:id/download', async (req, res) => {
  try {
    const r = await db.query(
      'SELECT url, public_id, resource_type FROM archivos WHERE id=$1',
      [req.params.id]
    );
    if (!r.rowCount) return res.status(404).send('No encontrado');

    let url;
    const row = r.rows[0];
    if (row.public_id) {
      url = cloudinary.url(row.public_id, {
        resource_type: row.resource_type || 'raw',
        type: 'upload',
        secure: true,
      });
    } else {
      url = repairUrlHeuristics(row.url);
    }
    res.redirect(302, url);
  } catch (e) {
    console.error(e);
    res.status(500).send('Error');
  }
});

export default router;
