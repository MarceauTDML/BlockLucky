'use client';

import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  addLiveChatMessage,
  LiveChatMessage,
  LiveWinnerAnnouncement,
  setRouletteSpinning,
  setSocketConnected,
  setWaitingRoomOnlineCount,
  setWinnerAnnouncement,
} from '@/store/slices/lotterySlice';
import { showPointsPopup } from '@/store/slices/uiSlice';
import { baseApi } from '@/store/api/baseApi';
import socketClient from '@/lib/socket';

const WINNER_SPIN_MS = 5000;

export const useSocket = (roundId?: string) => {
  const dispatch = useAppDispatch();
  const token = useAppSelector((state) => state.auth.token);
  const currentUserId = useAppSelector((state) => state.auth.user?.id);

  useEffect(() => {
    const socket = socketClient.connect(token);
    let spinTimer: ReturnType<typeof setTimeout> | null = null;

    const onConnect = () => {
      dispatch(setSocketConnected(true));
      if (roundId) socket.emit('draw:join', roundId);
    };
    const onDisconnect = () => dispatch(setSocketConnected(false));
    const onWaitingRoom = (payload: { active: boolean; onlineUsers: number }) =>
      dispatch(setWaitingRoomOnlineCount(payload.onlineUsers));
    const onChat = (msg: LiveChatMessage) => dispatch(addLiveChatMessage(msg));
    const onWinner = (winner: LiveWinnerAnnouncement) => {
      dispatch(setRouletteSpinning(true));
      dispatch(setWinnerAnnouncement(winner));
      dispatch(baseApi.util.invalidateTags(['Lottery', 'Wallet', 'Admin']));
      if (spinTimer) clearTimeout(spinTimer);
      spinTimer = setTimeout(() => dispatch(setRouletteSpinning(false)), WINNER_SPIN_MS);
    };
    const onPoints = (event: { userId: string; amount: number }) => {
      if (currentUserId && event.userId === currentUserId) {
        dispatch(
          showPointsPopup({
            amount: event.amount,
            reason: `Attribution dynamique : +${event.amount} EtherPoints`,
          })
        );
      }
    };

    if (socket.connected) onConnect();
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('draw:waiting-room', onWaitingRoom);
    socket.on('chat:message', onChat);
    socket.on('draw:winner', onWinner);
    socket.on('points:awarded', onPoints);

    return () => {
      if (spinTimer) {
        clearTimeout(spinTimer);
        dispatch(setRouletteSpinning(false));
      }
      if (roundId && socket.connected) socket.emit('draw:leave', roundId);
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('draw:waiting-room', onWaitingRoom);
      socket.off('chat:message', onChat);
      socket.off('draw:winner', onWinner);
      socket.off('points:awarded', onPoints);
    };
  }, [currentUserId, dispatch, roundId, token]);

  const sendChatMessage = useCallback(
    (message: string, emoji?: string) => {
      const socket = socketClient.getSocket();
      if (socket?.connected) {
        socket.emit('chat:send', { message, emoji });
      } else {
        dispatch(
          addLiveChatMessage({
            id: `local-${Date.now()}`,
            senderWallet: 'Vous (hors ligne)',
            message,
            emoji,
            timestamp: new Date().toISOString(),
          })
        );
      }
    },
    [dispatch]
  );

  return { sendChatMessage };
};

export default useSocket;
