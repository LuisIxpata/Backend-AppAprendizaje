// routes/archivos.js
import { Router } from 'express';
import db from '../db.js';
import multer from 'multer';
import cloudinary from '../cloudinary.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

const router = Router();

/* ===== Helpers ===== */

// SIN AUTH (temporal): obtenemos user desde header/query/body
function getUserCtx(req) {
  const idRaw =
    req.header('x-user-id') ??
    req.query.user_id ??
    (req.body && req.body.user_id);
  const rolRaw =
    req.header('x-user-role') ??
    req.query.rol ??
    (req.body && req.body.rol);

  const id = Number(idRaw);
  const rol = (rolRaw || 'docente').toString().toLowerCase();
  if (!id || Number.isNaN(id)) return null;
  return { id, rol };
}

const guessType = (filename = '', mime = '') => {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  const map = {
    pdf: 'PDF', doc: 'WORD', docx: 'WORD',
    xls: 'EXCEL', xlsx: 'EXCEL',
    ppt: 'PPT',  pptx: 'PPT',
    txt: 'TXT',  csv: 'CSV', zip: 'ZIP', rar: 'RAR',
    jpg: 'JPEG', jpeg:'JPEG', png: 'PNG',
    java:'JAVA', js:'JS', ts:'TS', py:'PY',
    c:'C', cpp:'CPP', cs:'CSHARP', html:'HTML', css:'CSS', md:'MD'
  };
  if (map[ext]) return map[ext];
  if (mime) return mime.toUpperCase();
  return 'FILE';
};

const rowToClient = r => ({
  id: r.id,
  nombre: r.titulo,
  tipo: r.tipo || '',
  url: r.url,
  fecha_subida: r.fecha_subida,
});

// Sube un buffer a Cloudinary usando stream
function uploadBufferToCloudinary(buffer, { folder, public_id }) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id, resource_type: 'auto', overwrite: true },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    stream.end(buffer);
  });
}

/* ===== GET /archivos ===== */
router.get('/', async (req, res) => {
  try {
    const ctx = getUserCtx(req);
    if (!ctx) return res.status(400).json({ error: 'user_id requerido (temporal sin auth)' });

    const seeAll = req.query.scope === 'all' && ctx.rol === 'admin';

    const q = seeAll
      ? `SELECT id, titulo, tipo, url, fecha_subida FROM archivos ORDER BY fecha_subida DESC`
      : `SELECT id, titulo, tipo, url, fecha_subida FROM archivos WHERE user_id=$1 ORDER BY fecha_subida DESC`;

    const params = seeAll ? [] : [ctx.id];
    const { rows } = await db.query(q, params);
    res.json(rows.map(rowToClient));
  } catch (e) {
    console.error('[GET /archivos]', e);
    res.status(500).json({ error: 'No se pudo obtener archivos' });
  }
});

/* ===== GET /archivos/:id/download-url ===== */
router.get('/:id/download-url', async (req, res) => {
  try {
    const ctx = getUserCtx(req);
    if (!ctx) return res.status(400).json({ error: 'user_id requerido (temporal sin auth)' });

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    const { rows } = await db.query(`SELECT id, user_id, url FROM archivos WHERE id=$1`, [id]);
    if (!rows.length) return res.status(404).json({ error: 'No existe' });

    const f = rows[0];
    if (f.user_id !== ctx.id && ctx.rol !== 'admin') {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    res.json({ url: f.url });
  } catch (e) {
    console.error('[GET /archivos/:id/download-url]', e);
    res.status(500).json({ error: 'No se pudo generar URL' });
  }
});

/* ===== POST /archivos =====
   Envía: multipart/form-data con campo 'archivo' + (titulo opcional) + user_id/rol
   También acepta 'url' para registrar un link (fallback).
*/
router.post('/', upload.single('archivo'), async (req, res) => {
  try {
    const ctx = getUserCtx(req);
    if (!ctx) return res.status(400).json({ error: 'user_id requerido (temporal sin auth)' });

    let { titulo, tipo, modulo_id, url } = req.body || {};
    titulo = (titulo || '').toString().trim();
    tipo = (tipo || '').toString().trim() || null;
    modulo_id = modulo_id ? Number(modulo_id) : null;

    let public_id = null;

    if (req.file && req.file.buffer) {
      const original = req.file.originalname || 'archivo';
      const safeName = (original.split('/').pop() || 'archivo')
        .replace(/[^\w\-.]+/g, '_')
        .slice(0, 100);

      const folder = `app_uploads/user_${ctx.id}`;
      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder,
        public_id: safeName, // Cloudinary quita/extiende solo si hace falta
      });

      url = result.secure_url;
      public_id = result.public_id;          // guarda para poder borrar luego
      if (!tipo)   tipo   = guessType(original, req.file.mimetype);
      if (!titulo) titulo = original;
    }

    // Fallback: registrar URL directa si no vino archivo
    if (!url) return res.status(400).json({ error: 'Falta archivo o url' });
    if (!titulo) titulo = 'archivo';
    if (!tipo)   tipo   = guessType(titulo);

    const { rows } = await db.query(
      `INSERT INTO archivos (user_id, titulo, tipo, url, public_id, modulo_id, fecha_subida)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       RETURNING id, titulo, tipo, url, fecha_subida`,
      [ctx.id, titulo, tipo, url, public_id, modulo_id]
    );

    res.status(201).json(rowToClient(rows[0]));
  } catch (e) {
    console.error('[POST /archivos]', e);
    res.status(500).json({ error: 'No se pudo subir/registrar el archivo' });
  }
});

/* ===== DELETE /archivos/:id ===== */
router.delete('/:id', async (req, res) => {
  try {
    const ctx = getUserCtx(req);
    if (!ctx) return res.status(400).json({ error: 'user_id requerido (temporal sin auth)' });

    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ error: 'ID inválido' });

    // Obtén public_id antes de borrar
    const fileQ = await db.query('SELECT user_id, public_id FROM archivos WHERE id=$1', [id]);
    if (!fileQ.rows.length) return res.status(404).json({ error: 'No encontrado' });
    const f = fileQ.rows[0];
    if (f.user_id !== ctx.id && ctx.rol !== 'admin') return res.status(403).json({ error: 'Sin permiso' });

    // borra en DB
    const del = await db.query('DELETE FROM archivos WHERE id=$1', [id]);

    // borra en Cloudinary (best effort: intentamos image/raw/video)
    if (f.public_id) {
      try { await cloudinary.uploader.destroy(f.public_id, { resource_type: 'image' }); } catch {}
      try { await cloudinary.uploader.destroy(f.public_id, { resource_type: 'raw'   }); } catch {}
      try { await cloudinary.uploader.destroy(f.public_id, { resource_type: 'video' }); } catch {}
    }

    if (!del.rowCount) return res.status(404).json({ error: 'No encontrado' });
    res.json({ ok: true });
  } catch (e) {
    console.error('[DELETE /archivos/:id]', e);
    res.status(500).json({ error: 'No se pudo eliminar' });
  }
});

export default router;
