import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '../../services/api.client';
import secureStorage from '../../services/secureStorage';

export const baseApi = createApi({
  reducerPath: 'blockluckyApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: async (headers) => {
      const token = await secureStorage.getToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['User', 'Lottery', 'Marketplace', 'Points', 'Quests', 'Notifications'],
  endpoints: () => ({}),
});

export default baseApi;
