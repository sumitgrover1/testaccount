import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { getAccessToken, getCookie, setAccessToken } from '../auth/tokenStore';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';

// `withCredentials` is required on every request so the browser sends/accepts
// the backend's httpOnly refresh cookie and readable CSRF cookie (see
// csrf.middleware.ts on the backend for why refresh/logout need that header).
export const apiClient = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

// A separate, interceptor-free client for the refresh call itself — reusing
// `apiClient` here would recurse into the same 401-handling interceptor.
const refreshClient = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const csrfToken = getCookie('csrf_token');
  try {
    const response = await refreshClient.post<{ data: { accessToken: string } }>(
      '/auth/refresh',
      {},
      { headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {} },
    );
    const token = response.data.data.accessToken;
    setAccessToken(token);
    return token;
  } catch {
    setAccessToken(null);
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retried?: boolean }) | undefined;

    if (error.response?.status === 401 && original && !original._retried) {
      original._retried = true;
      // Concurrent 401s share one in-flight refresh instead of each firing
      // their own /auth/refresh call.
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
      const newToken = await refreshPromise;
      if (newToken) {
        original.headers.set('Authorization', `Bearer ${newToken}`);
        return apiClient(original);
      }
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

// Exposed for AuthContext to call once on app mount: the refresh cookie may
// still be valid from a previous session even though the in-memory access
// token was lost on page reload.
export function attemptSilentRefresh(): Promise<string | null> {
  refreshPromise ??= refreshAccessToken().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

export interface ApiErrorBody {
  error: { code: string; message: string; requestId: string; details?: unknown };
}

export function getApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;
    return body?.error?.message ?? fallback;
  }
  return fallback;
}
