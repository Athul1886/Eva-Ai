/**
 * Eva-Ai Admin Authentication & Session Management
 * Adheres strictly to backend-authoritative JWT authentication & session verification.
 */

import {
  authApi,
  getStoredAccessToken,
  setStoredAccessToken,
  getStoredRefreshToken,
  setStoredRefreshToken,
  ApiError,
} from '../api/api';

export const ADMIN_SESSION_KEY = 'eva_ai_admin_session';

export interface AdminSession {
  adminId: string;
  userId?: string;
  fullName?: string;
  email: string;
  role: string;
  loginAt: string;
  token?: string;
}

/**
 * Retrieve active admin session from localStorage
 */
export function getAdminSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse admin session from localStorage:', err);
    return null;
  }
}

/**
 * Set active admin session in localStorage and dispatch update event
 */
export function setAdminSession(session: AdminSession): void {
  try {
    localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
    window.dispatchEvent(new Event('eva_ai_admin_session_updated'));
  } catch (err) {
    console.warn('Failed to save admin session to localStorage:', err);
  }
}

/**
 * Clear admin session and tokens on logout
 */
export function clearAdminSession(): void {
  try {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setStoredAccessToken(null);
    setStoredRefreshToken(null);
    window.dispatchEvent(new Event('eva_ai_admin_session_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.warn('Failed to clear admin session from localStorage:', err);
  }
}

/**
 * Performs admin logout:
 * 1. Calls POST /auth/logout backend request with current Bearer token
 * 2. Clears authentication/session data
 */
export async function logoutAdmin(): Promise<void> {
  try {
    await authApi.logout();
  } catch {
    // Handled safely in authApi.logout
  } finally {
    clearAdminSession();
  }
}

export interface VerifyAdminSessionResult {
  valid: boolean;
  user?: any;
  error?: string;
  status?: number;
}

let activeAdminVerificationPromise: Promise<VerifyAdminSessionResult> | null = null;

/**
 * Authoritative session verification for Admin Portal using GET /auth/me.
 * Validates role === 'admin' and user.isActive !== false.
 * Rehydrates admin session from backend source of truth.
 */
export async function verifyAdminSession(): Promise<VerifyAdminSessionResult> {
  if (activeAdminVerificationPromise) {
    return activeAdminVerificationPromise;
  }

  activeAdminVerificationPromise = (async () => {
    let token = getStoredAccessToken();
    const currentSession = getAdminSession();
    const refreshToken = getStoredRefreshToken();

    // If no access token exists but a refresh token is present, attempt refresh first
    if (!token && refreshToken) {
      try {
        const refreshRes = await authApi.refresh(refreshToken);
        token = refreshRes?.data?.token || getStoredAccessToken();
      } catch {
        clearAdminSession();
        return { valid: false, error: 'REFRESH_FAILED' };
      }
    }

    // If no token exists at all
    if (!token) {
      if (!currentSession) {
        return { valid: false, error: 'NO_SESSION' };
      }
      return { valid: false, error: 'NO_TOKEN' };
    }

    try {
      const res = await authApi.me();
      const user = res?.data?.user || res?.user || res?.data;

      if (!user) {
        return { valid: false, error: 'INVALID_USER_DATA' };
      }

      // Role check: must be admin
      const role = user.role || user.userRole;
      if (role && role.toLowerCase() !== 'admin') {
        clearAdminSession();
        return { valid: false, error: 'INVALID_ROLE', status: 403 };
      }

      // Status check: must not be deactivated
      if (user.isActive === false) {
        clearAdminSession();
        return { valid: false, error: 'ACCOUNT_DEACTIVATED', status: 403 };
      }

      const latestToken = getStoredAccessToken() || token;
      const updatedSession: AdminSession = {
        adminId: user.id || user._id || user.userId || currentSession?.adminId || 'admin',
        userId: user.id || user._id || user.userId || currentSession?.userId,
        fullName: user.fullName || user.name || currentSession?.fullName || 'Administrator',
        email: user.email || currentSession?.email || '',
        role: 'admin',
        loginAt: currentSession?.loginAt || new Date().toISOString(),
        token: latestToken,
      };

      setAdminSession(updatedSession);
      return { valid: true, user };
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          clearAdminSession();
          return { valid: false, status: 401, error: 'UNAUTHORIZED' };
        }
        if (err.status === 403) {
          clearAdminSession();
          return { valid: false, status: 403, error: 'FORBIDDEN' };
        }
      }
      // If network fails but local admin session exists, don't immediately evict if token is present
      if (currentSession && currentSession.role === 'admin') {
        return { valid: true, user: currentSession };
      }
      return { valid: false, error: 'VERIFICATION_FAILED' };
    } finally {
      activeAdminVerificationPromise = null;
    }
  })();

  return activeAdminVerificationPromise;
}
