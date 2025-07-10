import express from 'express';
import db from '../db.js';
import verify from '../Autenticacion/verifyToken.js'; // Asegúrate que sea export default

const router = express.Router();

// DELETE /api/usuarios/:id  — Ruta protegida con JWT
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    // Verificar si el usuario existe
    const verifica = await db.query('SELECT 1 FROM usuarios WHERE id = $1', [id]);
    if (verifica.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Eliminar usuario
    await db.query('DELETE FROM usuarios WHERE id = $1', [id]);

    res.json({ mensaje: `Usuario con id ${id} eliminado correctamente` });
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
});

export default router;
