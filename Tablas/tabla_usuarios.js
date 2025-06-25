require('dotenv').config();

const pool = require('../db');

(async () => {
    try {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS usuarios (
          id SERIAL PRIMARY KEY,
          nombre TEXT NOT NULL,
          correo TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP 
           
          );  
        `);
        //Se hizo un Alter a esta tabla realizando los siguientes cambios:
        //ALTER TABLE usuarios
        //ADD COLUMN IF NOT EXISTS apellido TEXT,
        //ADD COLUMN IF NOT EXISTS carnet   TEXT,
        //ADD COLUMN IF NOT EXISTS rol      TEXT,
        //ADD COLUMN IF NOT EXISTS photo_url TEXT;
        console.log('Tabla "usuarios" creada');
    }catch (err) {
        console.error('Error al crear la tabla', err);
    } finally {
        await pool.end();
        process.exit();
    }
})();