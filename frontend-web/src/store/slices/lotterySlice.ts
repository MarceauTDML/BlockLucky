import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface LiveChatMessage {
  id: string;
  senderWallet: string;
  message: string;
  emoji?: string;
  timestamp: string;
}

export interface LiveWinnerAnnouncement {
  roundId: string;
  contractRoundId: number;
  winnerWallet: string;
  prizePool: number;
  vrfProofHash: string;
  timestamp: string;
}

export interface LotterySliceState {
  onlineWaitingUsers: number;
  socketConnected: boolean;
  liveChatMessages: LiveChatMessage[];
  lastWinnerAnnouncement: LiveWinnerAnnouncement | null;
  isRouletteSpinning: boolean;
}

const initialState: LotterySliceState = {
  onlineWaitingUsers: 1,
  socketConnected: false,
  liveChatMessages: [
    {
      id: 'welcome-msg-1',
      senderWallet: '0x4A9b...892f',
      message: "Prêt pour le grand tirage de la ville d'EtherBay !",
      timestamp: '2026-11-01T10:00:00.000Z',
    },
    {
      id: 'welcome-msg-2',
      senderWallet: '0x91Ce...10a4',
      message: 'Chainlink VRF activé, bonne chance à tous les citoyens !',
      timestamp: '2026-11-01T10:01:00.000Z',
    },
  ],
  lastWinnerAnnouncement: null,
  isRouletteSpinning: false,
};

const lotterySlice = createSlice({
  name: 'lottery',
  initialState,
  reducers: {
    setWaitingRoomOnlineCount: (state, action: PayloadAction<number>) => {
      state.onlineWaitingUsers = action.payload;
    },
    setSocketConnected: (state, action: PayloadAction<boolean>) => {
      state.socketConnected = action.payload;
    },
    addLiveChatMessage: (state, action: PayloadAction<LiveChatMessage>) => {
      if (state.liveChatMessages.some((m) => m.id === action.payload.id)) return;
      state.liveChatMessages.push(action.payload);
      if (state.liveChatMessages.length > 100) state.liveChatMessages.shift();
    },
    setRouletteSpinning: (state, action: PayloadAction<boolean>) => {
      state.isRouletteSpinning = action.payload;
    },
    setWinnerAnnouncement: (state, action: PayloadAction<LiveWinnerAnnouncement | null>) => {
      state.lastWinnerAnnouncement = action.payload;
    },
  },
});

export const {
  setWaitingRoomOnlineCount,
  setSocketConnected,
  addLiveChatMessage,
  setRouletteSpinning,
  setWinnerAnnouncement,
} = lotterySlice.actions;

export default lotterySlice.reducer;
