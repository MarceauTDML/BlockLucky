import { Server } from 'socket.io';
import { AuthenticatedSocket } from '../socket.middleware';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  LiveDrawWinnerEvent,
} from '../../types/socket.types';

export const registerLiveDrawEvents = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
) => {
  socket.on('draw:join', (roundId: string) => {
    const roomName = `draw:${roundId}`;
    socket.join(roomName);
    const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 1;
    io.to(roomName).emit('draw:waiting-room', {
      active: true,
      onlineUsers: roomSize,
    });
  });

  socket.on('draw:leave', (roundId: string) => {
    const roomName = `draw:${roundId}`;
    socket.leave(roomName);
    const roomSize = io.sockets.adapter.rooms.get(roomName)?.size || 0;
    io.to(roomName).emit('draw:waiting-room', {
      active: true,
      onlineUsers: roomSize,
    });
  });
};

export const broadcastWinnerEvent = (
  io: Server<ClientToServerEvents, ServerToClientEvents> | null,
  payload: LiveDrawWinnerEvent
) => {
  if (!io) return;
  io.emit('draw:winner', payload);
};
