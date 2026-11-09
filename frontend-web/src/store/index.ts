import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { baseApi } from './api/baseApi';
import authReducer from './slices/authSlice';
import lotteryReducer from './slices/lotterySlice';
import uiReducer from './slices/uiSlice';

export const makeStore = () =>
  configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      auth: authReducer,
      lottery: lotteryReducer,
      ui: uiReducer,
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
