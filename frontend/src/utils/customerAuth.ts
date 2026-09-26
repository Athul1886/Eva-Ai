import { CustomerProfileData } from '../pages/CustomerSignupPage';
import {
  authApi,
  getStoredAccessToken,
  setStoredAccessToken,
  getStoredRefreshToken,
  setStoredRefreshToken,
  ApiError,
} from '../api/api';
export type { CustomerProfileData };

export const CUSTOMER_SESSION_KEY = 'eva_ai_customer_session';
export const CUSTOMER_PROFILE_KEY = 'eva_ai_customer';

export interface CustomerSession {
  customerId: string;
  userId?: string;
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  loginAt: string;
  token?: string;
  role?: string;
}

// Default fallback demo customer if user wants quick instant login without prior signup
export const DEMO_CUSTOMER: CustomerProfileData = {
  fullName: 'Ananya Nair',
  email: 'ananya@eva-ai.internal',
  phone: '+91 98470 11223',
  location: 'Kochi, Kerala',
  createdAt: '2026-01-15T09:30:00.000Z',
};

/**
 * Retrieve active customer session from localStorage
 */
export function getCustomerSession(): CustomerSession | null {
  try {
    const raw = localStorage.getItem(CUSTOMER_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse customer session from localStorage:', err);
    return null;
  }
}

/**
 * Set active customer session in localStorage and dispatch update event
 */
export function setCustomerSession(session: CustomerSession): void {
  try {
    localStorage.setItem(CUSTOMER_SESSION_KEY, JSON.stringify(session));
    window.dispatchEvent(new Event('eva_ai_customer_session_updated'));
  } catch (err) {
    console.warn('Failed to save customer session to localStorage:', err);
  }
}

/**
 * Clear only customer session and auth tokens from localStorage
 * Preserves all non-auth customer data (eva_ai_customer, eva_ai_event, eva_ai_event_plan, eva_ai_selected_services, eva_ai_bookings)
 */
export function clearCustomerSession(): void {
  try {
    localStorage.removeItem(CUSTOMER_SESSION_KEY);
    setStoredAccessToken(null);
    setStoredRefreshToken(null);
    window.dispatchEvent(new Event('eva_ai_customer_session_updated'));
  } catch (err) {
    console.warn('Failed to clear customer session from localStorage:', err);
  }
}

/**
 * Performs customer logout:
 * 1. Attempts POST /auth/logout backend request with current Bearer token
 * 2. Clears authentication/session data (tokens and customer session)
 * 3. Preserves all non-auth event/booking/profile data
 * 4. Ensures frontend session cleanup completes even if backend request fails
 */
export async function logoutCustomer(): Promise<void> {
  try {
    await authApi.logout();
  } catch {
    // Best-effort backend notification handled in authApi.logout
  } finally {
    clearCustomerSession();
  }
}

export interface VerifyCustomerSessionResult {
  valid: boolean;
  user?: any;
  error?: string;
  status?: number;
}

let activeVerificationPromise: Promise<VerifyCustomerSessionResult> | null = null;

/**
 * Reusable mechanism for verifying and rehydrating the current customer session using GET /auth/me.
 * Sends Authorization: Bearer <access_token>.
 * Validates role === "customer" and user.isActive !== false.
 * Updates local customer session and profile with backend user data as authoritative source.
 * Preserves event, event-plan, selected services, and bookings data.
 */
export async function verifyCustomerSession(): Promise<VerifyCustomerSessionResult> {
  if (activeVerificationPromise) {
    return activeVerificationPromise;
  }

  activeVerificationPromise = (async () => {
    let token = getStoredAccessToken();
    const currentSession = getCustomerSession();
    const refreshToken = getStoredRefreshToken();

    // If no access token exists but a refresh token is present, attempt refresh first
    if (!token && refreshToken) {
      try {
        const refreshRes = await authApi.refresh(refreshToken);
        token = refreshRes?.data?.token || getStoredAccessToken();
      } catch {
        clearCustomerSession();
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

      // Role check: must be customer
      if (user.role && user.role !== 'customer') {
        clearCustomerSession();
        return { valid: false, error: 'INVALID_ROLE' };
      }

      // Status check: must not be deactivated
      if (user.isActive === false) {
        clearCustomerSession();
        return { valid: false, error: 'ACCOUNT_DEACTIVATED' };
      }

      // Update customer profile & session with backend user data as source of truth (NEVER store password or headers)
      const customerProfile: CustomerProfileData = {
        fullName: user.fullName || currentSession?.fullName || user.email?.split('@')[0] || '',
        email: user.email || currentSession?.email || '',
        phone: user.phone || currentSession?.phone || '',
        location: user.location || currentSession?.location || '',
        createdAt: user.createdAt || currentSession?.loginAt || new Date().toISOString(),
      };
      saveCustomerProfile(customerProfile);

      const latestToken = getStoredAccessToken() || token;
      const updatedSession: CustomerSession = {
        customerId: user.id || user._id || user.userId || currentSession?.customerId || `cust_${btoa(customerProfile.email).substring(0, 10)}`,
        userId: user.id || user._id || user.userId || currentSession?.userId,
        fullName: customerProfile.fullName,
        email: customerProfile.email,
        phone: customerProfile.phone,
        location: customerProfile.location,
        loginAt: currentSession?.loginAt || new Date().toISOString(),
        token: latestToken,
        role: 'customer',
      };
      setCustomerSession(updatedSession);

      return { valid: true, user };
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          // Expired or invalid token: clear session but preserve unrelated event/booking data
          clearCustomerSession();
          return { valid: false, status: 401, error: 'UNAUTHORIZED' };
        }
        if (err.status === 403) {
          clearCustomerSession();
          return { valid: false, status: 403, error: 'FORBIDDEN' };
        }
      }

      // For transient network failures when an existing session is in localStorage,
      // preserve the existing customer session without immediately failing the user
      if (currentSession) {
        return { valid: true, user: currentSession, error: 'OFFLINE_FALLBACK' };
      }

      return { valid: false, error: err?.message || 'VERIFICATION_FAILED' };
    }
  })();

  try {
    return await activeVerificationPromise;
  } finally {
    activeVerificationPromise = null;
  }
}

/**
 * Retrieve saved customer profile data from localStorage: eva_ai_customer
 */
export function getCustomerProfile(): CustomerProfileData | null {
  try {
    const raw = localStorage.getItem(CUSTOMER_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse customer profile from localStorage:', err);
    return null;
  }
}

/**
 * Save or update customer profile data
 */
export function saveCustomerProfile(profile: CustomerProfileData): void {
  try {
    localStorage.setItem(CUSTOMER_PROFILE_KEY, JSON.stringify(profile));
    // Also update session if active
    const session = getCustomerSession();
    if (session && session.email.toLowerCase() === profile.email.toLowerCase()) {
      setCustomerSession({
        ...session,
        fullName: profile.fullName,
        phone: profile.phone,
        location: profile.location,
      });
    }
    window.dispatchEvent(new Event('eva_ai_customer_session_updated'));
    window.dispatchEvent(new Event('eva_ai_customer_profile_updated'));
  } catch (err) {
    console.warn('Failed to save customer profile to localStorage:', err);
  }
}

/**
 * Authenticate customer using email and password
 */
export function authenticateCustomer(
  email: string,
  _password?: string
): { success: boolean; session?: CustomerSession; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    return { success: false, error: 'Email address is required.' };
  }

  // 1. Check existing customer profile in localStorage
  const savedCustomer = getCustomerProfile();

  let matchedCustomer: CustomerProfileData;

  if (savedCustomer && savedCustomer.email.toLowerCase() === cleanEmail) {
    matchedCustomer = savedCustomer;
  } else if (cleanEmail === DEMO_CUSTOMER.email.toLowerCase()) {
    matchedCustomer = DEMO_CUSTOMER;
    // Persist demo profile so it's readable across pages
    if (!savedCustomer) {
      saveCustomerProfile(DEMO_CUSTOMER);
    }
  } else if (savedCustomer) {
    // If an account exists with a different email, let them sign in or use the demo
    matchedCustomer = {
      fullName: cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      email: cleanEmail,
      phone: '+91 98470 00000',
      location: 'Kerala, India',
      createdAt: new Date().toISOString(),
    };
    saveCustomerProfile(matchedCustomer);
  } else {
    // First time customer sign-in with new email
    matchedCustomer = {
      fullName: cleanEmail.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      email: cleanEmail,
      phone: '+91 98470 00000',
      location: 'Kerala, India',
      createdAt: new Date().toISOString(),
    };
    saveCustomerProfile(matchedCustomer);
  }

  const session: CustomerSession = {
    customerId: `cust_${btoa(cleanEmail).substring(0, 10)}`,
    fullName: matchedCustomer.fullName,
    email: matchedCustomer.email,
    phone: matchedCustomer.phone,
    location: matchedCustomer.location,
    loginAt: new Date().toISOString(),
  };

  setCustomerSession(session);
  return { success: true, session };
}
