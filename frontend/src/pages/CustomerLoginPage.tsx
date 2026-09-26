import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Icon from '../components/common/Icon';
import {
  getCustomerSession,
  setCustomerSession,
  getCustomerProfile,
  saveCustomerProfile,
  CustomerSession,
  CustomerProfileData,
  DEMO_CUSTOMER,
} from '../utils/customerAuth';
import { authApi, setStoredAccessToken, setStoredRefreshToken, ApiError } from '../api/api';

export const CustomerLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/customer/dashboard';

  // Check if customer is already logged in -> redirect to dashboard
  useEffect(() => {
    if (getCustomerSession()) {
      navigate('/customer/dashboard', { replace: true });
    }
  }, [navigate]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [forgotPasswordNotice, setForgotPasswordNotice] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = formData.email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!formData.password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Call authApi.login sending ONLY { email, password }
      const res = await authApi.login({
        email: cleanEmail,
        password: formData.password,
      });

      // 2. Extract tokens and user payload from response
      const accessToken =
        res?.data?.session?.access_token ||
        res?.data?.token ||
        res?.data?.accessToken ||
        res?.session?.access_token ||
        res?.token ||
        res?.accessToken ||
        null;

      const refreshToken =
        res?.data?.session?.refresh_token ||
        res?.data?.refreshToken ||
        res?.session?.refresh_token ||
        res?.refreshToken ||
        null;

      const backendUser =
        res?.data?.user && typeof res.data.user === 'object'
          ? res.data.user
          : res?.user && typeof res.user === 'object'
          ? res.user
          : res?.data && typeof res.data === 'object' && ('id' in res.data || 'email' in res.data)
          ? res.data
          : null;

      // 3. Customer / Provider Role separation check (Requirement 9)
      const role = backendUser?.role || res?.data?.role;
      if (role && role !== 'customer') {
        setErrorMessage(
          'This account is registered as a service provider. Please sign in via the Provider Portal.'
        );
        setIsSubmitting(false);
        return;
      }

      // Check account active state
      if (backendUser?.isActive === false) {
        setErrorMessage('Your account has been deactivated. Please contact support.');
        setIsSubmitting(false);
        return;
      }

      const backendUserId =
        backendUser?.id || backendUser?._id || backendUser?.userId || null;

      // 4. Centralized token persistence
      if (accessToken) {
        setStoredAccessToken(accessToken);
      }
      if (refreshToken) {
        setStoredRefreshToken(refreshToken);
      }

      // 5. Store customer session and profile with backend user data as source of truth (NEVER store password)
      const customerProfile: CustomerProfileData = {
        fullName: backendUser?.fullName || cleanEmail.split('@')[0],
        email: backendUser?.email || cleanEmail,
        phone: backendUser?.phone || '',
        location: backendUser?.location || '',
        createdAt: backendUser?.createdAt || new Date().toISOString(),
      };
      saveCustomerProfile(customerProfile);

      const customerSession: CustomerSession = {
        customerId: backendUserId || `cust_${btoa(cleanEmail).substring(0, 10)}`,
        userId: backendUserId || undefined,
        fullName: customerProfile.fullName,
        email: customerProfile.email,
        phone: customerProfile.phone,
        location: customerProfile.location,
        loginAt: new Date().toISOString(),
        token: accessToken || undefined,
        role: 'customer',
      };
      setCustomerSession(customerSession);

      // 6. Redirect to /customer/dashboard or originating route
      navigate(from, { replace: true });
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setErrorMessage('Invalid email or password. Please check your credentials.');
        } else if (err.status === 403) {
          setErrorMessage(
            err.message || 'Your account has been deactivated. Please contact support.'
          );
        } else if (err.status === 400) {
          const msg =
            err.message ||
            (err.missingFields && err.missingFields.length > 0
              ? `Missing required fields: ${err.missingFields.join(', ')}`
              : 'Please enter a valid email and password.');
          setErrorMessage(msg);
        } else {
          setErrorMessage('Login failed. Please try again later or check your network connection.');
        }
      } else {
        setErrorMessage(
          'Unable to connect to the server. Please check your network connection.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoFill = () => {
    const existing = getCustomerProfile();
    setFormData({
      email: existing ? existing.email : DEMO_CUSTOMER.email,
      password: 'password123',
      rememberMe: true,
    });
    setErrorMessage('');
  };

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary">
      <Header />

      <main className="flex-1 pt-28 pb-20 flex items-center justify-center relative overflow-hidden">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-secondary-container/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-md w-full mx-auto px-4 sm:px-6 relative z-10">
          <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-2xl p-8 sm:p-10 shadow-2xl border border-surface-container-highest/60">
            {/* Header info */}
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary mx-auto flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(242,202,80,0.2)]">
                <Icon name="celebration" className="text-[24px]" />
              </div>
              <span className="font-label-sm text-xs uppercase tracking-widest text-primary font-bold">
                Customer Portal
              </span>
              <h1 className="font-headline-sm text-2xl font-bold text-on-surface mt-1">
                Customer Sign In
              </h1>
              <p className="font-body-sm text-xs text-on-surface-variant mt-1.5">
                Sign in to plan your event, manage your selected services, and track booking requests.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-6 p-3.5 rounded-xl bg-error/15 border border-error/30 text-error text-xs font-medium flex items-center gap-2.5 animate-in fade-in duration-150">
                <Icon name="error" className="text-[18px] shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Forgot Password Coming Soon Notice */}
            {forgotPasswordNotice && (
              <div className="mb-6 p-3.5 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-medium flex items-center justify-between animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <Icon name="info" className="text-[18px] shrink-0" />
                  <span>Password recovery will be available with secure backend sync.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setForgotPasswordNotice(false)}
                  className="text-xs hover:underline text-on-surface-variant"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Email Address <span className="text-primary">*</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="name@example.com"
                    className="w-full px-4 py-3 rounded-xl bg-surface-container text-on-surface placeholder:text-outline/60 border border-surface-container-highest focus:border-primary focus:outline-none transition-colors text-sm"
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none">
                    <Icon name="mail" className="text-[18px]" />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    Password <span className="text-primary">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setForgotPasswordNotice(true)}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 rounded-xl bg-surface-container text-on-surface placeholder:text-outline/60 border border-surface-container-highest focus:border-primary focus:outline-none transition-colors text-sm pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[18px]" />
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={(e) => setFormData((prev) => ({ ...prev, rememberMe: e.target.checked }))}
                    className="w-4 h-4 rounded bg-surface-container border-surface-container-highest text-primary focus:ring-primary accent-[#F2CA50]"
                  />
                  <span className="text-xs text-on-surface-variant">Remember me</span>
                </label>
              </div>

              {/* Submit CTA Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md text-sm font-bold transition-all shadow-[0_0_20px_rgba(242,202,80,0.3)] hover:shadow-[0_0_30px_rgba(242,202,80,0.5)] flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In as Customer</span>
                      <Icon name="arrow_forward" className="text-[18px]" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Demo Credentials Helper */}
            <div className="mt-5 p-3 rounded-xl bg-surface-container/70 border border-surface-container-highest/50 text-center">
              <span className="text-[11px] text-on-surface-variant block mb-1.5">
                Quick Demo Customer Account:
              </span>
              <button
                type="button"
                onClick={handleDemoFill}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container-high hover:bg-surface-bright text-xs text-primary font-semibold transition-colors border border-primary/30"
              >
                <Icon name="auto_awesome" className="text-[14px]" />
                <span>Fill Ananya Nair Demo</span>
              </button>
            </div>

            {/* Links to Signup and Provider Sign In */}
            <div className="text-center mt-6 pt-4 border-t border-surface-container space-y-2">
              <p className="text-xs text-on-surface-variant">
                Don&apos;t have an account?{' '}
                <Link className="text-primary font-semibold hover:underline" to="/signup/customer">
                  Create Customer Account
                </Link>
              </p>
              <p className="text-xs text-on-surface-variant">
                Are you a service provider?{' '}
                <Link className="text-secondary font-semibold hover:underline" to="/login/provider">
                  Provider Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CustomerLoginPage;
