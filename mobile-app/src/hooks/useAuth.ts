import { useCallback } from 'react';

import secureStorage from '../services/secureStorage';
import { useAppDispatch, useAppSelector } from '../store';
import {
  useSignInMutation,
  useSignUpMutation,
  useGoogleSignInMutation,
  useAppleSignInMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useVerify2FAMutation,
  useSetup2FAMutation,
  useDisable2FAMutation,
  useLogoutMutation,
} from '../store/api/authApi';
import { baseApi } from '../store/api/baseApi';
import {
  setCredentials,
  setPendingTwoFactor,
  logout as logoutAction,
  completeOnboarding as completeOnboardingAction,
  updateUserProfile,
} from '../store/slices/authSlice';
import {
  AppleSignInPayload,
  AuthSessionResponse,
  ResetPasswordPayload,
  SignInPayload,
  SignUpPayload,
} from '../types/api.types';
import { AgeVerificationStatus, TwoFactorMethod, UserProfile } from '../types/user.types';

export type AuthStepResult =
  | {
      requiresTwoFactor: true;
      userId: string;
      method: TwoFactorMethod;
      email?: string | null;
      devOtpPreview?: string;
    }
  | { requiresTwoFactor: false; user?: UserProfile; isNewUser?: boolean };

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);
  const [signInTrigger, { isLoading: isSigningIn }] = useSignInMutation();
  const [signUpTrigger, { isLoading: isSigningUp }] = useSignUpMutation();
  const [googleTrigger, { isLoading: isGoogleSigningIn }] = useGoogleSignInMutation();
  const [appleTrigger, { isLoading: isAppleSigningIn }] = useAppleSignInMutation();
  const [forgotTrigger, { isLoading: isRequestingReset }] = useForgotPasswordMutation();
  const [resetTrigger, { isLoading: isResettingPassword }] = useResetPasswordMutation();
  const [verify2FATrigger, { isLoading: isVerifying2FA }] = useVerify2FAMutation();
  const [setup2FATrigger, { isLoading: isSettingUp2FA }] = useSetup2FAMutation();
  const [disable2FATrigger, { isLoading: isDisabling2FA }] = useDisable2FAMutation();
  const [logoutTrigger] = useLogoutMutation();

  const applySession = useCallback(
    async (result: AuthSessionResponse, email?: string | null): Promise<AuthStepResult> => {
      if (result.requiresTwoFactor && result.userId) {
        const method: TwoFactorMethod = result.twoFactorMethod ?? 'EMAIL';
        dispatch(setPendingTwoFactor({ userId: result.userId, method }));
        return {
          requiresTwoFactor: true,
          userId: result.userId,
          method,
          email: result.user?.email ?? email,
          devOtpPreview: result.devOtpPreview,
        };
      }

      if (result.token && result.user) {
        await secureStorage.setToken(result.token);
        await secureStorage.setUserJson(JSON.stringify(result.user));
        dispatch(setCredentials({ token: result.token, user: result.user }));
      }

      return { requiresTwoFactor: false, user: result.user, isNewUser: result.isNewUser };
    },
    [dispatch],
  );

  const signInWithPassword = useCallback(
    async (payload: SignInPayload) => {
      const response = await signInTrigger(payload).unwrap();
      return applySession(response.data, payload.email);
    },
    [applySession, signInTrigger],
  );

  const signUpWithPassword = useCallback(
    async (payload: SignUpPayload) => {
      const response = await signUpTrigger(payload).unwrap();
      return applySession(response.data, payload.email);
    },
    [applySession, signUpTrigger],
  );

  const signInWithGoogle = useCallback(
    async (idToken: string) => {
      const response = await googleTrigger({ idToken }).unwrap();
      return applySession(response.data);
    },
    [applySession, googleTrigger],
  );

  const signInWithApple = useCallback(
    async (payload: AppleSignInPayload) => {
      const response = await appleTrigger(payload).unwrap();
      return applySession(response.data);
    },
    [applySession, appleTrigger],
  );

  const requestPasswordReset = useCallback(
    async (email: string) => {
      const response = await forgotTrigger({ email }).unwrap();
      return response.data;
    },
    [forgotTrigger],
  );

  const resetPassword = useCallback(
    async (payload: ResetPasswordPayload) => {
      const response = await resetTrigger(payload).unwrap();
      return response.data;
    },
    [resetTrigger],
  );

  const setAgeVerificationStatus = useCallback(
    async (status: AgeVerificationStatus) => {
      const current = authState.user;
      if (!current || current.ageVerificationStatus === status) return;
      const next = { ...current, ageVerificationStatus: status };
      dispatch(updateUserProfile({ ageVerificationStatus: status }));
      await secureStorage.setUserJson(JSON.stringify(next));
    },
    [authState.user, dispatch],
  );

  const verifyOtpCode = useCallback(
    async (userId: string, code: string) => {
      const response = await verify2FATrigger({ userId, code }).unwrap();
      const result = response.data;

      if (result.token && result.user) {
        await secureStorage.setToken(result.token);
        await secureStorage.setUserJson(JSON.stringify(result.user));
        dispatch(setCredentials({ token: result.token, user: result.user }));
      }

      return result;
    },
    [dispatch, verify2FATrigger],
  );

  const patchUser = useCallback(
    async (patch: Partial<UserProfile>) => {
      const current = authState.user;
      if (!current) return;
      dispatch(updateUserProfile(patch));
      await secureStorage.setUserJson(JSON.stringify({ ...current, ...patch }));
    },
    [authState.user, dispatch],
  );

  const applyRenewedSession = useCallback(
    async (result: AuthSessionResponse) => {
      if (!result.token) return;
      const user = { ...(authState.user ?? {}), ...(result.user ?? {}) } as UserProfile;
      await secureStorage.setToken(result.token);
      await secureStorage.setUserJson(JSON.stringify(user));
      dispatch(setCredentials({ token: result.token, user }));
    },
    [authState.user, dispatch],
  );

  const endSession = useCallback(
    async (allDevices: boolean) => {
      try {
        await logoutTrigger({ allDevices }).unwrap();
      } catch {}
      await secureStorage.clearSession();
      dispatch(logoutAction());
      dispatch(baseApi.util.resetApiState());
    },
    [dispatch, logoutTrigger],
  );

  const signOut = useCallback(() => endSession(false), [endSession]);
  const signOutEverywhere = useCallback(() => endSession(true), [endSession]);

  const markOnboardingComplete = useCallback(() => {
    dispatch(completeOnboardingAction());
  }, [dispatch]);

  return {
    ...authState,
    hasPassword: Boolean(authState.user?.hasPassword),
    ageVerificationStatus: (authState.user?.ageVerificationStatus ??
      'NONE') as AgeVerificationStatus,
    isAgeVerified: authState.user?.ageVerificationStatus === 'VERIFIED',
    isLoggingIn: isSigningIn || isGoogleSigningIn || isAppleSigningIn,
    isSigningIn,
    isSigningUp,
    isGoogleSigningIn,
    isAppleSigningIn,
    isRequestingReset,
    isResettingPassword,
    isVerifying2FA,
    isSettingUp2FA,
    isDisabling2FA,
    signInWithPassword,
    signUpWithPassword,
    signInWithGoogle,
    signInWithApple,
    requestPasswordReset,
    resetPassword,
    setAgeVerificationStatus,
    patchUser,
    applyRenewedSession,
    verifyOtpCode,
    setup2FA: setup2FATrigger,
    disable2FA: disable2FATrigger,
    signOut,
    signOutEverywhere,
    markOnboardingComplete,
  };
};

export default useAuth;
