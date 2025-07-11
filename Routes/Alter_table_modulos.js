// agregarRutaModulos.js
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

// Conexión a la base de datos
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Función para agregar columna "ruta"
const agregarColumnaRuta = async () => {
  try {
    await pool.query(`
      ALTER TABLE modulos
      ADD COLUMN ruta TEXT;
    `);
    console.log('✅ Columna "ruta" agregada exitosamente a la tabla "modulos".');
  } catch (error) {
    console.error('❌ Error al agregar la columna "ruta":', error.message);
  } finally {
    await pool.end();
  }
};

agregarColumnaRuta();
