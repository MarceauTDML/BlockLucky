import { API_BASE_URL } from './config';
import { hasAudienceConsent, onConsentChoice, setAudienceConsent } from './consent';
import storage, { KEYS } from './storage';

export type FunnelEvent =
  | 'landing_view'
  | 'rules_view'
  | 'access_started'
  | 'ticket_submitted'
  | 'ticket_confirmed'
  | 'result_view';

const ALLOWED_UTM = /^[a-z0-9_\-.]{1,40}$/i;

let pendingUtm: string | null = null;

onConsentChoice((choice) => {
  if (choice === 'granted' && pendingUtm && !storage.get(KEYS.utm)) {
    storage.set(KEYS.utm, pendingUtm);
  }
  pendingUtm = null;
});

export const rememberUtmSource = (source: string, onlyIfEmpty = false): string | null => {
  if (!ALLOWED_UTM.test(source)) return null;
  const value = source.toLowerCase();
  if (hasAudienceConsent()) {
    if (onlyIfEmpty && storage.get(KEYS.utm)) return storage.get(KEYS.utm);
    storage.set(KEYS.utm, value);
  } else if (!onlyIfEmpty || !pendingUtm) {
    pendingUtm = value;
  }
  return value;
};

export const captureUtmSource = (search: string): string | null => {
  try {
    const utm = new URLSearchParams(search).get('utm_source');
    if (utm) return rememberUtmSource(utm);
  } catch {
  }
  return null;
};

export const getUtmSource = (): string => {
  if (!hasAudienceConsent()) return 'web_direct';
  return storage.get(KEYS.utm) || 'web_direct';
};

export const isTrackingOptedOut = (): boolean => !hasAudienceConsent();

export const setTrackingOptOut = (optOut: boolean): void => {
  setAudienceConsent(!optOut);
};

export const trackEvent = (
  eventType: FunnelEvent | string,
  metadata: Record<string, unknown> = {}
): void => {
  if (typeof window === 'undefined' || !hasAudienceConsent()) return;
  const token = storage.get(KEYS.token);
  const body = JSON.stringify({
    eventType,
    utmSource: getUtmSource(),
    metadata: { ...metadata, platform: 'WEB', path: window.location.pathname },
  });
  try {
    void fetch(`${API_BASE_URL}/analytics/track`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body,
    }).catch(() => undefined);
  } catch {
  }
};
