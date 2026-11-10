import { Socket } from 'socket.io';
import sessionService from '../services/session.service';
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

  sessionService
    .verify(token)
    .then((session) => {
      socket.user = {
        userId: session.userId,
        walletAddress: session.walletAddress,
        role: session.role,
        twoFactorVerified: session.twoFactorVerified ?? false,
      };
      next();
    })
    .catch(() => next(new Error('Invalid authentication token for Socket.IO')));
};
