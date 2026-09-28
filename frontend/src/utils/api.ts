/**
 * Eva-Ai Native Fetch API Client
 * Centralized API client with JWT Authorization header injection and token management.
 */

export const ACCESS_TOKEN_KEY = 'eva_ai_access_token';
export const REFRESH_TOKEN_KEY = 'eva_ai_refresh_token';

// Base URL configured from Vite environment variable with safe fallback
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');

export interface ApiTokens {
  accessToken: string;
  refreshToken?: string;
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Retrieve current JWT access token from localStorage
 */
export function getAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Check if a valid JWT access token exists
 */
export function hasAuthToken(): boolean {
  return !!getAccessToken();
}

/**
 * Retrieve current refresh token from localStorage
 */
export function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Store JWT access token and optional refresh token in localStorage
 */
export function setAuthTokens(tokens: ApiTokens): void {
  try {
    if (tokens.accessToken) {
      localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    }
    if (tokens.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    }
    window.dispatchEvent(new Event('eva_ai_auth_tokens_updated'));
  } catch (err) {
    console.warn('Failed to store auth tokens:', err);
  }
}

/**
 * Clear JWT access and refresh tokens from localStorage
 */
export function clearAuthTokens(): void {
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    window.dispatchEvent(new Event('eva_ai_auth_tokens_updated'));
  } catch (err) {
    console.warn('Failed to clear auth tokens:', err);
  }
}

export interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  _isRetry?: boolean;
}

let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

function onTokenRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

/**
 * Core native fetch wrapper that automatically injects Authorization header
 * and performs safe single-attempt token refresh on 401 Unauthorized responses.
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { requiresAuth = true, headers: customHeaders, ...restOptions } = options;

  // Build clean URL
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${normalizedEndpoint}`;

  const headers = new Headers(customHeaders || {});

  // Default content-type to application/json if sending a body and not already set
  if (restOptions.body && !(restOptions.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Automatic Authorization: Bearer <token> injection
  if (requiresAuth) {
    const token = getAccessToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...restOptions,
      headers,
    });
  } catch (netErr: any) {
    throw new ApiError(0, 'Network connection error. Please verify your internet connection.', {
      originalError: netErr?.message,
    });
  }

  // Parse JSON response
  let data: any = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      data = await response.text();
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    // 401 Unauthorized handling & automatic token refresh
    if (
      response.status === 401 &&
      requiresAuth &&
      !options._isRetry &&
      !normalizedEndpoint.includes('/auth/login') &&
      !normalizedEndpoint.includes('/auth/refresh')
    ) {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        if (!isRefreshing) {
          isRefreshing = true;
          try {
            const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refreshToken }),
            });
            const refreshData = await refreshRes.json().catch(() => null);
            if (refreshRes.ok && refreshData?.token) {
              setAuthTokens({
                accessToken: refreshData.token,
                refreshToken: refreshData.session?.refresh_token || refreshToken,
              });
              onTokenRefreshed(refreshData.token);
              isRefreshing = false;
              // Retry original request with fresh token
              return apiRequest<T>(endpoint, { ...options, _isRetry: true });
            } else {
              onTokenRefreshed(null);
              clearAuthTokens();
              window.dispatchEvent(new CustomEvent('eva_ai_session_expired'));
              isRefreshing = false;
            }
          } catch {
            onTokenRefreshed(null);
            clearAuthTokens();
            window.dispatchEvent(new CustomEvent('eva_ai_session_expired'));
            isRefreshing = false;
          }
        } else {
          // A refresh is already in progress, wait for it to complete
          return new Promise<T>((resolve, reject) => {
            subscribeTokenRefresh((newToken) => {
              if (newToken) {
                resolve(apiRequest<T>(endpoint, { ...options, _isRetry: true }));
              } else {
                window.dispatchEvent(new CustomEvent('eva_ai_session_expired'));
                reject(new ApiError(401, 'Session expired. Please sign in again.'));
              }
            });
          });
        }
      } else {
        clearAuthTokens();
        window.dispatchEvent(new CustomEvent('eva_ai_session_expired'));
      }
    }

    const errorMessage =
      (data && typeof data === 'object' && (data.message || data.error)) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, errorMessage, data);
  }

  return data as T;
}

export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'GET' }),

  post: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    }),

  put: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiRequest<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : (body !== undefined ? JSON.stringify(body) : undefined),
    }),

  delete: <T = any>(endpoint: string, options?: RequestOptions) =>
    apiRequest<T>(endpoint, { ...options, method: 'DELETE' }),
};
