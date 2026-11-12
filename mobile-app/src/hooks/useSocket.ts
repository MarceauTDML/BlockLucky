import { useEffect, useCallback } from 'react';

import socketClient from '../services/socket.client';
import { useAppDispatch, useAppSelector } from '../store';
import { baseApi } from '../store/api/baseApi';
import {
  setWaitingRoomOnlineCount,
  addLiveChatMessage,
  setWinnerAnnouncement,
  LiveChatMessage,
  LiveWinnerAnnouncement,
} from '../store/slices/lotterySlice';
import { showPointsPopup } from '../store/slices/uiSlice';

export const useSocket = (roundId?: string) => {
  const dispatch = useAppDispatch();
  const currentUserId = useAppSelector((state) => state.auth.user?.id);

  useEffect(() => {
    let mounted = true;

    const onWaitingRoom = (payload: { active: boolean; onlineUsers: number }) => {
      dispatch(setWaitingRoomOnlineCount(payload.onlineUsers));
    };

    const onChatMessage = (msg: LiveChatMessage) => {
      dispatch(addLiveChatMessage(msg));
    };

    const onWinner = (winner: LiveWinnerAnnouncement) => {
      dispatch(setWinnerAnnouncement(winner));
      dispatch(baseApi.util.invalidateTags(['Lottery', 'Wallet']));
    };

    const onPointsAwarded = (event: { userId: string; amount: number; reason: string }) => {
      if (currentUserId && event.userId === currentUserId) {
        dispatch(
          showPointsPopup({
            amount: event.amount,
            reason: `Attribution dynamique : +${event.amount} EtherPoints`,
          }),
        );
      }
    };

    const joinRoom = () => {
      const socket = socketClient.getSocket();
      if (socket && roundId) {
        socket.emit('draw:join', roundId);
      }
    };

    const setup = async () => {
      const socket = await socketClient.connect();
      if (!mounted) return;

      socket.on('connect', joinRoom);
      if (socket.connected) joinRoom();

      socket.on('draw:waiting-room', onWaitingRoom);
      socket.on('chat:message', onChatMessage);
      socket.on('draw:winner', onWinner);
      socket.on('points:awarded', onPointsAwarded);
    };

    setup();

    return () => {
      mounted = false;
      const socket = socketClient.getSocket();
      if (!socket) return;
      socket.off('connect', joinRoom);
      socket.off('draw:waiting-room', onWaitingRoom);
      socket.off('chat:message', onChatMessage);
      socket.off('draw:winner', onWinner);
      socket.off('points:awarded', onPointsAwarded);
      if (roundId) {
        socket.emit('draw:leave', roundId);
      }
    };
  }, [currentUserId, dispatch, roundId]);

  const sendChatMessage = useCallback((message: string, emoji?: string): boolean => {
    const socket = socketClient.getSocket();
    if (!socket || !socket.connected) return false;
    socket.emit('chat:send', emoji ? { message, emoji } : { message });
    return true;
  }, []);

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
