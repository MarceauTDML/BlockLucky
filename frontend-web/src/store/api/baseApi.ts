import {
  BaseQueryFn,
  createApi,
  FetchArgs,
  fetchBaseQuery,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';
import { API_BASE_URL } from '@/lib/config';
import storage, { KEYS } from '@/lib/storage';
import { logout } from '../slices/authSlice';

interface StateWithAuth {
  auth: { token: string | null };
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  timeout: 15000,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as StateWithAuth).auth.token;
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

const baseQueryWithAuthGuard: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  const hadToken = Boolean((api.getState() as StateWithAuth).auth.token);
  if (result.error?.status === 401 && hadToken) {
    const url = typeof args === 'string' ? args : args.url;
    if (!url.startsWith('/auth/2fa')) {
      storage.remove(KEYS.token);
      storage.remove(KEYS.user);
      api.dispatch(logout());
    }
  }
  return result;
};

export const baseApi = createApi({
  reducerPath: 'blockluckyApi',
  baseQuery: baseQueryWithAuthGuard,
  tagTypes: [
    'User',
    'Lottery',
    'Wallet',
    'Marketplace',
    'Points',
    'Quests',
    'Notifications',
    'Admin',
    'Partners',
    'Audit',
    'Identity',
  ],
  endpoints: () => ({}),
});

export const getErrorMessage = (err: unknown, fallback: string): string => {
  const e = err as { data?: { message?: string }; status?: number | string; error?: string };
  if (e?.data?.message) return e.data.message;
  if (e?.status === 'FETCH_ERROR' || e?.status === 'TIMEOUT_ERROR') {
    return 'Serveur injoignable. Vérifiez votre connexion et réessayez.';
  }
  return fallback;
};

export default baseApi;
