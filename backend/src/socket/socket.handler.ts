import { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { socketAuthMiddleware, AuthenticatedSocket } from './socket.middleware';
import { registerLiveDrawEvents } from './events/live-draw.events';
import { registerChatEvents } from './events/chat.events';
import { ClientToServerEvents, ServerToClientEvents } from '../types/socket.types';
import logger from '../utils/logger.util';

let ioInstance: Server<ClientToServerEvents, ServerToClientEvents> | null = null;

export const initSocketServer = (
  httpServer: HttpServer
): Server<ClientToServerEvents, ServerToClientEvents> => {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.use(socketAuthMiddleware);

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.debug(`Socket connecté: ${socket.id} (${socket.user?.walletAddress})`);
    registerLiveDrawEvents(io, socket);
    registerChatEvents(io, socket);

    socket.on('disconnect', () => {
      logger.debug(`Socket déconnecté: ${socket.id}`);
    });
  });

  ioInstance = io;
  return io;
};

export const getSocketIo = (): Server<ClientToServerEvents, ServerToClientEvents> | null => {
  return ioInstance;
};
