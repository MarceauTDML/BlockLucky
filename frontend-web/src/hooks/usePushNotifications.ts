'use client';

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  hideOsPushBanner,
  setNotificationDrawerOpen,
  showOsPushBanner,
} from '@/store/slices/uiSlice';
import { useGetNotificationsQuery } from '@/store/api/authApi';

export const usePushNotifications = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const drawerOpen = useAppSelector((state) => state.ui.notificationDrawerOpen);
  const osPushBanner = useAppSelector((state) => state.ui.osPushBanner);

  const { data, isLoading, refetch } = useGetNotificationsQuery(undefined, {
    skip: !isAuthenticated,
  });

  const openDrawer = useCallback(() => dispatch(setNotificationDrawerOpen(true)), [dispatch]);
  const closeDrawer = useCallback(() => dispatch(setNotificationDrawerOpen(false)), [dispatch]);

  const triggerSimulatedOsPush = useCallback(
    (title: string, body: string) => {
      dispatch(showOsPushBanner({ title, body }));
      setTimeout(() => dispatch(hideOsPushBanner()), 4500);
    },
    [dispatch]
  );

  const raw = data?.data?.notifications;
  const notifications = Array.isArray(raw) ? raw : [];

  return {
    notifications,
    unreadCount: notifications.filter((n) => !n.read).length,
    isLoading,
    drawerOpen,
    osPushBanner,
    openDrawer,
    closeDrawer,
    refetchNotifications: refetch,
    triggerSimulatedOsPush,
  };
};

export default usePushNotifications;
