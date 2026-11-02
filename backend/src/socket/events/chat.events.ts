import { Server } from 'socket.io';
import crypto from 'crypto';
import { AuthenticatedSocket } from '../socket.middleware';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  ChatMessagePayload,
} from '../../types/socket.types';
import { anonymizeWallet } from '../../utils/crypto.util';

export const registerChatEvents = (
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  socket: AuthenticatedSocket
) => {
  socket.on('chat:send', (payload: { message: string; emoji?: string }) => {
    if (!payload?.message || payload.message.trim().length === 0) return;

    const cleanMessage = payload.message.trim().slice(0, 280);
    const wallet = socket.user?.walletAddress || '0x0000...0000';

    const chatMessage: ChatMessagePayload = {
      id: crypto.randomUUID(),
      senderWallet: anonymizeWallet(wallet),
      message: cleanMessage,
      ...(payload.emoji ? { emoji: payload.emoji } : {}),
      timestamp: new Date().toISOString(),
    };

    io.emit('chat:message', chatMessage);
  });

  socket.on('chat:react', (emoji: string) => {
    const wallet = socket.user?.walletAddress || '0x0000...0000';
    io.emit('chat:reaction', {
      emoji: emoji.slice(0, 8),
      senderWallet: anonymizeWallet(wallet),
    });
  });
};
