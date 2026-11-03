import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface PointsPopupPayload {
  visible: boolean;
  amount: number;
  reason: string;
}

export interface RetryModalPayload {
  visible: boolean;
  message: string;
  retryAttempt: number;
}

export interface QueueModalPayload {
  visible: boolean;
  position: number;
}

export interface SentryErrorModalPayload {
  visible: boolean;
  title: string;
  message: string;
}

export interface UiState {
  pointsPopup: PointsPopupPayload;
  retryModal: RetryModalPayload;
  queueModal: QueueModalPayload;
  sentryModal: SentryErrorModalPayload;
  fallbackNetworkActive: boolean;
  notificationDrawerOpen: boolean;
  osPushBanner: {
    visible: boolean;
    title: string;
    body: string;
  };
}

const initialState: UiState = {
  pointsPopup: {
    visible: false,
    amount: 0,
    reason: '',
  },
  retryModal: {
    visible: false,
    message: '',
    retryAttempt: 0,
  },
  queueModal: {
    visible: false,
    position: 245,
  },
  sentryModal: {
    visible: false,
    title: '',
    message: '',
  },
  fallbackNetworkActive: false,
  notificationDrawerOpen: false,
  osPushBanner: {
    visible: false,
    title: '',
    body: '',
  },
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    showPointsPopup: (
      state,
      action: PayloadAction<{ amount: number; reason: string }>
    ) => {
      state.pointsPopup = {
        visible: true,
        amount: action.payload.amount,
        reason: action.payload.reason,
      };
    },
    hidePointsPopup: (state) => {
      state.pointsPopup.visible = false;
    },
    showRetryModal: (
      state,
      action: PayloadAction<{ message: string; retryAttempt?: number }>
    ) => {
      state.retryModal = {
        visible: true,
        message: action.payload.message,
        retryAttempt: action.payload.retryAttempt ?? 1,
      };
    },
    hideRetryModal: (state) => {
      state.retryModal.visible = false;
    },
    showQueueModal: (state, action: PayloadAction<number | undefined>) => {
      state.queueModal = {
        visible: true,
        position: action.payload ?? 245,
      };
    },
    hideQueueModal: (state) => {
      state.queueModal.visible = false;
    },
    showSentryModal: (
      state,
      action: PayloadAction<{ title?: string; message: string }>
    ) => {
      state.sentryModal = {
        visible: true,
        title: action.payload.title || 'Oups, réseau instable',
        message: action.payload.message,
      };
    },
    hideSentryModal: (state) => {
      state.sentryModal.visible = false;
    },
    setFallbackNetworkActive: (state, action: PayloadAction<boolean>) => {
      state.fallbackNetworkActive = action.payload;
    },
    setNotificationDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.notificationDrawerOpen = action.payload;
    },
    showOsPushBanner: (
      state,
      action: PayloadAction<{ title: string; body: string }>
    ) => {
      state.osPushBanner = {
        visible: true,
        title: action.payload.title,
        body: action.payload.body,
      };
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
  setFallbackNetworkActive,
  setNotificationDrawerOpen,
  showOsPushBanner,
  hideOsPushBanner,
} = uiSlice.actions;

export default uiSlice.reducer;
