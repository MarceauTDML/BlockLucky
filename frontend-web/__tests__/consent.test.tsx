import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import ConsentBanner from '@/components/layout/ConsentBanner';
import { captureUtmSource, getUtmSource, rememberUtmSource, trackEvent } from '@/lib/analytics';
import {
  CONSENT_VALIDITY_MS,
  closeConsentManager,
  getConsentRecord,
  getConsentState,
  hasAudienceConsent,
  openConsentManager,
  setAudienceConsent,
} from '@/lib/consent';
import { KEYS } from '@/lib/storage';
import ThemeProvider from '@/theme/ThemeProvider';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/',
}));

const fetchMock = vi.fn(() => Promise.resolve(new Response('{}')));

beforeEach(() => {
  window.localStorage.clear();
  closeConsentManager();
  fetchMock.mockClear();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('consentement à la mesure d’audience', () => {
  it('ne mesure rien et ne stocke aucune origine avant un choix', () => {
    expect(getConsentState()).toBe('unknown');
    expect(captureUtmSource('?utm_source=affiche')).toBe('affiche');
    expect(window.localStorage.getItem(KEYS.utm)).toBeNull();
    expect(getUtmSource()).toBe('web_direct');
    trackEvent('landing_view');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('enregistre l’origine en attente et mesure après acceptation', () => {
    captureUtmSource('?utm_source=Affiche');
    setAudienceConsent(true);
    expect(hasAudienceConsent()).toBe(true);
    expect(window.localStorage.getItem(KEYS.utm)).toBe('affiche');
    expect(getUtmSource()).toBe('affiche');
    trackEvent('landing_view');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('mémorise le choix avec sa date et efface l’origine au refus', () => {
    setAudienceConsent(true);
    captureUtmSource('?utm_source=instagram');
    const record = setAudienceConsent(false);
    expect(record.audience).toBe('denied');
    expect(Number.isNaN(Date.parse(record.date))).toBe(false);
    expect(getConsentRecord()?.audience).toBe('denied');
    expect(window.localStorage.getItem(KEYS.utm)).toBeNull();
    trackEvent('rules_view');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('redemande le choix après sa durée de validité', () => {
    setAudienceConsent(true);
    const later = Date.now() + CONSENT_VALIDITY_MS + 1000;
    expect(getConsentRecord(later)).toBeNull();
  });

  it('conserve le code de parrainage sans accord mais pas l’origine', () => {
    window.localStorage.setItem(KEYS.referral, 'AMI-1234');
    rememberUtmSource('referral', true);
    expect(window.localStorage.getItem(KEYS.referral)).toBe('AMI-1234');
    expect(window.localStorage.getItem(KEYS.utm)).toBeNull();
  });

  it('traite l’ancienne opposition comme un refus', () => {
    window.localStorage.setItem(KEYS.trackingOptOut, '1');
    expect(getConsentState()).toBe('denied');
  });
});

describe('ConsentBanner', () => {
  const renderBanner = () =>
    render(
      <ThemeProvider>
        <ConsentBanner />
      </ThemeProvider>
    );

  it('propose refuser et accepter au même niveau au premier accès', () => {
    renderBanner();
    const refuse = screen.getByRole('button', { name: 'Tout refuser' });
    const accept = screen.getByRole('button', { name: 'Tout accepter' });
    expect(refuse.className).toBe(accept.className);
    expect(screen.getByRole('link', { name: 'Politique relative aux traceurs' })).toHaveAttribute(
      'href',
      '/traceurs'
    );
    fireEvent.click(refuse);
    expect(getConsentState()).toBe('denied');
    expect(screen.queryByRole('button', { name: 'Tout refuser' })).toBeNull();
  });

  it('se rouvre depuis « Gérer mes traceurs » pour changer d’avis', () => {
    setAudienceConsent(false);
    renderBanner();
    expect(screen.queryByRole('button', { name: 'Tout accepter' })).toBeNull();
    act(() => openConsentManager());
    fireEvent.click(screen.getByRole('button', { name: 'Tout accepter' }));
    expect(getConsentState()).toBe('granted');
  });
});
