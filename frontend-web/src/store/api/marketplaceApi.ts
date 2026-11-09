import { baseApi } from './baseApi';
import {
  ApiResponse,
  RewardItem,
  ClaimedRewardCode,
  PointsBalanceResponse,
} from '@/types/api.types';

export const marketplaceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCatalog: builder.query<ApiResponse<{ catalog: RewardItem[] }>, void>({
      query: () => '/marketplace/catalog',
      providesTags: ['Marketplace'],
    }),
    getRewardDetail: builder.query<
      ApiResponse<{ reward: RewardItem & { claimedCount: number } }>,
      string
    >({
      query: (rewardId) => `/marketplace/rewards/${rewardId}`,
      providesTags: ['Marketplace'],
    }),
    getPointsBalance: builder.query<ApiResponse<PointsBalanceResponse>, void>({
      query: () => '/marketplace/points',
      providesTags: ['Points'],
    }),
    claimReward: builder.mutation<
      ApiResponse<{
        claim: ClaimedRewardCode;
        remainingStock: number;
        newPointsBalance: number;
      }>,
      { rewardId: string }
    >({
      query: (body) => ({
        url: '/marketplace/claim',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Marketplace', 'Points', 'User'],
    }),
    getMyCodes: builder.query<ApiResponse<{ codes: ClaimedRewardCode[] }>, void>({
      query: () => '/marketplace/my-codes',
      providesTags: ['Marketplace'],
    }),
  }),
});

export const {
  useGetCatalogQuery,
  useGetRewardDetailQuery,
  useGetPointsBalanceQuery,
  useClaimRewardMutation,
  useGetMyCodesQuery,
} = marketplaceApi;
