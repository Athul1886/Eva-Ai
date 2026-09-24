import { CustomerProfileData } from '../pages/CustomerSignupPage';

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
 * Clear customer session from localStorage (preserves event, bookings, and selected services)
 */
export function clearCustomerSession(): void {
  try {
    localStorage.removeItem(CUSTOMER_SESSION_KEY);
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
