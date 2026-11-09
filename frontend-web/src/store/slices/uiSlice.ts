import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UiState {
  pointsPopup: { visible: boolean; amount: number; reason: string };
  retryModal: { visible: boolean; message: string; retryAttempt: number; quantity: number };
  queueModal: { visible: boolean; position: number };
  sentryModal: { visible: boolean; title: string; message: string };
  notificationDrawerOpen: boolean;
  osPushBanner: { visible: boolean; title: string; body: string };
}

const initialState: UiState = {
  pointsPopup: { visible: false, amount: 0, reason: '' },
  retryModal: { visible: false, message: '', retryAttempt: 0, quantity: 1 },
  queueModal: { visible: false, position: 245 },
  sentryModal: { visible: false, title: '', message: '' },
  notificationDrawerOpen: false,
  osPushBanner: { visible: false, title: '', body: '' },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    showPointsPopup: (state, action: PayloadAction<{ amount: number; reason: string }>) => {
      state.pointsPopup = { visible: true, ...action.payload };
    },
    hidePointsPopup: (state) => {
      state.pointsPopup.visible = false;
    },
    showRetryModal: (
      state,
      action: PayloadAction<{ message: string; retryAttempt?: number; quantity?: number }>
    ) => {
      state.retryModal = {
        visible: true,
        message: action.payload.message,
        retryAttempt: action.payload.retryAttempt ?? 1,
        quantity: action.payload.quantity ?? 1,
      };
    },
    hideRetryModal: (state) => {
      state.retryModal.visible = false;
    },
    showQueueModal: (state, action: PayloadAction<number | undefined>) => {
      state.queueModal = { visible: true, position: action.payload ?? 245 };
    },
    hideQueueModal: (state) => {
      state.queueModal.visible = false;
    },
    showSentryModal: (state, action: PayloadAction<{ title?: string; message: string }>) => {
      state.sentryModal = {
        visible: true,
        title: action.payload.title || 'Oups, réseau instable',
        message: action.payload.message,
      };
    },
    hideSentryModal: (state) => {
      state.sentryModal.visible = false;
    },
    setNotificationDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.notificationDrawerOpen = action.payload;
    },
    showOsPushBanner: (state, action: PayloadAction<{ title: string; body: string }>) => {
      state.osPushBanner = { visible: true, ...action.payload };
    },
    hideOsPushBanner: (state) => {
      state.osPushBanner.visible = false;
    },
  },
});

export const {
  showPointsPopup,
  hidePointsPopup,
  showRetryModal,
  hideRetryModal,
  showQueueModal,
  hideQueueModal,
  showSentryModal,
  hideSentryModal,
  setNotificationDrawerOpen,
  showOsPushBanner,
  hideOsPushBanner,
} = uiSlice.actions;

export default uiSlice.reducer;
