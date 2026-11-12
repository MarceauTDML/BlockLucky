import { useCallback, useSyncExternalStore } from 'react';

import { useAppDispatch, useAppSelector } from '../store';
import { useGetNotificationsQuery } from '../store/api/authApi';
import { showOsPushBanner, hideOsPushBanner } from '../store/slices/uiSlice';

let seenNotificationIds: ReadonlySet<string> = new Set();
const seenListeners = new Set<() => void>();

const subscribeSeen = (listener: () => void) => {
  seenListeners.add(listener);
  return () => {
    seenListeners.delete(listener);
  };
};

const getSeenSnapshot = () => seenNotificationIds;

const markSeen = (ids: string[]) => {
  if (ids.every((id) => seenNotificationIds.has(id))) return;
  seenNotificationIds = new Set([...seenNotificationIds, ...ids]);
  seenListeners.forEach((listener) => listener());
};

export const usePushNotifications = () => {
  const dispatch = useAppDispatch();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const osPushBanner = useAppSelector((state) => state.ui.osPushBanner);
  const seenIds = useSyncExternalStore(subscribeSeen, getSeenSnapshot, getSeenSnapshot);

  const { data, isLoading, isFetching, isError, refetch } = useGetNotificationsQuery(undefined, {
    skip: !isAuthenticated,
  });

  const triggerSimulatedOsPush = useCallback(
    (title: string, body: string) => {
      dispatch(showOsPushBanner({ title, body }));
      setTimeout(() => {
        dispatch(hideOsPushBanner());
      }, 4500);
    },
    [dispatch],
  );

  const rawNotifications = data?.data?.notifications;
  const safeNotifications = (Array.isArray(rawNotifications) ? rawNotifications : []).map((n) => ({
    ...n,
    read: n.read || seenIds.has(n.id),
  }));

  const markAllAsSeen = useCallback(() => {
    const ids = Array.isArray(rawNotifications) ? rawNotifications.map((n) => n.id) : [];
    markSeen(ids);
  }, [rawNotifications]);

  return {
    notifications: safeNotifications,
    unreadCount: safeNotifications.filter((n) => !n.read).length,
    isLoading,
    isFetching,
    isError,
    osPushBanner,
    markAllAsSeen,
    refetchNotifications: refetch,
    triggerSimulatedOsPush,
  };
};

export default usePushNotifications;
