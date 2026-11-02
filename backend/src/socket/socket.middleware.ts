import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.config';
import { JwtPayload } from '../types/api.types';

export interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

export const socketAuthMiddleware = (
  socket: AuthenticatedSocket,
  next: (err?: Error) => void
) => {
  const token =
    socket.handshake.auth?.token ||
    socket.handshake.headers?.authorization?.replace('Bearer ', '');

  if (!token) {
    socket.user = {
      userId: `guest-${socket.id}`,
      walletAddress: '0xGuest00000000000000000000000000000000',
      role: 'USER',
    };
    return next();
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    socket.user = decoded;
    return next();
  } catch {
    return next(new Error('Invalid authentication token for Socket.IO'));
  }
};
