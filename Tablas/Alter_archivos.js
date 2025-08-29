// Tablas/migrar_archivos_add_cloudinary_cols.js
import 'dotenv/config';
import pkg from 'pg';
const { Pool } = pkg;

// Usa tu DATABASE_URL (Render/Neon/etc.)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // En muchos proveedores gestionados necesitas SSL sin verificación estricta:
  ssl: { rejectUnauthorized: false },
});

const sql = `
BEGIN;

-- Agrega columnas para Cloudinary si no existen
ALTER TABLE IF EXISTS archivos
  ADD COLUMN IF NOT EXISTS public_id TEXT,
  ADD COLUMN IF NOT EXISTS resource_type TEXT;

-- (Opcional) si no tienes resource_type, asume 'raw' para documentos
UPDATE archivos
SET resource_type = 'raw'
WHERE resource_type IS NULL;

COMMIT;
`;

async function migrate() {
  console.log('🚀 Iniciando migración: agregar columnas a tabla "archivos"...');
  try {
    await pool.query(sql);
    console.log('✅ Migración completada: columnas public_id y resource_type listas.');
  } catch (err) {
    console.error('❌ Error en la migración:', err);
    try { await pool.query('ROLLBACK'); } catch {}
    process.exitCode = 1;
  } finally {
    await pool.end();
    console.log('🔌 Conexión cerrada.');
  }
}

migrate();
