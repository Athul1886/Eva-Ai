import { CustomerProfileData } from '../pages/CustomerSignupPage';
import { apiClient, setAuthTokens, clearAuthTokens } from './api';

export const CUSTOMER_SESSION_KEY = 'eva_ai_customer_session';
export const CUSTOMER_PROFILE_KEY = 'eva_ai_customer';

export interface CustomerSession {
  customerId: string;
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  loginAt: string;
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
 * Clear customer session and JWT tokens from localStorage
 */
export function clearCustomerSession(): void {
  try {
    localStorage.removeItem(CUSTOMER_SESSION_KEY);
    clearAuthTokens();
    window.dispatchEvent(new Event('eva_ai_customer_session_updated'));
  } catch (err) {
    console.warn('Failed to clear customer session from localStorage:', err);
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
  } catch (err) {
    console.warn('Failed to save customer profile to localStorage:', err);
  }
}

/**
 * Authenticate customer using email and password against backend POST /api/auth/login
 */
export async function authenticateCustomer(
  email: string,
  password?: string
): Promise<{ success: boolean; session?: CustomerSession; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    return { success: false, error: 'Email address is required.' };
  }
  if (!password) {
    return { success: false, error: 'Password is required.' };
  }

  try {
    const data = await apiClient.post('/auth/login', {
      email: cleanEmail,
      password,
    }, { requiresAuth: false });

    if (!data.success || !data.user) {
      return { success: false, error: data.message || 'Authentication failed.' };
    }

    // Verify role is customer or compatible
    if (data.user.role && data.user.role !== 'customer') {
      return {
        success: false,
        error: `This account is registered as a ${data.user.role}. Please sign in through the provider portal.`,
      };
    }

    // Store JWT access & refresh tokens
    const accessToken = data.token || data.session?.access_token;
    const refreshToken = data.session?.refresh_token;
    if (accessToken) {
      setAuthTokens({ accessToken, refreshToken });
    }

    const session: CustomerSession = {
      customerId: data.user.id,
      fullName: data.user.fullName || data.user.name || cleanEmail.split('@')[0],
      email: data.user.email,
      phone: data.user.phone || undefined,
      location: data.user.location || undefined,
      loginAt: new Date().toISOString(),
    };

    setCustomerSession(session);

    saveCustomerProfile({
      fullName: session.fullName,
      email: session.email,
      phone: session.phone || '',
      location: session.location || '',
      createdAt: data.user.createdAt || new Date().toISOString(),
    });

    return { success: true, session };
  } catch (err: any) {
    const message = err?.message || 'Login failed. Please check your credentials.';
    return { success: false, error: message };
  }
}
