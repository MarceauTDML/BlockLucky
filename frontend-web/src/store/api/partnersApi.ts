import { baseApi } from './baseApi';
import { ApiResponse } from '@/types/api.types';
import {
  CreateOfferPayload,
  PartnerConsumptionResponse,
  PartnerOffer,
  PartnerRecord,
  PartnerWithRewards,
  UploadCodesResponse,
} from '@/types/partner.types';

export const partnersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPartners: builder.query<ApiResponse<{ partners: PartnerWithRewards[] }>, void>({
      query: () => '/partners',
      providesTags: ['Partners'],
    }),
    createPartner: builder.mutation<
      ApiResponse<{ partner: PartnerRecord }>,
      { name: string; logoUrl?: string }
    >({
      query: (body) => ({ url: '/partners', method: 'POST', body }),
      invalidatesTags: ['Partners'],
    }),
    createOffer: builder.mutation<ApiResponse<{ offer: PartnerOffer }>, CreateOfferPayload>({
      query: (body) => ({ url: '/partners/offers', method: 'POST', body }),
      invalidatesTags: ['Partners', 'Marketplace'],
    }),
    uploadCodes: builder.mutation<
      ApiResponse<UploadCodesResponse>,
      { rewardId: string; codes?: string[]; csvContent?: string }
    >({
      query: (body) => ({ url: '/partners/codes/upload', method: 'POST', body }),
      invalidatesTags: ['Partners', 'Marketplace'],
    }),
    getPartnerConsumption: builder.query<ApiResponse<PartnerConsumptionResponse>, string>({
      query: (partnerId) => `/partners/${partnerId}/consumption`,
      providesTags: ['Partners'],
    }),
  }),
});

export const {
  useGetPartnersQuery,
  useCreatePartnerMutation,
  useCreateOfferMutation,
  useUploadCodesMutation,
  useGetPartnerConsumptionQuery,
} = partnersApi;
