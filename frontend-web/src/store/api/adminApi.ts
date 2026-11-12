import { baseApi } from './baseApi';
import { ApiResponse } from '@/types/api.types';
import {
  AdminDashboardResponse,
  AnalyticsDashboardResponse,
  AuditLogEntry,
  CircuitBreakerResponse,
  IdentityDecisionResponse,
  IdentityVerificationDetail,
  IdentityVerificationStatus,
  IdentityVerificationSummary,
  ReportExportResponse,
  TreasuryWithdrawResponse,
} from '@/types/admin.types';
import { PartnerRecord } from '@/types/partner.types';

export const adminApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAdminDashboard: builder.query<ApiResponse<AdminDashboardResponse>, void>({
      query: () => '/admin/dashboard',
      providesTags: ['Admin'],
    }),
    getAnalyticsDashboard: builder.query<ApiResponse<AnalyticsDashboardResponse>, void>({
      query: () => '/analytics/dashboard',
      providesTags: ['Admin'],
    }),
    toggleCircuitBreaker: builder.mutation<
      ApiResponse<CircuitBreakerResponse>,
      { paused: boolean; reason?: string }
    >({
      query: (body) => ({ url: '/admin/circuit-breaker', method: 'POST', body }),
      invalidatesTags: ['Admin', 'Audit', 'Lottery'],
    }),
    withdrawTreasury: builder.mutation<
      ApiResponse<TreasuryWithdrawResponse>,
      { multisigWallet: string; amountEth: number; note?: string }
    >({
      query: (body) => ({ url: '/admin/treasury/withdraw', method: 'POST', body }),
      invalidatesTags: ['Admin', 'Audit'],
    }),
    setPartnerStatus: builder.mutation<
      ApiResponse<{ partner: PartnerRecord }>,
      { partnerId: string; isActive: boolean }
    >({
      query: ({ partnerId, isActive }) => ({
        url: `/admin/partners/${partnerId}/status`,
        method: 'PATCH',
        body: { isActive },
      }),
      invalidatesTags: ['Partners', 'Audit', 'Admin', 'Marketplace'],
    }),
    getAuditLogs: builder.query<ApiResponse<{ logs: AuditLogEntry[] }>, { limit?: number } | void>({
      query: (params) => ({ url: '/admin/audit-logs', params: params || { limit: 100 } }),
      providesTags: ['Audit'],
    }),
    getIdentityVerifications: builder.query<
      ApiResponse<{ verifications: IdentityVerificationSummary[] }>,
      { status: IdentityVerificationStatus; page?: number; limit?: number }
    >({
      query: (params) => ({ url: '/admin/identity-verifications', params }),
      providesTags: ['Identity'],
    }),
    getIdentityVerification: builder.query<ApiResponse<{ verification: IdentityVerificationDetail }>, string>({
      query: (id) => `/admin/identity-verifications/${id}`,
      keepUnusedDataFor: 0,
    }),
    decideIdentityVerification: builder.mutation<
      ApiResponse<{ decision: IdentityDecisionResponse }>,
      { id: string; approved: boolean; note?: string }
    >({
      query: ({ id, ...body }) => ({ url: `/admin/identity-verifications/${id}/decision`, method: 'POST', body }),
      invalidatesTags: ['Identity', 'Audit'],
    }),
    exportReport: builder.mutation<ApiResponse<ReportExportResponse>, { format: 'CSV' | 'PDF' }>({
      query: ({ format }) => ({ url: '/admin/reports/export', params: { format } }),
      invalidatesTags: ['Audit'],
    }),
  }),
});

export const {
  useGetAdminDashboardQuery,
  useGetAnalyticsDashboardQuery,
  useToggleCircuitBreakerMutation,
  useWithdrawTreasuryMutation,
  useSetPartnerStatusMutation,
  useGetAuditLogsQuery,
  useExportReportMutation,
  useGetIdentityVerificationsQuery,
  useGetIdentityVerificationQuery,
  useDecideIdentityVerificationMutation,
} = adminApi;
