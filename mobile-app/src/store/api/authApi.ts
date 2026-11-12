import { baseApi } from './baseApi';
import {
  ApiResponse,
  OnboardingSlide,
  AuthSessionResponse,
  SignInPayload,
  SignUpPayload,
  AppleSignInPayload,
  ResetPasswordPayload,
  IdentitySubmitPayload,
  Setup2FAResponse,
  Verify2FAResponse,
  UserProfile,
  ReferralInfo,
  SocialQuest,
  PushNotificationItem,
  GdprExportResponse,
} from '../../types/api.types';
import {
  AgeVerificationStatus,
  IdentityVerificationState,
  NotificationPreferences,
  UserPreferences,
} from '../../types/user.types';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOnboarding: builder.query<ApiResponse<{ slides: OnboardingSlide[] }>, void>({
      query: () => '/auth/onboarding',
    }),
    signIn: builder.mutation<ApiResponse<AuthSessionResponse>, SignInPayload>({
      query: (body) => ({
        url: '/auth/signin',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User', 'Points'],
    }),
    signUp: builder.mutation<ApiResponse<AuthSessionResponse>, SignUpPayload>({
      query: (body) => ({
        url: '/auth/signup',
        method: 'POST',
        body,
      }),
    }),
    googleSignIn: builder.mutation<ApiResponse<AuthSessionResponse>, { idToken: string }>({
      query: (body) => ({
        url: '/auth/oauth/google',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User', 'Points'],
    }),
    appleSignIn: builder.mutation<ApiResponse<AuthSessionResponse>, AppleSignInPayload>({
      query: (body) => ({
        url: '/auth/oauth/apple',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User', 'Points'],
    }),
    forgotPassword: builder.mutation<
      ApiResponse<{ sent: boolean; devOtpPreview?: string }>,
      { email: string }
    >({
      query: (body) => ({
        url: '/auth/password/forgot',
        method: 'POST',
        body,
      }),
    }),
    resetPassword: builder.mutation<ApiResponse<{ reset: boolean }>, ResetPasswordPayload>({
      query: (body) => ({
        url: '/auth/password/reset',
        method: 'POST',
        body,
      }),
    }),
    getIdentityStatus: builder.query<ApiResponse<IdentityVerificationState>, void>({
      query: () => '/user/identity',
      providesTags: ['User'],
    }),
    submitIdentity: builder.mutation<
      ApiResponse<{ status: AgeVerificationStatus; submittedAt: string }>,
      IdentitySubmitPayload
    >({
      query: (body) => ({
        url: '/user/identity',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    setup2FA: builder.mutation<ApiResponse<Setup2FAResponse>, { method: 'APP' | 'EMAIL' }>({
      query: (body) => ({
        url: '/auth/2fa/setup',
        method: 'POST',
        body,
      }),
    }),
    verify2FA: builder.mutation<ApiResponse<Verify2FAResponse>, { userId: string; code: string }>({
      query: (body) => ({
        url: '/auth/2fa/verify',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    disable2FA: builder.mutation<ApiResponse<{ isTwoFactorEnabled: boolean }>, { code?: string }>({
      query: (body) => ({
        url: '/auth/2fa/disable',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    logout: builder.mutation<ApiResponse<{ loggedOut: boolean }>, { allDevices?: boolean } | void>({
      query: (body) => ({
        url: '/auth/logout',
        method: 'POST',
        body: body ?? {},
      }),
    }),
    getProfile: builder.query<ApiResponse<{ profile: UserProfile }>, void>({
      query: () => '/user/profile',
      providesTags: ['User'],
    }),
    getReferrals: builder.query<ApiResponse<ReferralInfo>, void>({
      query: () => '/user/referrals',
      providesTags: ['User'],
    }),
    getQuests: builder.query<ApiResponse<{ quests: SocialQuest[] }>, void>({
      query: () => '/user/quests',
      providesTags: ['Quests'],
    }),
    completeQuest: builder.mutation<
      ApiResponse<{ quest: SocialQuest; pointsAwarded: number; newPointsBalance: number }>,
      { questId: string }
    >({
      query: (body) => ({
        url: '/user/quests/complete',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Quests', 'User', 'Points'],
    }),
    setResponsibleLimit: builder.mutation<
      ApiResponse<{ userId: string; maxTicketsPerRound: number }>,
      { maxTicketsPerRound: number }
    >({
      query: (body) => ({
        url: '/user/responsible-limit',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    updatePreferences: builder.mutation<
      ApiResponse<{ preferences: UserPreferences }>,
      {
        theme?: 'DARK' | 'LIGHT';
        language?: 'FR' | 'EN';
        pushNotificationsEnabled?: boolean;
        notifications?: Partial<NotificationPreferences>;
      }
    >({
      query: (body) => ({
        url: '/user/preferences',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    updateProfileNames: builder.mutation<
      ApiResponse<{ profile: { firstName: string | null; lastName: string | null } }>,
      { firstName?: string; lastName?: string }
    >({
      query: (body) => ({
        url: '/user/profile',
        method: 'PATCH',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    requestEmailChange: builder.mutation<
      ApiResponse<{ message: string; devOtpPreview?: string }>,
      { newEmail: string; password?: string }
    >({
      query: (body) => ({
        url: '/auth/email/change',
        method: 'POST',
        body,
      }),
    }),
    confirmEmailChange: builder.mutation<
      ApiResponse<{ profile: { email: string } }>,
      { code: string }
    >({
      query: (body) => ({
        url: '/auth/email/confirm',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    changePassword: builder.mutation<
      ApiResponse<AuthSessionResponse>,
      { currentPassword?: string; newPassword: string }
    >({
      query: (body) => ({
        url: '/auth/password/change',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    sendSupportMessage: builder.mutation<
      ApiResponse<{ sent: boolean }>,
      { subject: string; message: string }
    >({
      query: (body) => ({
        url: '/user/support',
        method: 'POST',
        body,
      }),
    }),
    getNotifications: builder.query<ApiResponse<{ notifications: PushNotificationItem[] }>, void>({
      query: () => '/user/notifications',
      providesTags: ['Notifications'],
    }),
    exportGdprData: builder.mutation<ApiResponse<GdprExportResponse>, void>({
      query: () => ({
        url: '/user/gdpr/export',
        method: 'GET',
      }),
    }),
    requestGdprDeletion: builder.mutation<
      ApiResponse<{
        confirmationRequired: boolean;
        emailSent: boolean;
        message: string;
        confirmationToken?: string;
      }>,
      void
    >({
      query: () => ({
        url: '/user/gdpr/delete-request',
        method: 'POST',
      }),
    }),
    confirmGdprDeletion: builder.mutation<
      ApiResponse<{ deleted: boolean; anonymized: boolean }>,
      { token: string }
    >({
      query: (body) => ({
        url: '/user/gdpr/confirm-delete',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const {
  useGetOnboardingQuery,
  useSignInMutation,
  useSignUpMutation,
  useGoogleSignInMutation,
  useAppleSignInMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useGetIdentityStatusQuery,
  useSubmitIdentityMutation,
  useSetup2FAMutation,
  useVerify2FAMutation,
  useDisable2FAMutation,
  useLogoutMutation,
  useGetProfileQuery,
  useGetReferralsQuery,
  useGetQuestsQuery,
  useCompleteQuestMutation,
  useSetResponsibleLimitMutation,
  useUpdatePreferencesMutation,
  useUpdateProfileNamesMutation,
  useRequestEmailChangeMutation,
  useConfirmEmailChangeMutation,
  useChangePasswordMutation,
  useSendSupportMessageMutation,
  useGetNotificationsQuery,
  useExportGdprDataMutation,
  useRequestGdprDeletionMutation,
  useConfirmGdprDeletionMutation,
} = authApi;
