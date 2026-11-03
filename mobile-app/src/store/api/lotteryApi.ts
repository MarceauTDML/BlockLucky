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
} from '../../types/api.types';

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
      invalidatesTags: ['Lottery', 'User', 'Points'],
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
      invalidatesTags: ['Lottery', 'User', 'Points'],
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
} = lotteryApi;
