import { Router } from 'express';
import db from '../db.js';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import 'dotenv/config';

const router = Router();

// Multer en memoria (25 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
});

// Cloudinary (si hay credenciales)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
const HAS_CLOUD = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

/* ------------ Helpers ------------ */
const guessType = (filename = '', mime = '') => {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  const map = {
    pdf:'PDF', doc:'WORD', docx:'WORD',
    xls:'EXCEL', xlsx:'EXCEL',
    ppt:'PPT', pptx:'PPT',
    txt:'TXT', csv:'CSV', zip:'ZIP', rar:'RAR',
    jpg:'JPEG', jpeg:'JPEG', png:'PNG',
    js:'JS', ts:'TS', java:'JAVA', py:'PY',
    c:'C', cpp:'CPP', cs:'CSHARP',
    html:'HTML', css:'CSS', md:'MD'
  };
  if (map[ext]) return map[ext];
  if (mime) return mime.toUpperCase();
  return 'FILE';
};

const rowToClient = (r) => ({
  id: r.id,
  nombre: r.titulo,
  tipo: r.tipo || '',
  url: r.url,
  fecha_subida: r.fecha_subida,
});

/* ========== GET /archivos  (lista) ========== */
/* Requiere user_id vía query; admin puede ver todo con ?scope=all&rol=admin */
router.get('/', async (req, res) => {
  try {
    const userId = Number(req.query.user_id);
    const rol = (req.query.rol || '').toLowerCase();
    const seeAll = req.query.scope === 'all' && rol === 'admin';

    if (!seeAll && !userId) {
      return res.status(400).json({ error: 'user_id requerido' });
    }

    const q = seeAll
      ? `SELECT id, titulo, tipo, url, fecha_subida
           FROM archivos
          ORDER BY fecha_subida DESC`
      : `SELECT id, titulo, tipo, url, fecha_subida
           FROM archivos
          WHERE user_id = $1
          ORDER BY fecha_subida DESC`;

    const params = seeAll ? [] : [userId];
    const { rows } = await db.query(q, params);
    return res.json(rows.map(rowToClient));
  } catch (e) {
    console.error('[GET /archivos]', e);
    return res.status(500).json({ error: 'No se pudo obtener archivos' });
  }
});

/* ========== GET /archivos/:id (metadata) ========== */
router.get('/:id', async (req, res) => {
  try {
    const fileId = Number(req.params.id);
    const userId = Number(req.query.user_id);
    const rol = (req.query.rol || '').toLowerCase();
    if (!fileId) return res.status(400).json({ error: 'ID inválido' });

    const { rows } = await db.query(
      `SELECT id, user_id, titulo, tipo, url, fecha_subida
         FROM archivos
        WHERE id = $1`,
      [fileId]
    );
    if (!rows.length) return res.status(404).json({ error: 'No existe' });

    const r = rows[0];
    if (rol !== 'admin' && r.user_id !== userId) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    return res.json(rowToClient(r));
  } catch (e) {
    console.error('[GET /archivos/:id]', e);
    return res.status(500).json({ error: 'No se pudo obtener el archivo' });
  }
});

/* ========== GET /archivos/:id/download-url ========== */
router.get('/:id/download-url', async (req, res) => {
  try {
    const fileId = Number(req.params.id);
    const userId = Number(req.query.user_id);
    const rol = (req.query.rol || '').toLowerCase();
    if (!fileId) return res.status(400).json({ error: 'ID inválido' });

    const { rows } = await db.query(
      `SELECT id, user_id, url FROM archivos WHERE id = $1`,
      [fileId]
    );
    if (!rows.length) return res.status(404).json({ error: 'No existe' });

    const f = rows[0];
    if (rol !== 'admin' && f.user_id !== userId) {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    return res.json({ url: f.url });
  } catch (e) {
    console.error('[GET /archivos/:id/download-url]', e);
    return res.status(500).json({ error: 'No se pudo generar URL' });
  }
});

/* ========== POST /archivos (subir archivo o registrar URL) ========== */
router.post('/', upload.single('archivo'), async (req, res) => {
  try {
    const userId = Number(req.body.user_id || req.query.user_id);
    const rol = (req.body.rol || req.query.rol || '').toLowerCase();
    if (!userId) return res.status(400).json({ error: 'user_id requerido' });
    if (!rol) return res.status(400).json({ error: 'rol requerido' });

    let { titulo, tipo, modulo_id, url } = req.body || {};
    titulo = (titulo || '').toString().trim();
    tipo = (tipo || '').toString().trim() || null;
    modulo_id = modulo_id ? Number(modulo_id) : null;

    // --- Caso B: archivo real ---
    if (req.file && req.file.buffer) {
      const original = req.file.originalname || 'archivo';
      if (!titulo) titulo = original;
      if (!tipo) tipo = guessType(original, req.file.mimetype);

      if (!HAS_CLOUD) {
        return res
          .status(503)
          .json({ error: 'Storage no configurado (CLOUDINARY_*). Envíe "url" temporalmente o configure Cloudinary.' });
      }

      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `user_${userId}`,
            resource_type: 'auto',
            use_filename: true,
            unique_filename: false,
          },
          (err, result) => (err ? reject(err) : resolve(result))
        );
        stream.end(req.file.buffer);
      });

      url = result.secure_url;
    }

    // --- Caso A: URL directa ---
    if (!url) return res.status(400).json({ error: 'Falta url o archivo' });
    if (!titulo) titulo = 'archivo';
    if (!tipo) tipo = guessType(titulo);

    const { rows } = await db.query(
      `INSERT INTO archivos (user_id, titulo, tipo, url, modulo_id, fecha_subida)
       VALUES ($1,$2,$3,$4,$5, NOW())
       RETURNING id, titulo, tipo, url, fecha_subida`,
      [userId, titulo, tipo, url, modulo_id]
    );

    return res.status(201).json(rowToClient(rows[0]));
  } catch (e) {
    console.error('[POST /archivos]', e);
    return res.status(500).json({ error: 'No se pudo subir/registrar el archivo' });
  }
});

/* ========== DELETE /archivos/:id ========== */
router.delete('/:id', async (req, res) => {
  try {
    const fileId = Number(req.params.id);
    const userId = Number(req.query.user_id);
    const rol = (req.query.rol || '').toLowerCase();
    if (!fileId) return res.status(400).json({ error: 'ID inválido' });

    const isAdmin = rol === 'admin';
    const params = isAdmin ? [fileId] : [fileId, userId];

    const { rowCount } = await db.query(
      isAdmin
        ? `DELETE FROM archivos WHERE id=$1`
        : `DELETE FROM archivos WHERE id=$1 AND user_id=$2`,
      params
    );

    if (!rowCount) return res.status(404).json({ error: 'No encontrado o sin permiso' });
    return res.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /archivos/:id]', e);
    return res.status(500).json({ error: 'No se pudo eliminar' });
  }
});

export default router;
