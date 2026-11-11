import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import {
  setCredentials,
  setPendingTwoFactor,
  logout as logoutAction,
  completeOnboarding as completeOnboardingAction,
} from '../store/slices/authSlice';
import {
  useSocialLoginMutation,
  useVerify2FAMutation,
  useSetup2FAMutation,
  useDisable2FAMutation,
  useLogoutMutation,
} from '../store/api/authApi';
import { baseApi } from '../store/api/baseApi';
import secureStorage from '../services/secureStorage';
import { SocialLoginPayload } from '../types/api.types';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);
  const [socialLoginTrigger, { isLoading: isLoggingIn }] = useSocialLoginMutation();
  const [verify2FATrigger, { isLoading: isVerifying2FA }] = useVerify2FAMutation();
  const [setup2FATrigger, { isLoading: isSettingUp2FA }] = useSetup2FAMutation();
  const [disable2FATrigger, { isLoading: isDisabling2FA }] = useDisable2FAMutation();
  const [logoutTrigger] = useLogoutMutation();

  const loginWithSocial = useCallback(
    async (payload: SocialLoginPayload) => {
      const response = await socialLoginTrigger(payload).unwrap();
      const result = response.data;

      if (result.requiresTwoFactor && result.userId && result.twoFactorMethod) {
        dispatch(
          setPendingTwoFactor({
            userId: result.userId,
            method: result.twoFactorMethod,
          })
        );
        return {
          requiresTwoFactor: true,
          userId: result.userId,
          method: result.twoFactorMethod,
          email: result.user?.email ?? payload.email,
        };
      }

      if (result.token && result.user) {
        await secureStorage.setToken(result.token);
        await secureStorage.setUserJson(JSON.stringify(result.user));
        dispatch(setCredentials({ token: result.token, user: result.user }));
      }

      return {
        requiresTwoFactor: false,
        user: result.user,
      };
    },
    [dispatch, socialLoginTrigger]
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
    [dispatch, verify2FATrigger]
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
    [dispatch, logoutTrigger]
  );

  const signOut = useCallback(() => endSession(false), [endSession]);
  const signOutEverywhere = useCallback(() => endSession(true), [endSession]);

  const markOnboardingComplete = useCallback(() => {
    dispatch(completeOnboardingAction());
  }, [dispatch]);

  return {
    ...authState,
    isLoggingIn,
    isVerifying2FA,
    isSettingUp2FA,
    isDisabling2FA,
    loginWithSocial,
    verifyOtpCode,
    setup2FA: setup2FATrigger,
    disable2FA: disable2FATrigger,
    signOut,
    signOutEverywhere,
    markOnboardingComplete,
  };
};

export default useAuth;
