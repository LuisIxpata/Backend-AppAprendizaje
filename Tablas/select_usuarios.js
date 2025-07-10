// Tablas/select_usuarios.js
// Ejecuta:  node Tablas/select_usuarios

import db from '../db.js';   // <-- ajusta la ruta si tu db.js está en otro sitio

(async () => {
  try {
    const { rows } = await db.query(`
  SELECT id, nombre, apellido, carnet, correo, telefono, carrera, rol, photo_url
  FROM usuarios
  where id=5;
`);


    console.table(rows);          // Muestra el resultado bonito en consola
  } catch (err) {
    console.error('Error ejecutando SELECT:', err);
  } finally {
    // Cierra conexiones antes de salir
    await db.end?.();             // pg ≥8.7 soporta end() en el pool
    process.exit(0);
  }
})();

