/**
 * Eva-Ai Frontend API Integration Foundation
 * Single Source of Truth: Unified REST API Contract
 */

import { Booking, BookingStatus } from '../types/booking';
import { EventPlanData } from '../types/event';
import { ProviderAccount, ProviderCategoryType } from '../types/provider';
import { Provider } from '../types/service';

// ---------------------------------------------------------------------------
// 1. API Base URL configuration
// ---------------------------------------------------------------------------
declare global {
  interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    [key: string]: any;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const getBaseUrl = (): string => {
  const envUrl = (import.meta as any).env?.VITE_API_URL || import.meta.env?.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string') {
    return envUrl.trim().replace(/\/+$/, '');
  }
  return '';
};

export const API_BASE_URL = getBaseUrl();

// ---------------------------------------------------------------------------
// 2. Authentication Token Storage & Session Helpers
// ---------------------------------------------------------------------------
export const AUTH_TOKEN_KEY = 'eva_ai_auth_token';
export const REFRESH_TOKEN_KEY = 'eva_ai_refresh_token';

/**
 * Safely extracts access token from localStorage across standard keys:
 * direct auth token, customer session, provider session, or Supabase keys.
 */
export function getStoredAccessToken(): string | null {
  try {
    // 1. Direct explicit token key
    const directToken =
      localStorage.getItem(AUTH_TOKEN_KEY) ||
      localStorage.getItem('access_token') ||
      localStorage.getItem('token');
    if (directToken) return directToken;

    // 2. Customer session object in localStorage
    const customerSession = localStorage.getItem('eva_ai_customer_session');
    if (customerSession) {
      const parsed = JSON.parse(customerSession);
      const token = parsed?.token || parsed?.accessToken || parsed?.access_token;
      if (token && typeof token === 'string') return token;
    }

    // 3. Provider session object in localStorage
    const providerSession = localStorage.getItem('eva_ai_provider_session');
    if (providerSession) {
      const parsed = JSON.parse(providerSession);
      const token = parsed?.token || parsed?.accessToken || parsed?.access_token;
      if (token && typeof token === 'string') return token;
    }

    // 4. Supabase standard persisted session key (sb-*-auth-token)
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase')) && key.endsWith('-auth-token')) {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed?.access_token) return parsed.access_token;
          if (parsed?.currentSession?.access_token) return parsed.currentSession.access_token;
        }
      }
    }
  } catch {
    // Avoid breaking if localStorage is unavailable or malformed
  }
  return null;
}

export function setStoredAccessToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
}

export function getStoredRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredRefreshToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

// ---------------------------------------------------------------------------
// 3. API Error & Envelope Types
// ---------------------------------------------------------------------------
export interface ApiContractResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  missingFields?: string[];
  [key: string]: any;
}

export class ApiError extends Error {
  status: number;
  errorKey?: string;
  missingFields?: string[];
  responseBody?: any;

  constructor(
    status: number,
    message: string,
    errorKey?: string,
    missingFields?: string[],
    responseBody?: any
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorKey = errorKey;
    this.missingFields = missingFields;
    this.responseBody = responseBody;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  token?: string | null;
  params?: Record<string, string | number | boolean | undefined | null>;
  _retry?: boolean;
}

// ---------------------------------------------------------------------------
// 4. Token Refresh & Auth Invalidation Handling
// ---------------------------------------------------------------------------
let activeRefreshPromise: Promise<string | null> | null = null;

/**
 * Safely clears authentication tokens and active session without destroying
 * unrelated customer data (preserves event drafts, bookings, and selected services).
 */
export function handleAuthFailure(): void {
  try {
    setStoredAccessToken(null);
    setStoredRefreshToken(null);
    localStorage.removeItem('eva_ai_customer_session');
    localStorage.removeItem('eva_ai_provider_session');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('eva_ai_customer_session_updated'));
      window.dispatchEvent(new Event('eva_ai_provider_session_updated'));
    }
  } catch {
    // Ignore storage issues in restricted environments
  }
}

/**
 * Shared in-flight refresh promise to prevent duplicate concurrent refresh calls.
 */
export async function getOrStartTokenRefresh(refreshToken: string): Promise<string | null> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    try {
      const refreshUrl = `${API_BASE_URL}${API_ENDPOINTS.AUTH_REFRESH}`;

      const res = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      let responseData: any = null;
      try {
        responseData = await res.json();
      } catch {
        responseData = null;
      }

      if (!res.ok) {
        const errorMsg =
          responseData?.message ||
          responseData?.error ||
          `Token refresh failed with status ${res.status}`;
        throw new ApiError(
          res.status,
          errorMsg,
          responseData?.error || 'REFRESH_FAILED',
          responseData?.missingFields,
          responseData
        );
      }

      // Extract new tokens from contract response
      const newAccessToken =
        responseData?.data?.session?.access_token ||
        responseData?.data?.token ||
        responseData?.data?.accessToken ||
        responseData?.session?.access_token ||
        responseData?.token ||
        responseData?.accessToken ||
        null;

      const newRefreshToken =
        responseData?.data?.session?.refresh_token ||
        responseData?.data?.refreshToken ||
        responseData?.session?.refresh_token ||
        responseData?.refreshToken ||
        null;

      if (!newAccessToken) {
        throw new ApiError(
          401,
          'No new access token returned by refresh endpoint',
          'INVALID_REFRESH_RESPONSE'
        );
      }

      // Store new access token
      setStoredAccessToken(newAccessToken);

      // Store new refresh token if returned
      if (newRefreshToken) {
        setStoredRefreshToken(newRefreshToken);
      }

      // Also update customer session object in localStorage if present
      try {
        const sessionRaw = localStorage.getItem('eva_ai_customer_session');
        if (sessionRaw) {
          const session = JSON.parse(sessionRaw);
          session.token = newAccessToken;
          localStorage.setItem('eva_ai_customer_session', JSON.stringify(session));
        }
      } catch {}

      // Also update provider session object in localStorage if present
      try {
        const sessionRaw = localStorage.getItem('eva_ai_provider_session');
        if (sessionRaw) {
          const session = JSON.parse(sessionRaw);
          session.token = newAccessToken;
          localStorage.setItem('eva_ai_provider_session', JSON.stringify(session));
        }
      } catch {}

      return newAccessToken;
    } catch (err) {
      handleAuthFailure();
      throw err;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

// ---------------------------------------------------------------------------
// 4. Reusable Core API Request Helper
// ---------------------------------------------------------------------------
/**
 * Safe, centralized API request wrapper that adheres strictly to contract error
 * responses, automatically includes Bearer tokens, and protects credentials.
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiContractResponse<T>> {
  const method = options.method || 'GET';
  const headers: Record<string, string> = { ...options.headers };

  // Set Content-Type for JSON payloads if body is provided and not FormData
  let requestBody: BodyInit | undefined;
  if (options.body !== undefined && options.body !== null) {
    if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
      requestBody = options.body;
    } else if (typeof options.body === 'string') {
      requestBody = options.body;
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    } else {
      requestBody = JSON.stringify(options.body);
      if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
    }
  }

  // Attach Authorization Bearer token if not explicitly overridden
  const token = options.token !== undefined ? options.token : getStoredAccessToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Build query string if params are provided
  let queryString = '';
  if (options.params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(options.params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    }
    const query = searchParams.toString();
    if (query) {
      queryString = `?${query}`;
    }
  }

  // Construct absolute request URL from API_BASE_URL
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = `${API_BASE_URL}${cleanEndpoint}${queryString}`;

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      method,
      headers,
      body: requestBody,
    });
  } catch (networkErr: any) {
    // Network or CORS failure
    throw new ApiError(
      0,
      networkErr?.message || 'Network request failed. Please check connectivity.',
      'NETWORK_ERROR'
    );
  }

  // Parse JSON response safely
  let responseData: any = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      responseData = await response.json();
    } catch {
      responseData = null;
    }
  } else {
    try {
      const text = await response.text();
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = text ? { message: text } : null;
      }
    } catch {
      responseData = null;
    }
  }

  // Check HTTP status or contract error state
  if (!response.ok) {
    const errorMsg =
      responseData?.message ||
      responseData?.error ||
      `Request failed with status ${response.status}`;
    const errorKey = responseData?.error || `HTTP_${response.status}`;
    const missingFields = Array.isArray(responseData?.missingFields)
      ? responseData.missingFields
      : undefined;

    // Handle 401 Unauthorized for token refresh
    if (response.status === 401) {
      const isAuthEndpoint =
        cleanEndpoint === API_ENDPOINTS.AUTH_LOGIN ||
        cleanEndpoint === API_ENDPOINTS.AUTH_REGISTER ||
        cleanEndpoint === API_ENDPOINTS.AUTH_REFRESH ||
        cleanEndpoint === API_ENDPOINTS.AUTH_LOGOUT;

      if (!options._retry && !isAuthEndpoint) {
        const storedRefreshToken = getStoredRefreshToken();
        if (storedRefreshToken) {
          try {
            const newToken = await getOrStartTokenRefresh(storedRefreshToken);
            if (newToken) {
              // Retry the original failed request exactly once with the new access token
              return await apiRequest<T>(endpoint, {
                ...options,
                token: newToken,
                _retry: true,
              });
            }
          } catch {
            // Token refresh failed -> handleAuthFailure() was called in getOrStartTokenRefresh
            throw new ApiError(401, errorMsg, errorKey, missingFields, responseData);
          }
        } else {
          // No refresh token available to refresh session
          handleAuthFailure();
        }
      } else if (options._retry) {
        // Retried request still failed with 401 -> session invalid
        handleAuthFailure();
      }
    }

    throw new ApiError(response.status, errorMsg, errorKey, missingFields, responseData);
  }

  // Fallback if backend returned 200 with success: false
  if (responseData && typeof responseData === 'object' && responseData.success === false) {
    const errorMsg = responseData.message || responseData.error || 'Operation failed';
    const errorKey = responseData.error || 'OPERATION_FAILED';
    const missingFields = Array.isArray(responseData.missingFields)
      ? responseData.missingFields
      : undefined;

    throw new ApiError(response.status, errorMsg, errorKey, missingFields, responseData);
  }

  return responseData as ApiContractResponse<T>;
}

// ---------------------------------------------------------------------------
// 5. Unified REST API Endpoints Contract Constants
// ---------------------------------------------------------------------------
export const API_ENDPOINTS = {
  // Auth
  AUTH_REGISTER: '/auth/register',
  AUTH_LOGIN: '/auth/login',
  AUTH_ME: '/auth/me',
  AUTH_REFRESH: '/auth/refresh',
  AUTH_LOGOUT: '/auth/logout',

  // Providers
  PROVIDERS: '/providers',
  PROVIDER_BY_ID: (id: string) => `/providers/${id}`,
  PROVIDER_CATEGORIES: '/providers/categories',
  PROVIDER_UNAVAILABLE_DATES: (id: string) => `/providers/${id}/unavailable-dates`,
  PROVIDER_PROFILE: '/providers/profile',
  PROVIDER_AVAILABILITY_SYNC: '/providers/availability/sync',
  PROVIDER_AVAILABILITY: '/providers/availability',
  PROVIDER_AVAILABILITY_BY_ID: (id: string) => `/providers/availability/${id}`,
  PROVIDER_PORTFOLIO: '/providers/portfolio',
  PROVIDER_PORTFOLIO_BY_ID: (id: string) => `/providers/portfolio/${id}`,

  // Events
  EVENTS: '/events',
  EVENT_BY_ID: (id: string) => `/events/${id}`,
  EVENT_SERVICES: (id: string) => `/events/${id}/services`,
  EVENT_SERVICE_BY_CART_ID: (id: string, cartItemId: string) =>
    `/events/${id}/services/${cartItemId}`,
  EVENT_SERVICE_BY_SERVICE_ID: (id: string, serviceId: string) =>
    `/events/${id}/services/${serviceId}`,
  EVENT_PLAN: (id: string) => `/events/${id}/plan`,
  EVENT_BOOKINGS: (id: string) => `/events/${id}/bookings`,

  // Bookings
  BOOKINGS: '/bookings',
  BOOKINGS_MY: '/bookings/my',
  BOOKINGS_PROVIDER: '/bookings/provider',
  BOOKING_STATUS: (id: string) => `/bookings/${id}/status`,

  // Services
  SERVICES: '/services',
  SERVICES_MY: '/services/my',
  SERVICE_BY_ID: (id: string) => `/services/${id}`,

  // AI Recommendations
  RECOMMENDATIONS: '/recommendations',
} as const;

// ---------------------------------------------------------------------------
// 6. Contract Domain Helpers (Prepared for subsequent integration phases)
// ---------------------------------------------------------------------------

export interface AIRecommendationPreferences {
  styles?: string[];
  tags?: string[];
}

export interface AIRecommendationRequest {
  eventType: string;
  eventDate: string;
  location: string;
  guestCount: number;
  budget: number;
  requiredServices: string[];
  preferences?: AIRecommendationPreferences;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
}

export interface AIRecommendationProvider {
  providerId: string;
  serviceId: string;
  providerName: string;
  serviceName: string;
  location: string;
  startingPrice: number;
  rating: number;
  reviewCount: number;
  matchScore: number;
  matchReasons: string[];
  isAvailable: boolean;
}

export interface AIRecommendationCategory {
  category: string;
  providers: AIRecommendationProvider[];
}

export interface AIRecommendationMeta {
  eventType: string;
  location: string;
  budget: number;
  guestCount: number;
}

export interface AIRecommendationResponse {
  success: boolean;
  message?: string;
  recommendations: AIRecommendationCategory[];
  meta?: AIRecommendationMeta;
  errors?: { field?: string; message: string }[];
}

/**
 * Authentication Endpoints API
 */
export const authApi = {
  register: <T = any>(payload: {
    email: string;
    password?: string;
    fullName?: string;
    role?: 'customer' | 'provider';
    phone?: string;
    location?: string;
    [key: string]: any;
  }) => apiRequest<T>(API_ENDPOINTS.AUTH_REGISTER, { method: 'POST', body: payload }),

  registerCustomer: <T = any>(payload: {
    fullName: string;
    email: string;
    password: string;
    phone: string;
    location: string;
  }) =>
    apiRequest<T>(API_ENDPOINTS.AUTH_REGISTER, {
      method: 'POST',
      body: {
        fullName: payload.fullName,
        email: payload.email,
        password: payload.password,
        phone: payload.phone,
        location: payload.location,
        role: 'customer',
      },
    }),

  login: <T = any>(payload: { email: string; password?: string; [key: string]: any }) =>
    apiRequest<T>(API_ENDPOINTS.AUTH_LOGIN, { method: 'POST', body: payload }),

  getMe: <T = any>() => apiRequest<T>(API_ENDPOINTS.AUTH_ME, { method: 'GET' }),

  me: <T = any>() => apiRequest<T>(API_ENDPOINTS.AUTH_ME, { method: 'GET' }),

  updateMe: <T = any>(payload: Record<string, any>) =>
    apiRequest<T>(API_ENDPOINTS.AUTH_ME, { method: 'PUT', body: payload }),

  refresh: <T = any>(refreshToken?: string) => {
    const token = refreshToken || getStoredRefreshToken();
    if (!token) {
      handleAuthFailure();
      return Promise.reject(
        new ApiError(401, 'No refresh token available', 'NO_REFRESH_TOKEN')
      );
    }
    return getOrStartTokenRefresh(token).then((newToken) => ({
      success: true,
      data: { token: newToken } as any,
    }));
  },

  logout: async <T = any>() => {
    try {
      return await apiRequest<T>(API_ENDPOINTS.AUTH_LOGOUT, { method: 'POST' });
    } catch {
      // Best effort logout on backend (e.g. token already expired or network unavailable)
      return { success: true } as ApiContractResponse<T>;
    } finally {
      handleAuthFailure();
    }
  },
};

/**
 * Providers Endpoints API
 */
export const providersApi = {
  getAll: <T = Provider[]>(params?: Record<string, any>) =>
    apiRequest<T>(API_ENDPOINTS.PROVIDERS, { method: 'GET', params }),

  getById: <T = Provider>(id: string) =>
    apiRequest<T>(API_ENDPOINTS.PROVIDER_BY_ID(id), { method: 'GET' }),

  getCategories: <T = string[] | { id: string; name: string; icon?: string }[]>() =>
    apiRequest<T>(API_ENDPOINTS.PROVIDER_CATEGORIES, { method: 'GET' }),

  getUnavailableDates: <T = string[]>(id: string) =>
    apiRequest<T>(API_ENDPOINTS.PROVIDER_UNAVAILABLE_DATES(id), { method: 'GET' }),

  getProfile: <T = ProviderAccount>() =>
    apiRequest<T>(API_ENDPOINTS.PROVIDER_PROFILE, { method: 'GET' }),

  updateProfile: <T = ProviderAccount>(data: Partial<ProviderAccount> | Record<string, any>) =>
    apiRequest<T>(API_ENDPOINTS.PROVIDER_PROFILE, { method: 'PUT', body: data }),

  syncAvailability: <T = any>(data: { dates?: string[]; [key: string]: any }) =>
    apiRequest<T>(API_ENDPOINTS.PROVIDER_AVAILABILITY_SYNC, { method: 'PUT', body: data }),

  getAvailability: <T = any>() =>
    apiRequest<T>(API_ENDPOINTS.PROVIDER_AVAILABILITY, { method: 'GET' }),

  addAvailability: <T = any>(data: { date: string; reason?: string; [key: string]: any }) =>
    apiRequest<T>(API_ENDPOINTS.PROVIDER_AVAILABILITY, { method: 'POST', body: data }),

  deleteAvailability: <T = any>(id: string) =>
    apiRequest<T>(API_ENDPOINTS.PROVIDER_AVAILABILITY_BY_ID(id), { method: 'DELETE' }),

  getPortfolio: <T = any[]>() =>
    apiRequest<T>(API_ENDPOINTS.PROVIDER_PORTFOLIO, { method: 'GET' }),

  addPortfolio: <T = any>(data: Record<string, any>) =>
    apiRequest<T>(API_ENDPOINTS.PROVIDER_PORTFOLIO, { method: 'POST', body: data }),

  updatePortfolio: <T = any>(id: string, data: Record<string, any>) =>
    apiRequest<T>(API_ENDPOINTS.PROVIDER_PORTFOLIO_BY_ID(id), { method: 'PUT', body: data }),

  deletePortfolio: <T = any>(id: string) =>
    apiRequest<T>(API_ENDPOINTS.PROVIDER_PORTFOLIO_BY_ID(id), { method: 'DELETE' }),
};

/**
 * Events Endpoints API
 */
export const eventsApi = {
  create: <T = any>(eventData: Partial<EventPlanData> | Record<string, any>) =>
    apiRequest<T>(API_ENDPOINTS.EVENTS, { method: 'POST', body: eventData }),

  getAll: <T = any[]>() => apiRequest<T>(API_ENDPOINTS.EVENTS, { method: 'GET' }),

  getById: <T = any>(id: string) =>
    apiRequest<T>(API_ENDPOINTS.EVENT_BY_ID(id), { method: 'GET' }),

  update: <T = any>(id: string, eventData: Partial<EventPlanData> | Record<string, any>) =>
    apiRequest<T>(API_ENDPOINTS.EVENT_BY_ID(id), { method: 'PUT', body: eventData }),

  delete: <T = any>(id: string) =>
    apiRequest<T>(API_ENDPOINTS.EVENT_BY_ID(id), { method: 'DELETE' }),

  addService: <T = any>(eventId: string, serviceData: Record<string, any>) =>
    apiRequest<T>(API_ENDPOINTS.EVENT_SERVICES(eventId), { method: 'POST', body: serviceData }),

  updateService: <T = any>(eventId: string, cartItemId: string, serviceData: Record<string, any>) =>
    apiRequest<T>(API_ENDPOINTS.EVENT_SERVICE_BY_CART_ID(eventId, cartItemId), {
      method: 'PUT',
      body: serviceData,
    }),

  removeService: <T = any>(eventId: string, serviceId: string) =>
    apiRequest<T>(API_ENDPOINTS.EVENT_SERVICE_BY_SERVICE_ID(eventId, serviceId), {
      method: 'DELETE',
    }),

  getPlan: <T = any>(eventId: string) =>
    apiRequest<T>(API_ENDPOINTS.EVENT_PLAN(eventId), { method: 'GET' }),

  createBookings: <T = any>(eventId: string, bookingData?: Record<string, any>) =>
    apiRequest<T>(API_ENDPOINTS.EVENT_BOOKINGS(eventId), {
      method: 'POST',
      body: bookingData || {},
    }),
};

/**
 * Bookings Endpoints API
 */
export const bookingsApi = {
  create: <T = Booking>(bookingData: Partial<Booking> | Record<string, any>) =>
    apiRequest<T>(API_ENDPOINTS.BOOKINGS, { method: 'POST', body: bookingData }),

  getMyBookings: <T = Booking[]>() =>
    apiRequest<T>(API_ENDPOINTS.BOOKINGS_MY, { method: 'GET' }),

  getProviderBookings: <T = Booking[]>() =>
    apiRequest<T>(API_ENDPOINTS.BOOKINGS_PROVIDER, { method: 'GET' }),

  updateStatus: <T = Booking>(
    bookingId: string,
    status: BookingStatus | string,
    extra?: Record<string, any>
  ) =>
    apiRequest<T>(API_ENDPOINTS.BOOKING_STATUS(bookingId), {
      method: 'PATCH',
      body: { status, ...extra },
    }),
};

/**
 * Services Endpoints API
 */
export const servicesApi = {
  create: <T = any>(data: Record<string, any>) =>
    apiRequest<T>(API_ENDPOINTS.SERVICES, { method: 'POST', body: data }),

  getMyServices: <T = any[]>() =>
    apiRequest<T>(API_ENDPOINTS.SERVICES_MY, { method: 'GET' }),

  update: <T = any>(id: string, data: Record<string, any>) =>
    apiRequest<T>(API_ENDPOINTS.SERVICE_BY_ID(id), { method: 'PUT', body: data }),

  delete: <T = any>(id: string) =>
    apiRequest<T>(API_ENDPOINTS.SERVICE_BY_ID(id), { method: 'DELETE' }),
};

/**
 * AI Recommendations Endpoints API
 */
export const recommendationsApi = {
  getRecommendations: <T = AIRecommendationResponse>(payload: AIRecommendationRequest) =>
    apiRequest<T>(API_ENDPOINTS.RECOMMENDATIONS, { method: 'POST', body: payload }),
};

export default {
  API_BASE_URL,
  API_ENDPOINTS,
  apiRequest,
  getStoredAccessToken,
  setStoredAccessToken,
  getStoredRefreshToken,
  setStoredRefreshToken,
  auth: authApi,
  providers: providersApi,
  events: eventsApi,
  bookings: bookingsApi,
  services: servicesApi,
  recommendations: recommendationsApi,
};
