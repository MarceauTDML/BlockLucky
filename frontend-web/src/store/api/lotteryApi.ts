import { baseApi } from './baseApi';
import {
  ApiResponse,
  LotteryStatusResponse,
  BuyTicketResponse,
  GiftTicketResponse,
  LeaderboardEntry,
  TransparencyCharter,
  TicketItem,
  PoapBadge,
  WalletInfo,
  ClaimPrizeResponse,
} from '@/types/api.types';
import { DrawResponse, RefundResponse } from '@/types/admin.types';

export const lotteryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLotteryStatus: builder.query<ApiResponse<LotteryStatusResponse>, void>({
      query: () => '/lottery/status',
      providesTags: ['Lottery'],
    }),
    getLeaderboard: builder.query<ApiResponse<{ leaderboard: LeaderboardEntry[] }>, void>({
      query: () => '/lottery/leaderboard',
      providesTags: ['Lottery'],
    }),
    getTransparencyCharter: builder.query<ApiResponse<TransparencyCharter>, void>({
      query: () => '/lottery/transparency-charter',
    }),
    getMyTransactions: builder.query<
      ApiResponse<{
        walletAddress: string;
        tickets: TicketItem[];
        poapBadges: PoapBadge[];
        total: number;
      }>,
      { page?: number; limit?: number } | void
    >({
      query: (params) => ({
        url: '/lottery/my-tickets',
        params: params || { page: 1, limit: 25 },
      }),
      providesTags: ['Lottery'],
    }),
    buyTicket: builder.mutation<
      ApiResponse<BuyTicketResponse>,
      { roundId?: string; quantity?: number; retryAttempt?: number }
    >({
      query: (body) => ({
        url: '/lottery/buy',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Lottery', 'User', 'Points', 'Wallet'],
    }),
    giftTicket: builder.mutation<
      ApiResponse<GiftTicketResponse>,
      { recipientEmail: string; recipientWallet?: string; personalMessage?: string }
    >({
      query: (body) => ({
        url: '/lottery/gift',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Lottery', 'User', 'Points', 'Wallet'],
    }),
    getWallet: builder.query<ApiResponse<WalletInfo>, void>({
      query: () => '/lottery/wallet',
      providesTags: ['Wallet'],
    }),
    claimPrize: builder.mutation<ApiResponse<ClaimPrizeResponse>, { contractRoundId: number }>({
      query: (body) => ({
        url: '/lottery/claim-prize',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Lottery', 'Wallet'],
    }),
    triggerDraw: builder.mutation<ApiResponse<DrawResponse>, { roundId?: string } | void>({
      query: (body) => ({ url: '/lottery/draw', method: 'POST', body: body || {} }),
      invalidatesTags: ['Lottery', 'Admin'],
    }),
    refundRound: builder.mutation<ApiResponse<RefundResponse>, { roundId?: string } | void>({
      query: (body) => ({ url: '/lottery/refund', method: 'POST', body: body || {} }),
      invalidatesTags: ['Lottery', 'Admin'],
    }),
  }),
});

export const {
  useGetLotteryStatusQuery,
  useGetLeaderboardQuery,
  useGetTransparencyCharterQuery,
  useGetMyTransactionsQuery,
  useBuyTicketMutation,
  useGiftTicketMutation,
  useGetWalletQuery,
  useClaimPrizeMutation,
  useTriggerDrawMutation,
  useRefundRoundMutation,
} = lotteryApi;
