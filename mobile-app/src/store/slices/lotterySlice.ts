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
  liveChatMessages: LiveChatMessage[];
  lastWinnerAnnouncement: LiveWinnerAnnouncement | null;
  isRouletteSpinning: boolean;
}

const initialState: LotterySliceState = {
  onlineWaitingUsers: 0,
  liveChatMessages: [],
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
    addLiveChatMessage: (state, action: PayloadAction<LiveChatMessage>) => {
      if (state.liveChatMessages.some((message) => message.id === action.payload.id)) return;
      state.liveChatMessages.push(action.payload);
      if (state.liveChatMessages.length > 100) {
        state.liveChatMessages.shift();
      }
    },
    setRouletteSpinning: (state, action: PayloadAction<boolean>) => {
      state.isRouletteSpinning = action.payload;
    },
    setWinnerAnnouncement: (state, action: PayloadAction<LiveWinnerAnnouncement | null>) => {
      state.lastWinnerAnnouncement = action.payload;
      state.isRouletteSpinning = false;
    },
  },
});

export const {
  setWaitingRoomOnlineCount,
  addLiveChatMessage,
  setRouletteSpinning,
  setWinnerAnnouncement,
} = lotterySlice.actions;

export default lotterySlice.reducer;
