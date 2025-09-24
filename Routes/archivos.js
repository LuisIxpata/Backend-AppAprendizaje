// routes/archivos.js
import { Router } from 'express';
import db from '../db.js';


// --- Opcional: subida de archivos con multer (memoria) ---
import multer from 'multer';
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

// --- Opcional: Cloudinary (descomenta si lo usas) ---
// import { v2 as cloudinary } from 'cloudinary';
// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key:    process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

const router = Router();

/* ===================== Helpers ===================== */

const guessType = (filename = '', mime = '') => {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  const map = {
    pdf: 'PDF', doc: 'WORD', docx: 'WORD',
    xls: 'EXCEL', xlsx: 'EXCEL',
    ppt: 'PPT', pptx: 'PPT',
    txt: 'TXT', csv: 'CSV', zip: 'ZIP', rar: 'RAR',
    jpg: 'JPEG', jpeg: 'JPEG', png: 'PNG',
    js: 'JS', ts: 'TS', java: 'JAVA', py: 'PY',
    c: 'C', cpp: 'CPP', cs: 'CSHARP', html: 'HTML', css: 'CSS', md: 'MD'
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

/* ===================== GET /archivos ===================== */
/* Lista solo los archivos del usuario. Admin puede ver todo con ?scope=all */
router.get('/', async (req, res) => {
  try {
    const { id: userId, rol } = req.user;
    const seeAll = req.query.scope === 'all' && rol === 'admin';

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

/* ===================== GET /archivos/:id ===================== */
/* (opcional) metadata de un archivo si es del dueño */
router.get('/:id', async (req, res) => {
  try {
    const fileId = Number(req.params.id);
    if (!fileId) return res.status(400).json({ error: 'ID inválido' });

    const { rows } = await db.query(
      `SELECT id, user_id, titulo, tipo, url, fecha_subida
         FROM archivos
        WHERE id = $1`,
      [fileId]
    );
    if (!rows.length) return res.status(404).json({ error: 'No existe' });

    const r = rows[0];
    if (r.user_id !== req.user.id && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    return res.json(rowToClient(r));
  } catch (e) {
    console.error('[GET /archivos/:id]', e);
    return res.status(500).json({ error: 'No se pudo obtener el archivo' });
  }
});

/* ===================== GET /archivos/:id/download-url ===================== */
/* Devuelve una URL de descarga si el archivo es del usuario */
router.get('/:id/download-url', async (req, res) => {
  try {
    const fileId = Number(req.params.id);
    if (!fileId) return res.status(400).json({ error: 'ID inválido' });

    const { rows } = await db.query(
      `SELECT id, user_id, url
         FROM archivos
        WHERE id = $1`,
      [fileId]
    );
    if (!rows.length) return res.status(404).json({ error: 'No existe' });

    const f = rows[0];
    if (f.user_id !== req.user.id && req.user.rol !== 'admin') {
      return res.status(403).json({ error: 'Sin permiso' });
    }

    // Si usas S3 privado, aquí genera un presigned URL y retorna ese.
    // Para Cloudinary público, la misma URL basta.
    return res.json({ url: f.url });
  } catch (e) {
    console.error('[GET /archivos/:id/download-url]', e);
    return res.status(500).json({ error: 'No se pudo generar URL' });
  }
});

/* ===================== POST /archivos ===================== */
/* A) Modo URL directa (body.url) | B) Modo archivo form-data (archivo) */
router.post(
  '/',
  upload.single('archivo'), // permite recibir archivo; si no viene, no falla
  async (req, res) => {
    try {
      const userId = req.user.id;

      let { titulo, tipo, modulo_id, url } = req.body || {};
      titulo = (titulo || '').toString().trim();
      tipo = (tipo || '').toString().trim() || null;
      modulo_id = modulo_id ? Number(modulo_id) : null;

      // --- Caso B: se subió un archivo ---
      if (req.file && req.file.buffer) {
        const original = req.file.originalname || 'archivo';
        const detectedType = guessType(original, req.file.mimetype);
        if (!titulo) titulo = original;
        if (!tipo) tipo = detectedType;

        // ====== Subida a Cloudinary (descomentar si lo usas) ======
        // const folder = `user_${userId}`;
        // const uploadRes = await cloudinary.uploader.upload_stream({
        //   folder,
        //   resource_type: 'auto',
        //   public_id: undefined,
        // }, (err, result) => { ... });
        //
        // Para usar upload_stream con buffer en memoria:
        // const streamUpload = () => new Promise((resolve, reject) => {
        //   const stream = cloudinary.uploader.upload_stream(
        //     { folder, resource_type: 'auto' },
        //     (err, result) => (err ? reject(err) : resolve(result))
        //   );
        //   stream.end(req.file.buffer);
        // });
        // const result = await streamUpload();
        // url = result.secure_url;

        // ====== Si no usas storage aún: rechaza o simula una URL ======
        return res
          .status(400)
          .json({ error: 'Subida de archivo activa pero falta integrar storage (Cloudinary/S3). Envíe body.url temporalmente.' });
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
  }
);

/* ===================== DELETE /archivos/:id ===================== */
/* Solo dueño (o admin) puede eliminar */
router.delete('/:id', async (req, res) => {
  try {
    const fileId = Number(req.params.id);
    if (!fileId) return res.status(400).json({ error: 'ID inválido' });

    const isAdmin = req.user.rol === 'admin';
    const params = isAdmin ? [fileId] : [fileId, req.user.id];

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
