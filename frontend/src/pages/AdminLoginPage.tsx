import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Icon from '../components/common/Icon';
import ThemeToggle from '../components/common/ThemeToggle';
import {
  getAdminSession,
  setAdminSession,
  AdminSession,
  clearAdminSession,
} from '../utils/adminAuth';
import { authApi, setStoredAccessToken, setStoredRefreshToken, ApiError } from '../api/api';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/admin/dashboard';

  // Check if admin is already logged in -> redirect to dashboard
  useEffect(() => {
    const session = getAdminSession();
    if (session && session.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [navigate]);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanEmail = formData.email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMessage('Please enter your administrator email address.');
      return;
    }
    if (!formData.password) {
      setErrorMessage('Please enter your administrator password.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Call authApi.login sending { email, password }
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

      // 3. Strict Admin Role verification
      const role = (backendUser?.role || res?.data?.role || '').toLowerCase();
      if (!role || role !== 'admin') {
        clearAdminSession();
        setErrorMessage(
          role === 'customer'
            ? 'Access Denied: This account is registered as a Customer. Administrator privileges required.'
            : role === 'provider'
              ? 'Access Denied: This account is registered as a Service Provider. Administrator privileges required.'
              : 'Access Denied: You do not possess administrator privileges for this portal.'
        );
        setIsSubmitting(false);
        return;
      }

      // Check account active state
      if (backendUser?.isActive === false) {
        clearAdminSession();
        setErrorMessage('This administrator account has been deactivated. Please contact root support.');
        setIsSubmitting(false);
        return;
      }

      // 4. Store tokens
      if (accessToken) {
        setStoredAccessToken(accessToken);
      }
      if (refreshToken) {
        setStoredRefreshToken(refreshToken);
      }

      // 5. Store admin session
      const adminSession: AdminSession = {
        adminId: backendUser?.id || backendUser?._id || backendUser?.userId || 'admin',
        userId: backendUser?.id || backendUser?._id || backendUser?.userId,
        fullName: backendUser?.fullName || backendUser?.name || 'Administrator',
        email: backendUser?.email || cleanEmail,
        role: 'admin',
        loginAt: new Date().toISOString(),
        token: accessToken || undefined,
      };

      setAdminSession(adminSession);

      // 6. Navigate to /admin/dashboard or previous destination
      navigate(from, { replace: true });
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 401 || err.status === 403) {
          setErrorMessage('Invalid administrator email or password.');
        } else if (err.status === 404) {
          setErrorMessage('No administrator account found with this email.');
        } else {
          setErrorMessage(err.message || 'Authentication failed. Please try again.');
        }
      } else {
        setErrorMessage(
          err?.message || 'Unable to connect to the authentication server. Please check your network connection.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary relative overflow-hidden">
      {/* Top minimal bar with branding & theme toggle */}
      <div className="absolute top-0 left-0 right-0 z-20 px-6 py-5 flex items-center justify-between max-w-[1440px] mx-auto">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center shadow-[inset_0_1px_1px_rgba(242,202,80,0.3)] transition-transform group-hover:scale-105">
            <Icon name="shield" className="text-primary text-[18px]" />
          </div>
          <span className="font-headline-sm text-title-md tracking-tight font-bold text-on-surface">
            Eva<span className="text-primary italic font-normal">.Ai</span>
          </span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Ambient background glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-20 right-0 w-96 h-96 bg-secondary-container/15 rounded-full blur-[120px] pointer-events-none" />

      <main className="flex-1 flex items-center justify-center px-4 py-24 relative z-10">
        <div className="max-w-md w-full mx-auto">
          {/* Main Card */}
          <div className="rounded-3xl bg-surface-container-high/70 backdrop-blur-2xl p-8 sm:p-10 shadow-2xl border border-surface-container-highest/60 relative">
            {/* Top Shield Badge */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-container border border-primary/20 text-primary shadow-[inset_0_1px_1px_rgba(242,202,80,0.3)] mb-4">
                <Icon name="admin_panel_settings" className="text-[30px]" />
              </div>
              <span className="block font-label-sm text-[10px] uppercase tracking-widest text-primary font-bold">
                Control Center Authorization
              </span>
              <h1 className="font-display-hero text-headline-sm font-semibold text-on-surface mt-1">
                Admin Atelier Portal
              </h1>
              <p className="text-body-sm text-on-surface-variant mt-2">
                Sign in with verified administrator credentials to access platform governance.
              </p>
            </div>

            {/* Error Message Alert */}
            {errorMessage && (
              <div className="mb-6 p-4 rounded-xl bg-error/10 border border-error/30 text-error flex items-start gap-3 text-body-sm animate-in fade-in duration-200">
                <Icon name="error" className="text-[20px] shrink-0 mt-0.5" />
                <div className="flex-1 leading-relaxed">{errorMessage}</div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-body-sm font-semibold text-on-surface mb-2">
                  Admin Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
                    <Icon name="mail" className="text-[18px]" />
                  </div>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="admin@eva-ai.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface-container border border-surface-container-highest/80 focus:border-primary focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-on-surface-variant/50 text-body-sm transition-all outline-none"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-body-sm font-semibold text-on-surface mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
                    <Icon name="lock" className="text-[18px]" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-11 py-3 rounded-xl bg-surface-container border border-surface-container-highest/80 focus:border-primary focus:ring-2 focus:ring-primary/20 text-on-surface placeholder:text-on-surface-variant/50 text-body-sm transition-all outline-none"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-on-surface-variant hover:text-on-surface transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <Icon name={showPassword ? 'visibility_off' : 'visibility'} className="text-[18px]" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                    className="w-4 h-4 rounded border-surface-container-highest text-primary focus:ring-primary/30 bg-surface-container"
                  />
                  <span className="text-body-sm text-on-surface-variant">Remember session</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3.5 rounded-xl bg-primary hover:bg-tertiary disabled:opacity-50 text-on-primary font-title-md text-body-md font-bold transition-all shadow-[0_0_20px_rgba(242,202,80,0.25)] hover:shadow-[0_0_30px_rgba(242,202,80,0.45)] flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Admin Control Center</span>
                    <Icon name="arrow_forward" className="text-[18px]" />
                  </>
                )}
              </button>
            </form>

            {/* Bottom Portal Navigation Links */}
            <div className="mt-8 pt-6 border-t border-surface-container-highest/60 text-center space-y-2">
              <p className="text-label-sm text-on-surface-variant">
                Not an administrator?{' '}
                <Link to="/login" className="text-primary hover:underline font-semibold">
                  Standard Portal Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLoginPage;
