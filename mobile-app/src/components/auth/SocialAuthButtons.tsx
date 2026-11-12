import * as AppleAuthentication from 'expo-apple-authentication';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { getErrorMessage, getErrorStatus } from './authErrors';
import useAppTheme from '../../hooks/useAppTheme';
import useAuth, { AuthStepResult } from '../../hooks/useAuth';
import AppButton from '../ui/AppButton';
import AppText from '../ui/AppText';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_IDS = {
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || undefined,
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || undefined,
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || undefined,
};

const platformGoogleClientId =
  Platform.OS === 'ios'
    ? GOOGLE_CLIENT_IDS.ios
    : Platform.OS === 'android'
      ? GOOGLE_CLIENT_IDS.android
      : GOOGLE_CLIENT_IDS.web;

export interface SocialAuthButtonsProps {
  onResult: (result: AuthStepResult) => void;
  onError: (message: string) => void;
  canStart?: () => boolean;
}

interface GoogleButtonProps {
  title: string;
  busy: boolean;
  disabled: boolean;
  onStart: () => boolean;
  onIdToken: (idToken: string) => void;
  onFailure: () => void;
}

const GoogleButton: React.FC<GoogleButtonProps> = ({
  title,
  busy,
  disabled,
  onStart,
  onIdToken,
  onFailure,
}) => {
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: GOOGLE_CLIENT_IDS.ios,
    androidClientId: GOOGLE_CLIENT_IDS.android,
    webClientId: GOOGLE_CLIENT_IDS.web,
    selectAccount: true,
  });
  const handled = useRef<typeof response>(null);

  useEffect(() => {
    if (!response || handled.current === response) return;
    handled.current = response;
    if (response.type === 'success') {
      const idToken = response.params?.id_token ?? response.authentication?.idToken;
      if (idToken) onIdToken(idToken);
      else onFailure();
    } else if (response.type === 'error') {
      onFailure();
    }
  }, [response, onIdToken, onFailure]);

  return (
    <AppButton
      title={title}
      variant="outline"
      leftIcon="google"
      loading={busy}
      disabled={disabled || !request}
      onPress={() => {
        if (!onStart()) return;
        promptAsync().catch(onFailure);
      }}
    />
  );
};

export const SocialAuthButtons: React.FC<SocialAuthButtonsProps> = ({
  onResult,
  onError,
  canStart,
}) => {
  const { colors, t } = useAppTheme();
  const { signInWithGoogle, signInWithApple, isGoogleSigningIn, isAppleSigningIn } = useAuth();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [googleUnavailable, setGoogleUnavailable] = useState<string | null>(
    platformGoogleClientId
      ? null
      : t(
          'Connexion Google non configurée sur cette application.',
          'Google sign-in is not configured for this app.',
        ),
  );
  const [appleUnavailable, setAppleUnavailable] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync()
        .then((available) => {
          if (mounted) setAppleAvailable(available);
        })
        .catch(() => undefined);
    }
    return () => {
      mounted = false;
    };
  }, []);

  const start = useCallback(() => (canStart ? canStart() : true), [canStart]);

  const handleGoogleToken = useCallback(
    async (idToken: string) => {
      try {
        onResult(await signInWithGoogle(idToken));
      } catch (error) {
        const message = getErrorMessage(
          error,
          t('Connexion Google impossible. Réessayez.', 'Google sign-in failed. Try again.'),
        );
        if (getErrorStatus(error) === 503) setGoogleUnavailable(message);
        else onError(message);
      }
    },
    [onError, onResult, signInWithGoogle, t],
  );

  const handleGoogleFailure = useCallback(() => {
    onError(
      t('Connexion Google interrompue. Réessayez.', 'Google sign-in was interrupted. Try again.'),
    );
  }, [onError, t]);

  const handleApple = useCallback(async () => {
    if (!start()) return;
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        onError(
          t(
            'Apple n’a pas renvoyé de jeton. Réessayez.',
            'Apple did not return a token. Try again.',
          ),
        );
        return;
      }
      const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ');
      onResult(
        await signInWithApple({
          identityToken: credential.identityToken,
          ...(fullName ? { fullName } : {}),
        }),
      );
    } catch (error) {
      if ((error as { code?: string })?.code === 'ERR_REQUEST_CANCELED') return;
      const message = getErrorMessage(
        error,
        t('Connexion Apple impossible. Réessayez.', 'Apple sign-in failed. Try again.'),
      );
      if (getErrorStatus(error) === 503) setAppleUnavailable(message);
      else onError(message);
    }
  }, [onError, onResult, signInWithApple, start, t]);

  const googleTitle = t('Continuer avec Google', 'Continue with Google');
  const busy = isGoogleSigningIn || isAppleSigningIn;

  return (
    <View style={styles.list}>
      {platformGoogleClientId && !googleUnavailable ? (
        <GoogleButton
          title={googleTitle}
          busy={isGoogleSigningIn}
          disabled={busy}
          onStart={start}
          onIdToken={handleGoogleToken}
          onFailure={handleGoogleFailure}
        />
      ) : (
        <AppButton
          title={googleTitle}
          variant="outline"
          leftIcon="google"
          disabled
          onPress={() => undefined}
        />
      )}
      {googleUnavailable ? (
        <AppText size={11} color={colors.inkMuted} align="center">
          {googleUnavailable}
        </AppText>
      ) : null}

      {appleAvailable ? (
        <>
          <AppButton
            title={t('Continuer avec Apple', 'Continue with Apple')}
            variant="dark"
            leftIcon="apple"
            loading={isAppleSigningIn}
            disabled={busy || Boolean(appleUnavailable)}
            onPress={handleApple}
          />
          {appleUnavailable ? (
            <AppText size={11} color={colors.inkMuted} align="center">
              {appleUnavailable}
            </AppText>
          ) : null}
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    gap: 14,
  },
});

export default SocialAuthButtons;
