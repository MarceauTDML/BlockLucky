'use client';

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  logout as logoutAction,
  setCredentials,
  setPendingTwoFactor,
} from '@/store/slices/authSlice';
import {
  authApi,
  useDisable2FAMutation,
  useGoogleSignInMutation,
  useLogoutMutation,
  useSetup2FAMutation,
  useSocialLoginMutation,
  useVerify2FAMutation,
} from '@/store/api/authApi';
import { baseApi } from '@/store/api/baseApi';
import storage, { KEYS } from '@/lib/storage';
import socketClient from '@/lib/socket';
import { SocialLoginPayload, SocialLoginResponse } from '@/types/api.types';
import { Role, UserProfile } from '@/types/user.types';

export const homeForRole = (role?: Role | null): string => {
  if (role === 'ADMIN') return '/mairie';
  if (role === 'PARTNER') return '/partenaire';
  return '/accueil';
};

const persistSession = (token: string, user: UserProfile) => {
  storage.set(KEYS.token, token);
  storage.setJson(KEYS.user, user);
};

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);
  const [socialLoginTrigger, { isLoading: isSocialLoggingIn }] = useSocialLoginMutation();
  const [googleSignInTrigger, { isLoading: isGoogleSigningIn }] = useGoogleSignInMutation();
  const isLoggingIn = isSocialLoggingIn || isGoogleSigningIn;
  const [verify2FATrigger, { isLoading: isVerifying2FA }] = useVerify2FAMutation();
  const [setup2FATrigger, { isLoading: isSettingUp2FA }] = useSetup2FAMutation();
  const [disable2FATrigger, { isLoading: isDisabling2FA }] = useDisable2FAMutation();
  const [logoutTrigger] = useLogoutMutation();

  const refreshProfile = useCallback(
    async (token: string, baseUser: UserProfile) => {
      try {
        const res = await dispatch(
          authApi.endpoints.getProfile.initiate(undefined, { forceRefetch: true })
        ).unwrap();
        const merged = { ...baseUser, ...res.data.profile };
        persistSession(token, merged);
        dispatch(setCredentials({ token, user: merged }));
        return merged;
      } catch {
        return baseUser;
      }
    },
    [dispatch]
  );

  const applyLoginResult = useCallback(
    async (result: SocialLoginResponse, fallbackEmail?: string) => {
      if (result.requiresTwoFactor && result.userId && result.twoFactorMethod) {
        dispatch(
          setPendingTwoFactor({
            userId: result.userId,
            method: result.twoFactorMethod,
            email: result.user?.email ?? fallbackEmail,
            loginTicket: result.loginTicket,
          })
        );
        return { requiresTwoFactor: true as const, user: result.user };
      }

      if (result.token && result.user) {
        persistSession(result.token, result.user);
        dispatch(setCredentials({ token: result.token, user: result.user }));
        const user = await refreshProfile(result.token, result.user);
        return { requiresTwoFactor: false as const, user, isNewUser: result.isNewUser };
      }

      return { requiresTwoFactor: false as const, user: result.user };
    },
    [dispatch, refreshProfile]
  );

  const loginWithSocial = useCallback(
    async (payload: SocialLoginPayload) => {
      const response = await socialLoginTrigger(payload).unwrap();
      return applyLoginResult(response.data, payload.email);
    },
    [applyLoginResult, socialLoginTrigger]
  );

  const loginWithGoogle = useCallback(
    async (idToken: string) => {
      const response = await googleSignInTrigger({ idToken }).unwrap();
      return applyLoginResult(response.data);
    },
    [applyLoginResult, googleSignInTrigger]
  );

  const verifyOtpCode = useCallback(
    async (userId: string, code: string, loginTicket?: string | null) => {
      const response = await verify2FATrigger({
        userId,
        code,
        ...(loginTicket ? { loginTicket } : {}),
      }).unwrap();
      const result = response.data;
      if (result.requiresTwoFactor && result.userId && result.loginTicket) {
        dispatch(
          setPendingTwoFactor({
            userId: result.userId,
            method: result.twoFactorMethod ?? 'APP',
            email: authState.pendingTwoFactorEmail,
            loginTicket: result.loginTicket,
          })
        );
        return result;
      }
      if (result.token && result.user) {
        const merged = { ...(authState.user || {}), ...result.user } as UserProfile;
        persistSession(result.token, merged);
        dispatch(setCredentials({ token: result.token, user: merged }));
        await refreshProfile(result.token, merged);
      }
      return result;
    },
    [authState.pendingTwoFactorEmail, authState.user, dispatch, refreshProfile, verify2FATrigger]
  );

  const endSession = useCallback(
    (allDevices: boolean) => {
      if (authState.token) {
        logoutTrigger({ token: authState.token, allDevices })
          .unwrap()
          .catch(() => undefined);
      }
      storage.remove(KEYS.token);
      storage.remove(KEYS.user);
      storage.remove(KEYS.lastClaim);
      socketClient.disconnect();
      dispatch(logoutAction());
      dispatch(baseApi.util.resetApiState());
    },
    [authState.token, dispatch, logoutTrigger]
  );

  const signOut = useCallback(() => endSession(false), [endSession]);
  const signOutEverywhere = useCallback(() => endSession(true), [endSession]);

  return {
    ...authState,
    isLoggingIn,
    isVerifying2FA,
    isSettingUp2FA,
    isDisabling2FA,
    isGoogleSigningIn,
    loginWithSocial,
    loginWithGoogle,
    verifyOtpCode,
    setup2FA: setup2FATrigger,
    disable2FA: disable2FATrigger,
    signOut,
    signOutEverywhere,
  };
};

export default useAuth;
