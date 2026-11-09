import { baseApi } from './baseApi';
import { ApiResponse } from '@/types/api.types';
import {
  AdminDashboardResponse,
  AnalyticsDashboardResponse,
  AuditLogEntry,
  CircuitBreakerResponse,
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
} = adminApi;
