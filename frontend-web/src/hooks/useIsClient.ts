'use client';

import { useSyncExternalStore } from 'react';

const noopSubscribe = () => () => {};

export const useIsClient = (): boolean =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );

export default useIsClient;
