import { AudioSource, setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import * as SecureStore from 'expo-secure-store';
import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

const SOUND_KEY = 'blocklucky_sound_enabled';

export const SOUNDS = {
  wheel: require('../../assets/sounds/roue-tirage.mp3') as number,
  chrono: require('../../assets/sounds/chrono.mp3') as number,
};

export const CHRONO_SECONDS = 8;

let soundEnabled = true;
let preferenceLoaded = false;
let audioModeReady: Promise<void> | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

const readStored = async (): Promise<string | null> => {
  try {
    if (Platform.OS === 'web') {
      return typeof window !== 'undefined'
        ? (window.localStorage?.getItem(SOUND_KEY) ?? null)
        : null;
    }
    if (typeof SecureStore?.getItemAsync === 'function') {
      return await SecureStore.getItemAsync(SOUND_KEY);
    }
  } catch {}
  return null;
};

const writeStored = async (value: string): Promise<void> => {
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.localStorage?.setItem(SOUND_KEY, value);
    } else if (typeof SecureStore?.setItemAsync === 'function') {
      await SecureStore.setItemAsync(SOUND_KEY, value);
    }
  } catch {}
};

const loadPreference = async () => {
  if (preferenceLoaded) return;
  preferenceLoaded = true;
  const stored = await readStored();
  if (stored === '0' && soundEnabled) {
    soundEnabled = false;
    notify();
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  loadPreference();
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => soundEnabled;

export const setSoundEnabled = (enabled: boolean) => {
  preferenceLoaded = true;
  if (soundEnabled === enabled) return;
  soundEnabled = enabled;
  notify();
  writeStored(enabled ? '1' : '0');
};

export const useSoundPreference = () => {
  const enabled = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { soundEnabled: enabled, setSoundEnabled };
};

const prepareAudio = () => {
  if (!audioModeReady) {
    audioModeReady = setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
    }).catch(() => undefined);
  }
  return audioModeReady;
};

export const useSound = (source: AudioSource) => {
  const player = useAudioPlayer(source);
  const { soundEnabled: enabled } = useSoundPreference();
  const session = useRef(0);
  const active = useRef(false);

  const play = useCallback(
    (options: { loop?: boolean } = {}) => {
      if (!soundEnabled) return;
      const current = ++session.current;
      active.current = true;
      prepareAudio().then(() => {
        if (session.current !== current || !soundEnabled) return;
        try {
          player.loop = Boolean(options.loop);
          player.seekTo(0).catch(() => undefined);
          player.play();
        } catch {}
      });
    },
    [player],
  );

  const stop = useCallback(() => {
    session.current += 1;
    if (!active.current) return;
    active.current = false;
    try {
      player.loop = false;
      player.pause();
    } catch {}
  }, [player]);

  useEffect(() => {
    if (!enabled) stop();
  }, [enabled, stop]);

  useEffect(
    () => () => {
      session.current += 1;
    },
    [],
  );

  return { play, stop };
};

export default useSound;
