const isBrowser = typeof window !== 'undefined';

export const KEYS = {
  token: 'bl.auth.token',
  user: 'bl.auth.user',
  onboarding: 'bl.onboarding.done',
  theme: 'bl.pref.theme',
  language: 'bl.pref.language',
  utm: 'bl.utm.source',
  referral: 'bl.referral.code',
  trackingOptOut: 'bl.tracking.optout',
  partnerId: 'bl.partner.selected',
  lastClaim: 'bl.marketplace.lastClaim',
} as const;

export const storage = {
  get(key: string): string | null {
    if (!isBrowser) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    if (!isBrowser) return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
    }
  },
  remove(key: string): void {
    if (!isBrowser) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
    }
  },
  getJson<T>(key: string): T | null {
    const raw = storage.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  setJson(key: string, value: unknown): void {
    storage.set(key, JSON.stringify(value));
  },
};

export default storage;
