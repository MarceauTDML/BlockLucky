import { baseApi } from './baseApi';
import {
  ApiResponse,
  OnboardingSlide,
  SocialLoginPayload,
  SocialLoginResponse,
  Setup2FAResponse,
  Verify2FAResponse,
  UserProfile,
  ReferralInfo,
  SocialQuest,
  PushNotificationItem,
  GdprExportResponse,
} from '../../types/api.types';

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getOnboarding: builder.query<ApiResponse<{ slides: OnboardingSlide[] }>, void>({
      query: () => '/auth/onboarding',
    }),
    socialLogin: builder.mutation<ApiResponse<SocialLoginResponse>, SocialLoginPayload>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User', 'Points'],
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
      ApiResponse<{ preferences: { theme: string; language: string; pushNotificationsEnabled: boolean } }>,
      { theme?: 'DARK' | 'LIGHT'; language?: 'FR' | 'EN'; pushNotificationsEnabled?: boolean }
    >({
      query: (body) => ({
        url: '/user/preferences',
        method: 'PUT',
        body,
      }),
      invalidatesTags: ['User'],
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
      ApiResponse<{ confirmationRequired: boolean; emailSent: boolean; message: string; confirmationToken?: string }>,
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
  useSocialLoginMutation,
  useSetup2FAMutation,
  useVerify2FAMutation,
  useDisable2FAMutation,
  useGetProfileQuery,
  useGetReferralsQuery,
  useGetQuestsQuery,
  useCompleteQuestMutation,
  useSetResponsibleLimitMutation,
  useUpdatePreferencesMutation,
  useGetNotificationsQuery,
  useExportGdprDataMutation,
  useRequestGdprDeletionMutation,
  useConfirmGdprDeletionMutation,
} = authApi;
