import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserProfile } from '../../types/user.types';

export interface AuthState {
  isAuthenticated: boolean;
  hasSeenOnboarding: boolean;
  token: string | null;
  user: UserProfile | null;
  pendingTwoFactorUserId: string | null;
  pendingTwoFactorMethod: 'APP' | 'EMAIL' | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  hasSeenOnboarding: false,
  token: null,
  user: null,
  pendingTwoFactorUserId: null,
  pendingTwoFactorMethod: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    completeOnboarding: (state) => {
      state.hasSeenOnboarding = true;
    },
    setCredentials: (
      state,
      action: PayloadAction<{ token: string; user: UserProfile }>
    ) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.pendingTwoFactorUserId = null;
      state.pendingTwoFactorMethod = null;
    },
    setPendingTwoFactor: (
      state,
      action: PayloadAction<{ userId: string; method: 'APP' | 'EMAIL' }>
    ) => {
      state.pendingTwoFactorUserId = action.payload.userId;
      state.pendingTwoFactorMethod = action.payload.method;
    },
    updateUserPoints: (state, action: PayloadAction<number>) => {
      if (state.user) {
        state.user.pointsBalance = action.payload;
      }
    },
    updateUserProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      state.pendingTwoFactorUserId = null;
      state.pendingTwoFactorMethod = null;
    },
  },
});

export const {
  completeOnboarding,
  setCredentials,
  setPendingTwoFactor,
  updateUserPoints,
  updateUserProfile,
  logout,
} = authSlice.actions;

export default authSlice.reducer;
