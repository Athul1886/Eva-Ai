import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Icon from '../components/common/Icon';
import { loginProvider, getProviderSession } from '../utils/providerAuth';

export const ProviderLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/provider/dashboard';

  // Check if provider is already logged in -> redirect to dashboard
  useEffect(() => {
    if (getProviderSession()) {
      navigate('/provider/dashboard', { replace: true });
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
      setErrorMessage('Please enter your business email.');
      return;
    }
    if (!formData.password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await loginProvider(cleanEmail, formData.password);
      setIsSubmitting(false);

      if (result.success) {
        navigate(from, { replace: true });
      } else {
        setErrorMessage(result.error || 'Authentication failed. Please check your credentials.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMessage(err?.message || 'Authentication failed. Please check your credentials.');
    }
  };

  const handleDemoFill = () => {
    setFormData({
      email: 'studio@lenscraft.com',
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
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-secondary-container/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-primary/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-md w-full mx-auto px-4 sm:px-6 relative z-10">
          <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-2xl p-8 sm:p-10 shadow-2xl border border-surface-container-highest/60">
            {/* Header info */}
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-secondary-container/30 text-secondary mx-auto flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(255,178,190,0.2)]">
                <Icon name="badge" className="text-[24px]" />
              </div>
              <span className="font-label-sm text-xs uppercase tracking-widest text-secondary font-bold">
                Provider Atelier Portal
              </span>
              <h1 className="font-headline-sm text-2xl font-bold text-on-surface mt-1">
                Provider Sign In
              </h1>
              <p className="font-body-sm text-xs text-on-surface-variant mt-1.5">
                Sign in to manage client booking requests, update event calendars, and manage services.
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
              <div className="mb-6 p-3.5 rounded-xl bg-secondary-container/20 border border-secondary/30 text-secondary text-xs font-medium flex items-center justify-between animate-in fade-in duration-150">
                <div className="flex items-center gap-2">
                  <Icon name="info" className="text-[18px] shrink-0" />
                  <span>Password recovery will be available with server integration.</span>
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

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                  Business Email <span className="text-secondary">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                  placeholder="e.g. studio@lenscraft.com"
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-outline uppercase tracking-wider">
                    Password <span className="text-secondary">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setForgotPasswordNotice(true)}
                    className="text-[11px] text-secondary hover:underline font-medium"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full h-12 pl-4 pr-11 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
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
                    onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                    className="w-4 h-4 rounded text-secondary focus:ring-secondary border-surface-container-highest"
                  />
                  <span className="text-xs text-on-surface-variant font-medium">Remember me</span>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-xl bg-secondary hover:bg-secondary-fixed-dim text-on-secondary-fixed font-title-md text-sm font-bold transition-all shadow-[0_0_20px_rgba(255,178,190,0.25)] hover:shadow-[0_0_30px_rgba(255,178,190,0.4)] flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-on-secondary-fixed border-t-transparent rounded-full animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In as Provider</span>
                      <Icon name="arrow_forward" className="text-[18px]" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Demo Credentials Autofill Helper */}
            <div className="mt-5 p-3 rounded-xl bg-surface-container/70 border border-surface-container-highest/50 text-center">
              <span className="text-[11px] text-on-surface-variant block mb-1.5">
                Quick Demo Atelier Account:
              </span>
              <button
                type="button"
                onClick={handleDemoFill}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-surface-container-high hover:bg-surface-bright text-xs text-secondary font-semibold transition-colors border border-secondary/30"
              >
                <Icon name="auto_awesome" className="text-[14px]" />
                <span>Fill LensCraft Studio Demo</span>
              </button>
            </div>

            {/* Create account link */}
            <div className="text-center mt-6 pt-4 border-t border-surface-container space-y-2">
              <p className="text-xs text-on-surface-variant">
                Don&apos;t have a provider account?{' '}
                <Link className="text-secondary font-semibold hover:underline" to="/signup/provider">
                  Join as Provider
                </Link>
              </p>
              <p className="text-xs text-on-surface-variant">
                Are you an event host or client?{' '}
                <Link className="text-primary font-semibold hover:underline" to="/login/customer">
                  Customer Sign In
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

export default ProviderLoginPage;
