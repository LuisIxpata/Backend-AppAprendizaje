// Routes/archivos.js
import express from 'express';
import db from '../db.js';

// NUEVO: dependencias para recibir archivo y subirlo
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';

// Config Cloudinary (asegúrate de tener las vars en .env)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const router = express.Router();

// Multer en memoria (no disco). Ajusta tamaño si necesitas.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

// Helper: subir buffer a Cloudinary (auto-detecta tipo: pdf, docx, zip, etc.)
const uploadToCloudinary = (buf, filename = 'archivo') =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'appaprendizaje/archivos',
        resource_type: 'auto',   // clave para docs y binarios
        public_id: filename?.replace(/\.[^/.]+$/, ''), // opcional: sin extensión
      },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    streamifier.createReadStream(buf).pipe(stream);
  });

// Deducción simple del "tipo" por mimetype o nombre
const inferTipo = (mimetype = '', name = '') => {
  const ext = (name.split('.').pop() || '').toLowerCase();
  const map = {
    pdf: 'PDF', doc: 'WORD', docx: 'WORD',
    xls: 'EXCEL', xlsx: 'EXCEL',
    ppt: 'PPT', pptx: 'PPT',
    txt: 'TXT', csv: 'CSV',
    zip: 'ZIP', rar: 'RAR',
    java: 'JAVA', js: 'JS', ts: 'TS',
    py: 'PY', c: 'C', cpp: 'CPP', cs: 'CSHARP',
    html: 'HTML', css: 'CSS', md: 'MD'
  };
  if (map[ext]) return map[ext];
  if (/pdf/i.test(mimetype)) return 'PDF';
  if (/word/i.test(mimetype)) return 'WORD';
  if (/excel|spreadsheet/i.test(mimetype)) return 'EXCEL';
  if (/powerpoint/i.test(mimetype)) return 'PPT';
  if (/text\/plain/i.test(mimetype)) return 'TXT';
  return (ext || mimetype || 'FILE').toUpperCase();
};

/* -----------------------------------------------------------
   GET /archivos – Listar todos
------------------------------------------------------------*/
router.get('/', async (_req, res) => {
  try {
    const result = await db.query(`
      SELECT a.*, m.nombre AS modulo_nombre
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
   GET /archivos/:id – Obtener por ID
------------------------------------------------------------*/
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM archivos WHERE id = $1', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Archivo no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error obteniendo archivo:', err);
    res.status(500).json({ error: 'Error obteniendo archivo' });
  }
});

/* -----------------------------------------------------------
   POST /archivos – Crear
   ACEPTA:
   - multipart/form-data con campo de archivo: "archivo"
   - O JSON con "url" (se mantiene compatibilidad)
------------------------------------------------------------*/
router.post('/', upload.single('archivo'), async (req, res) => {
  try {
    const { titulo, descripcion, tipo, url, modulo_id } = req.body;

    let finalUrl  = url || null;
    let finalTipo = tipo || null;

    // Si viene archivo, lo subimos a Cloudinary
    if (req.file && req.file.buffer) {
      const uploaded = await uploadToCloudinary(req.file.buffer, req.file.originalname);
      finalUrl  = uploaded.secure_url;
      finalTipo = finalTipo || inferTipo(req.file.mimetype, req.file.originalname);
    }

    if (!finalUrl) {
      return res.status(400).json({ error: 'Falta archivo o url' });
    }

    const result = await db.query(
      `INSERT INTO archivos (titulo, descripcion, tipo, url, modulo_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [
        titulo || 'Documento',
        descripcion || null,
        finalTipo,
        finalUrl,
        modulo_id ? Number(modulo_id) : null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creando archivo:', err);
    res.status(500).json({ error: 'Error creando archivo', details: err.message });
  }
});

/* -----------------------------------------------------------
   PUT /archivos/:id – Actualizar metadata (no re-subida)
------------------------------------------------------------*/
router.put('/:id', async (req, res) => {
  try {
    const { titulo, descripcion, tipo, url, modulo_id } = req.body;

    const result = await db.query(
      `UPDATE archivos
         SET titulo=$1, descripcion=$2, tipo=$3, url=$4, modulo_id=$5
       WHERE id=$6
       RETURNING *`,
      [titulo, descripcion, tipo, url, modulo_id, req.params.id]
    );
    if (!result.rowCount) return res.status(404).json({ error: 'Archivo no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error actualizando archivo:', err);
    res.status(500).json({ error: 'Error actualizando archivo' });
  }
});

/* -----------------------------------------------------------
   DELETE /archivos/:id – Eliminar (solo BD aquí)
   (Opcional: también podrías borrar de Cloudinary si guardas public_id)
------------------------------------------------------------*/
router.delete('/:id', async (req, res) => {
  try {
    const result = await db.query('DELETE FROM archivos WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rowCount) return res.status(404).json({ error: 'Archivo no encontrado' });
    res.json({ mensaje: 'Archivo eliminado correctamente' });
  } catch (err) {
    console.error('Error eliminando archivo:', err);
    res.status(500).json({ error: 'Error eliminando archivo' });
  }
});

export default router;
