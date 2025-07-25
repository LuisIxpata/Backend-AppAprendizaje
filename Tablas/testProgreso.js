// archivo temporal para pruebas (por ejemplo: testProgreso.js)
import db from '../db.js'; // asegúrate de que tu archivo db.js esté configurado

const usuario_id = 11; // cámbialo según el usuario que quieras probar

async function calcularProgreso(usuario_id) {
  try {
    const result = await db.query(
      `SELECT
         r.usuario_id,
         p.modulo_id,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE r.correcta) AS correctas,
         ROUND(COUNT(*) FILTER (WHERE r.correcta) * 100.0 / COUNT(*), 2) AS porcentaje
       FROM respuestas r
       JOIN preguntas p ON r.pregunta_id = p.id
       WHERE r.usuario_id = $1
       GROUP BY r.usuario_id, p.modulo_id`,
      [usuario_id]
    );

    if (result.rows.length === 0) {
      console.log('📭 El usuario no ha respondido preguntas aún.');
    } else {
      console.log('📊 Progreso por módulo:');
      result.rows.forEach(row => {
        console.log(`🧠 Módulo ${row.modulo_id}: ${row.porcentaje}% (${row.correctas}/${row.total} correctas)`);
      });
    }

  } catch (err) {
    console.error('❌ Error al calcular el progreso:', err);
  } finally {
    db.end(); // opcional si no estás en un servidor Express
  }
}

calcularProgreso(usuario_id);
