import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import insertarUsuario       from './Routes/insertar_usuarios.js';
import actualizarUsuario     from './Routes/actualizar_usuarios.js';
import obtenerUsuario        from './Routes/obtener_usuarios.js';
import eliminarUsuario       from './Routes/eliminar_usuarios.js';

import modulosRoutes         from './Routes/modulos.js';
import preguntasRoutes       from './Routes/preguntas.js';
import respuestasRoutes      from './Routes/respuestas.js';
import progresoRoutes        from './Routes/progreso.js';
import notificacionesRoutes  from './Routes/notificaciones.js';
import archivosRoutes        from './Routes/archivos.js';
import mensajesRoutes        from './Routes/mensajes.js';
import authAutenticacion     from './Autenticacion/auth.js';
import loginRoutes           from './Routes/login.js';
import subirImagenRoutes     from './Routes/subir_imagen.js';
const app = express();

app.get('/', (_, res) => {
  res.send('🟢 API funcionando correctamente');
});
app.get('/health', (req, res) => {
  res.status(200).json({ status: '🟢 API funcionando correctamente' });
});
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));
app.use('/insertar_usuarios', insertarUsuario);
app.use('/actualizar_usuarios', actualizarUsuario);
app.use('/obtener_usuarios', obtenerUsuario);
app.use('/eliminar_usuarios', eliminarUsuario);
app.use('/modulos', modulosRoutes);
app.use('/preguntas', preguntasRoutes);
app.use('/respuestas', respuestasRoutes);
app.use('/progreso', progresoRoutes);
app.use('/notificaciones', notificacionesRoutes);
app.use('/archivos', archivosRoutes);
app.use('/mensajes', mensajesRoutes);
app.use('/auth', authAutenticacion);
app.use('/login', loginRoutes);
app.use('/imagen', subirImagenRoutes);

//app.use('/', verUsuarios);
//app.use('/', AddPassword);
//app.use('/', VerColumnasUsuario);

app.listen(process.env.PORT, () =>
  console.log(`API corriendo en puerto ${process.env.PORT}`)
);