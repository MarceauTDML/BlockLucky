'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import storage, { KEYS } from '@/lib/storage';

export const SOUNDS = {
  wheel: '/sounds/roue-tirage.mp3',
  chrono: '/sounds/chrono.mp3',
} as const;

export const CHRONO_SECONDS = 8;

const listeners = new Set<() => void>();
let userInteracted = false;
let interactionBound = false;

const notify = () => listeners.forEach((listener) => listener());

const readEnabled = () => storage.get(KEYS.sound) !== '0';

const markInteraction = () => {
  userInteracted = true;
  window.removeEventListener('pointerdown', markInteraction);
  window.removeEventListener('keydown', markInteraction);
};

const bindInteraction = () => {
  if (interactionBound || typeof window === 'undefined') return;
  interactionBound = true;
  const activation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
  if (activation?.hasBeenActive) {
    userInteracted = true;
    return;
  }
  window.addEventListener('pointerdown', markInteraction);
  window.addEventListener('keydown', markInteraction);
};

const onStorage = (event: StorageEvent) => {
  if (event.key === KEYS.sound) notify();
};

const subscribe = (listener: () => void) => {
  bindInteraction();
  if (listeners.size === 0) window.addEventListener('storage', onStorage);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', onStorage);
  };
};

export const setSoundEnabled = (enabled: boolean) => {
  storage.set(KEYS.sound, enabled ? '1' : '0');
  notify();
};

export const useSoundPreference = () => {
  const soundEnabled = useSyncExternalStore(subscribe, readEnabled, () => true);
  return { soundEnabled, setSoundEnabled };
};

export const useSound = (src: string) => {
  const { soundEnabled } = useSoundPreference();
  const audio = useRef<HTMLAudioElement | null>(null);

  const stop = useCallback(() => {
    const element = audio.current;
    if (!element) return;
    try {
      element.pause();
      element.currentTime = 0;
    } catch {
    }
  }, []);

  const play = useCallback(
    (options: { loop?: boolean } = {}) => {
      if (typeof window === 'undefined' || !readEnabled() || !userInteracted) return;
      try {
        if (!audio.current) {
          audio.current = new Audio(src);
          audio.current.preload = 'auto';
        }
        const element = audio.current;
        element.loop = Boolean(options.loop);
        element.currentTime = 0;
        const result = element.play();
        if (result && typeof result.catch === 'function') result.catch(() => undefined);
      } catch {
      }
    },
    [src]
  );

  useEffect(() => {
    if (!soundEnabled) stop();
  }, [soundEnabled, stop]);

  useEffect(
    () => () => {
      stop();
      audio.current = null;
    },
    [stop]
  );

  return { play, stop };
};

export default useSound;
