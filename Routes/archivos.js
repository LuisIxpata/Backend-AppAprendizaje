// routes/archivos.js
import { Router } from 'express';
import db from '../db.js';
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

const router = Router();

/* ========== Helpers ========== */

// ⚠️ Modo PRUEBAS (sin auth): tomamos el user desde header/query/body.
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

/* ========== GET /archivos ========== */
/* Lista archivos del usuario. ?scope=all + rol=admin muestra todo */
router.get('/', async (req, res) => {
  try {
    const ctx = getUserCtx(req);
    if (!ctx) return res.status(400).json({ error: 'user_id requerido (temporal sin auth)' });

    const seeAll = req.query.scope === 'all' && ctx.rol === 'admin';

    const q = seeAll
      ? `SELECT id, titulo, tipo, url, fecha_subida
           FROM archivos
          ORDER BY fecha_subida DESC`
      : `SELECT id, titulo, tipo, url, fecha_subida
           FROM archivos
          WHERE user_id = $1
          ORDER BY fecha_subida DESC`;

    const params = seeAll ? [] : [ctx.id];
    const { rows } = await db.query(q, params);
    return res.json(rows.map(rowToClient));
  } catch (e) {
    console.error('[GET /archivos]', e);
    return res.status(500).json({ error: 'No se pudo obtener archivos' });
  }
});

/* ========== GET /archivos/:id ========== */
router.get('/:id', async (req, res) => {
  try {
    const ctx = getUserCtx(req);
    if (!ctx) return res.status(400).json({ error: 'user_id requerido (temporal sin auth)' });

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
    if (r.user_id !== ctx.id && ctx.rol !== 'admin') {
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
    const ctx = getUserCtx(req);
    if (!ctx) return res.status(400).json({ error: 'user_id requerido (temporal sin auth)' });

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
    if (f.user_id !== ctx.id && ctx.rol !== 'admin') {
      return res.status(403).json({ error: 'Sin permiso' });
    }
    return res.json({ url: f.url });
  } catch (e) {
    console.error('[GET /archivos/:id/download-url]', e);
    return res.status(500).json({ error: 'No se pudo generar URL' });
  }
});

/* ========== POST /archivos ========== */
/* A) body.url   B) archivo (no implementado storage -> devuelve 400) */
router.post('/', upload.single('archivo'), async (req, res) => {
  try {
    const ctx = getUserCtx(req);
    if (!ctx) return res.status(400).json({ error: 'user_id requerido (temporal sin auth)' });

    let { titulo, tipo, modulo_id, url } = req.body || {};
    titulo = (titulo || '').toString().trim();
    tipo = (tipo || '').toString().trim() || null;
    modulo_id = modulo_id ? Number(modulo_id) : null;

    // Si viene archivo, por ahora rechazamos (no hay Cloud storage integrado)
    if (req.file && req.file.buffer) {
      return res.status(400).json({
        error: 'Subida de archivo no habilitada aún. Envíe body.url temporalmente.',
      });
    }

    if (!url) return res.status(400).json({ error: 'Falta url o archivo' });
    if (!titulo) titulo = 'archivo';
    if (!tipo) tipo = guessType(titulo);

    const { rows } = await db.query(
      `INSERT INTO archivos (user_id, titulo, tipo, url, modulo_id, fecha_subida)
       VALUES ($1,$2,$3,$4,$5,NOW())
       RETURNING id, titulo, tipo, url, fecha_subida`,
      [ctx.id, titulo, tipo, url, modulo_id]
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
    const ctx = getUserCtx(req);
    if (!ctx) return res.status(400).json({ error: 'user_id requerido (temporal sin auth)' });

    const fileId = Number(req.params.id);
    if (!fileId) return res.status(400).json({ error: 'ID inválido' });

    const isAdmin = ctx.rol === 'admin';
    const params = isAdmin ? [fileId] : [fileId, ctx.id];

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
