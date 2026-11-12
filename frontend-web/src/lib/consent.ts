import storage, { KEYS } from './storage';

export type ConsentChoice = 'granted' | 'denied';
export type ConsentState = ConsentChoice | 'unknown';

export interface ConsentRecord {
  audience: ConsentChoice;
  date: string;
  version: number;
}

export const CONSENT_VERSION = 1;
export const CONSENT_VALIDITY_MS = 182 * 24 * 60 * 60 * 1000;

const listeners = new Set<() => void>();
let managerOpen = false;

const notify = () => listeners.forEach((listener) => listener());

export const subscribeConsent = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const isValidRecord = (value: unknown): value is ConsentRecord => {
  if (!value || typeof value !== 'object') return false;
  const record = value as Partial<ConsentRecord>;
  return (
    (record.audience === 'granted' || record.audience === 'denied') &&
    typeof record.date === 'string' &&
    !Number.isNaN(Date.parse(record.date)) &&
    record.version === CONSENT_VERSION
  );
};

export const getConsentRecord = (now: number = Date.now()): ConsentRecord | null => {
  const record = storage.getJson<unknown>(KEYS.consent);
  if (!isValidRecord(record)) return null;
  if (now - Date.parse(record.date) > CONSENT_VALIDITY_MS) return null;
  return record;
};

export const getConsentState = (): ConsentState => {
  const record = getConsentRecord();
  if (record) return record.audience;
  if (storage.get(KEYS.trackingOptOut) === '1') return 'denied';
  return 'unknown';
};

export const hasAudienceConsent = (): boolean => getConsentState() === 'granted';

const choiceHandlers = new Set<(choice: ConsentChoice) => void>();

export const onConsentChoice = (handler: (choice: ConsentChoice) => void): (() => void) => {
  choiceHandlers.add(handler);
  return () => {
    choiceHandlers.delete(handler);
  };
};

export const setAudienceConsent = (granted: boolean): ConsentRecord => {
  const record: ConsentRecord = {
    audience: granted ? 'granted' : 'denied',
    date: new Date().toISOString(),
    version: CONSENT_VERSION,
  };
  storage.setJson(KEYS.consent, record);
  storage.remove(KEYS.trackingOptOut);
  if (!granted) storage.remove(KEYS.utm);
  managerOpen = false;
  choiceHandlers.forEach((handler) => handler(record.audience));
  notify();
  return record;
};

export const isConsentManagerOpen = (): boolean => managerOpen;

export const openConsentManager = (): void => {
  managerOpen = true;
  notify();
};

export const closeConsentManager = (): void => {
  managerOpen = false;
  notify();
};

export const discardAudienceDataWithoutConsent = (): void => {
  if (!hasAudienceConsent()) storage.remove(KEYS.utm);
};
