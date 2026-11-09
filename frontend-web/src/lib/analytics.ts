import { API_BASE_URL } from './config';
import storage, { KEYS } from './storage';

export type FunnelEvent =
  | 'landing_view'
  | 'rules_view'
  | 'access_started'
  | 'ticket_submitted'
  | 'ticket_confirmed'
  | 'result_view';

const ALLOWED_UTM = /^[a-z0-9_\-.]{1,40}$/i;

export const captureUtmSource = (search: string): string | null => {
  try {
    const params = new URLSearchParams(search);
    const utm = params.get('utm_source');
    if (utm && ALLOWED_UTM.test(utm)) {
      storage.set(KEYS.utm, utm.toLowerCase());
      return utm.toLowerCase();
    }
  } catch {
  }
  return null;
};

export const getUtmSource = (): string => storage.get(KEYS.utm) || 'web_direct';

export const isTrackingOptedOut = (): boolean => storage.get(KEYS.trackingOptOut) === '1';

export const setTrackingOptOut = (optOut: boolean): void => {
  if (optOut) storage.set(KEYS.trackingOptOut, '1');
  else storage.remove(KEYS.trackingOptOut);
};

export const trackEvent = (
  eventType: FunnelEvent | string,
  metadata: Record<string, unknown> = {}
): void => {
  if (typeof window === 'undefined' || isTrackingOptedOut()) return;
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
