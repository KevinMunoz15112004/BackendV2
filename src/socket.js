import { Server } from 'socket.io';
import Mensaje from './models/Mensajes.js';
import Estudiante from './models/Estudiantes.js';

export const configurarSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true
    }
  });

  const usuariosConectados = new Map();

  io.on('connection', (socket) => {
    console.log('Cliente conectado', socket.id);

    socket.on('usuario:conectar', (estudianteId) => {
      usuariosConectados.set(estudianteId, socket.id);
      console.log(`Estudiante ${estudianteId} conectado con socket ${socket.id}`);
    });

    socket.on('mensaje:privado', async ({ autorId, destinatarioId, contenido }) => {
      if (!autorId || !destinatarioId || !contenido) return;

      const mensajeGuardado = await Mensaje.create({
        autor: autorId,
        destinatario: destinatarioId,
        contenido
      });

      const autor = await Estudiante.findById(autorId).select('nombre apellido');

      const mensajeParaEnviar = {
        _id: mensajeGuardado._id,
        contenido,
        createdAt: mensajeGuardado.createdAt,
        destinatario: destinatarioId,
        autor: {
          _id: autor._id,
          nombre: autor.nombre,
          apellido: autor.apellido
        }
      };

      const socketAutor = usuariosConectados.get(autorId);
      if (socketAutor) io.to(socketAutor).emit('mensaje:recibido', mensajeParaEnviar);

      const socketDest = usuariosConectados.get(destinatarioId);
      if (socketDest) io.to(socketDest).emit('mensaje:recibido', mensajeParaEnviar);
    });

    socket.on('disconnect', () => {
      for (const [estId, sId] of usuariosConectados.entries()) {
        if (sId === socket.id) {
          usuariosConectados.delete(estId);
          console.log(`Estudiante ${estId} desconectado`);
          break;
        }
      }
    });
  });
};
