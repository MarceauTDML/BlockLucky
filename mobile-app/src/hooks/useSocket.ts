import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  setWaitingRoomOnlineCount,
  addLiveChatMessage,
  setWinnerAnnouncement,
  LiveChatMessage,
  LiveWinnerAnnouncement,
} from '../store/slices/lotterySlice';
import { showPointsPopup } from '../store/slices/uiSlice';
import socketClient from '../services/socket.client';

export const useSocket = (roundId?: string) => {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector((state) => state.auth.user?.id);

  useEffect(() => {
    let mounted = true;

    const setup = async () => {
      const socket = await socketClient.connect();
      if (!mounted) return;

      if (roundId) {
        socket.emit('draw:join', roundId);
      }

      socket.on(
        'draw:waiting-room',
        (payload: { active: boolean; onlineUsers: number }) => {
          dispatch(setWaitingRoomOnlineCount(payload.onlineUsers));
        }
      );

      socket.on('chat:message', (msg: LiveChatMessage) => {
        dispatch(addLiveChatMessage(msg));
      });

      socket.on('draw:winner', (winner: LiveWinnerAnnouncement) => {
        dispatch(setWinnerAnnouncement(winner));
      });

      socket.on(
        'points:awarded',
        (event: { userId: string; amount: number; reason: string }) => {
          if (currentUserId && event.userId === currentUserId) {
            dispatch(
              showPointsPopup({
                amount: event.amount,
                reason: `Attribution dynamique : +${event.amount} EtherPoints`,
              })
            );
          }
        }
      );
    };

    setup();

    return () => {
      mounted = false;
      const socket = socketClient.getSocket();
      if (socket && roundId) {
        socket.emit('draw:leave', roundId);
      }
    };
  }, [currentUserId, dispatch, roundId]);

  const sendChatMessage = useCallback((message: string, emoji?: string) => {
    const socket = socketClient.getSocket();
    if (socket && socket.connected) {
      socket.emit('chat:send', { message, emoji });
    } else {
      dispatch(
        addLiveChatMessage({
          id: `local-${Date.now()}`,
          senderWallet: 'Vous (Citoyen)',
          message,
          emoji,
          timestamp: new Date().toISOString(),
        })
      );
    }
  }, [dispatch]);

  const sendReaction = useCallback((emoji: string) => {
    const socket = socketClient.getSocket();
    if (socket && socket.connected) {
      socket.emit('chat:react', emoji);
    }
  }, []);

  return {
    sendChatMessage,
    sendReaction,
  };
};

export default useSocket;
