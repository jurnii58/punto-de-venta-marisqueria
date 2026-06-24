import { Server } from 'socket.io';

let io = null;

export const initSocket = (server, allowedOrigins = []) => {
  if (io) return io;

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'PATCH']
    }
  });

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);
    socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
  });

  return io;
};

export const getIo = () => io;
