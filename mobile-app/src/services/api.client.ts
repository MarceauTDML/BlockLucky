import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import secureStorage from './secureStorage';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:2053/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await secureStorage.getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const MAX_RETRIES = 2;
const RETRYABLE_METHODS = ['get', 'head', 'options'];
const RETRYABLE_STATUSES = [408, 429, 502, 503, 504];

type RetriableConfig = InternalAxiosRequestConfig & { retryCount?: number };

const retryDelayMs = (attempt: number, retryAfterHeader?: string): number => {
  const retryAfterSeconds = Number(retryAfterHeader);
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.min(retryAfterSeconds * 1000, 10000);
  }
  return Math.random() * 500 * 2 ** attempt;
};

apiClient.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as RetriableConfig | undefined;
  const method = config?.method?.toLowerCase() ?? '';
  const status = error.response?.status;
  const retryable =
    !!config &&
    RETRYABLE_METHODS.includes(method) &&
    (status === undefined || RETRYABLE_STATUSES.includes(status));

  if (!config || !retryable || (config.retryCount ?? 0) >= MAX_RETRIES) {
    return Promise.reject(error);
  }

  config.retryCount = (config.retryCount ?? 0) + 1;
  const retryAfter = error.response?.headers?.['retry-after'] as string | undefined;
  await new Promise((resolve) =>
    setTimeout(resolve, retryDelayMs(config.retryCount!, retryAfter)),
  );
  return apiClient(config);
});

export default apiClient;
