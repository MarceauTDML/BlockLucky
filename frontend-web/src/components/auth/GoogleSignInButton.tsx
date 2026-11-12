'use client';

import React, { useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID } from '@/lib/config';
import { useAppTheme } from '@/theme/ThemeProvider';

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleIdentityApi {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode?: 'popup' | 'redirect';
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_button?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      logo_alignment?: 'left' | 'center';
      width?: number;
      locale?: string;
    }
  ) => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleIdentityApi } };
  }
}

const GSI_SRC = 'https://accounts.google.com/gsi/client';
let gsiPromise: Promise<GoogleIdentityApi> | null = null;

const loadGoogleIdentity = (): Promise<GoogleIdentityApi> => {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (gsiPromise) return gsiPromise;
  gsiPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const api = window.google?.accounts?.id;
      if (api) resolve(api);
      else reject(new Error('gsi-unavailable'));
    };
    script.onerror = () => {
      gsiPromise = null;
      reject(new Error('gsi-load-failed'));
    };
    document.head.appendChild(script);
  });
  return gsiPromise;
};

export const isGoogleSignInConfigured = GOOGLE_CLIENT_ID.length > 0;

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void;
  onError: (message: string) => void;
}

const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({ onCredential, onError }) => {
  const { mode, language, t } = useAppTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const credentialRef = useRef(onCredential);
  const errorRef = useRef(onError);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    credentialRef.current = onCredential;
    errorRef.current = onError;
  }, [onCredential, onError]);

  useEffect(() => {
    let cancelled = false;
    loadGoogleIdentity()
      .then((api) => {
        if (cancelled || !containerRef.current) return;
        api.initialize({
          client_id: GOOGLE_CLIENT_ID,
          ux_mode: 'popup',
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_button: true,
          callback: (response) => {
            if (response.credential) credentialRef.current(response.credential);
            else errorRef.current(t('Connexion Google interrompue. Réessayez.', 'Google sign-in was interrupted. Try again.'));
          },
        });
        const width = Math.min(400, Math.max(240, Math.round(containerRef.current.offsetWidth)));
        containerRef.current.innerHTML = '';
        api.renderButton(containerRef.current, {
          type: 'standard',
          theme: mode === 'DARK' ? 'filled_black' : 'outline',
          size: 'large',
          text: 'continue_with',
          shape: 'pill',
          logo_alignment: 'center',
          width,
          locale: language === 'EN' ? 'en' : 'fr',
        });
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          errorRef.current(
            t('Le service Google est inaccessible pour le moment.', 'Google sign-in is unavailable right now.')
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [language, mode, t]);

  return (
    <div className="flex min-h-[44px] w-full justify-center" aria-busy={!ready}>
      <div ref={containerRef} className="flex w-full justify-center" />
    </div>
  );
};

export default GoogleSignInButton;
