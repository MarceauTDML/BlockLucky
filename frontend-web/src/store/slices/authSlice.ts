import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { UserProfile } from '@/types/user.types';

export interface AuthState {
  hydrated: boolean;
  isAuthenticated: boolean;
  token: string | null;
  user: UserProfile | null;
  pendingTwoFactorUserId: string | null;
  pendingTwoFactorMethod: 'APP' | 'EMAIL' | null;
  pendingTwoFactorEmail: string | null;
  pendingLoginTicket: string | null;
}

const initialState: AuthState = {
  hydrated: false,
  isAuthenticated: false,
  token: null,
  user: null,
  pendingTwoFactorUserId: null,
  pendingTwoFactorMethod: null,
  pendingTwoFactorEmail: null,
  pendingLoginTicket: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    hydrateSession: (
      state,
      action: PayloadAction<{ token: string | null; user: UserProfile | null }>
    ) => {
      state.hydrated = true;
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = Boolean(action.payload.token && action.payload.user);
    },
    setCredentials: (state, action: PayloadAction<{ token: string; user: UserProfile }>) => {
      state.hydrated = true;
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.pendingTwoFactorUserId = null;
      state.pendingTwoFactorMethod = null;
      state.pendingTwoFactorEmail = null;
      state.pendingLoginTicket = null;
    },
    setPendingTwoFactor: (
      state,
      action: PayloadAction<{
        userId: string;
        method: 'APP' | 'EMAIL';
        email?: string | null;
        loginTicket?: string | null;
      }>
    ) => {
      state.pendingTwoFactorUserId = action.payload.userId;
      state.pendingTwoFactorMethod = action.payload.method;
      state.pendingTwoFactorEmail = action.payload.email ?? null;
      state.pendingLoginTicket = action.payload.loginTicket ?? null;
    },
    updateUserPoints: (state, action: PayloadAction<number>) => {
      if (state.user) state.user.pointsBalance = action.payload;
    },
    updateUserProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.user) state.user = { ...state.user, ...action.payload };
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      state.pendingTwoFactorUserId = null;
      state.pendingTwoFactorMethod = null;
      state.pendingTwoFactorEmail = null;
      state.pendingLoginTicket = null;
    },
  },
});

export const {
  hydrateSession,
  setCredentials,
  setPendingTwoFactor,
  updateUserPoints,
  updateUserProfile,
  logout,
} = authSlice.actions;

export default authSlice.reducer;
