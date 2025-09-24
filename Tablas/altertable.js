// Tablas/altertable.js  (ESM)
import 'dotenv/config';

// Si ../db.js es ESM (export default pool):
import pool from '../db.js';

// --- Si tu ../db.js es CommonJS (module.exports = pool), usa esto en su lugar ---
// import { createRequire } from 'module';
// const require = createRequire(import.meta.url);
// const pool = require('../db');

try {
  await pool.query(`
    ALTER TABLE archivos
      ADD COLUMN IF NOT EXISTS user_id INTEGER;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'archivos_user_fk'
      ) THEN
        ALTER TABLE archivos
          ADD CONSTRAINT archivos_user_fk
          FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE CASCADE;
      END IF;
    END$$;

    CREATE INDEX IF NOT EXISTS idx_archivos_user
      ON archivos (user_id, id DESC);
  `);

  // Enforce NOT NULL solo si ya no hay NULLs
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS n FROM archivos WHERE user_id IS NULL;`);
  if (rows[0].n === 0) {
    await pool.query(`ALTER TABLE archivos ALTER COLUMN user_id SET NOT NULL;`);
    console.log('✅ user_id NOT NULL aplicado.');
  } else {
    console.log(`⚠️ Hay ${rows[0].n} archivos sin dueño. Asigna antes de fijar NOT NULL.`);
  }

  console.log('✅ Migración aplicada.');
} catch (err) {
  console.error('❌ Error en migración:', err);
  process.exitCode = 1;
} finally {
  await pool.end();
  process.exit();
}
