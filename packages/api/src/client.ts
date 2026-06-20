import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

let _token: (() => string | null) | null = null;
let _onUnauthorized: (() => void) | null = null;

export function initApiClient(opts: { getToken: () => string | null; onUnauthorized: () => void }) {
  _token = opts.getToken;
  _onUnauthorized = opts.onUnauthorized;
}

function resolveBaseUrl(): string {
  try {
    // Vite environment (web)
    const env = (import.meta as { env?: Record<string, string> }).env;
    if (env?.VITE_API_URL) return env.VITE_API_URL;
  } catch {
    // not in Vite context (e.g. mobile / test)
  }
  return '';
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: resolveBaseUrl(),
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = _token?.();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) _onUnauthorized?.();
    return Promise.reject(err);
  }
);
