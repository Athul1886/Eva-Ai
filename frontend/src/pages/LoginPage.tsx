import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Icon from '../components/common/Icon';

export const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidated, setIsValidated] = useState(false);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setIsValidated(true);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary">
      <Header />

      <main className="flex-1 pt-28 pb-20 flex items-center justify-center relative overflow-hidden">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-primary/10 rounded-full blur-[140px] pointer-events-none"></div>

        <div className="max-w-md w-full mx-auto px-margin-mobile md:px-margin relative z-10">
          <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-xl p-8 sm:p-10 shadow-2xl border border-surface-container-highest/60">
            {/* Header info */}
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary mx-auto flex items-center justify-center mb-3">
                <Icon name="lock" className="text-[24px]" />
              </div>
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
                Access The Atelier
              </span>
              <h1 className="font-headline-sm text-headline-sm text-on-surface font-semibold mt-1">
                Sign in to Eva-Ai
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                Welcome back. Enter your credentials to access your account.
              </p>
            </div>

            {isValidated ? (
              /* Validation Success Mock State */
              <div className="py-6 text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-primary/20 text-primary mx-auto flex items-center justify-center">
                  <Icon name="check_circle" className="text-[36px]" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Login details validated successfully.
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-xs mx-auto">
                    Account authentication will connect to the secure identity service in the upcoming application phase.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-surface-container-low text-left space-y-1.5 text-sm border border-surface-container">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Validated Email:</span>
                    <span className="text-on-surface font-medium">{formData.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Validation Status:</span>
                    <span className="text-primary font-semibold">Passed Frontend Checks</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full py-3.5 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface font-title-md text-title-md transition-all border border-surface-container-highest"
                  onClick={() => setIsValidated(false)}
                >
                  Edit Login Details
                </button>
              </div>
            ) : (
              /* Login Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email */}
                <div>
                  <label className="block font-label-md text-label-md text-outline uppercase mb-1">
                    Email Address <span className="text-primary">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-primary border border-surface-container-highest/50"
                    placeholder="you@domain.com"
                  />
                  {errors.email && (
                    <span className="text-error font-body-sm text-xs mt-1 block">
                      {errors.email}
                    </span>
                  )}
                </div>

                {/* Password */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-label-md text-label-md text-outline uppercase">
                      Password <span className="text-primary">*</span>
                    </label>
                  </div>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-primary border border-surface-container-highest/50"
                    placeholder="••••••••"
                  />
                  {errors.password && (
                    <span className="text-error font-body-sm text-xs mt-1 block">
                      {errors.password}
                    </span>
                  )}
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    className="w-full py-4 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md text-title-md font-bold transition-all shadow-[0_0_20px_rgba(242,202,80,0.3)] hover:shadow-[0_0_30px_rgba(242,202,80,0.5)] flex items-center justify-center gap-2"
                  >
                    <span>Sign In</span>
                    <Icon name="arrow_forward" className="text-[18px]" />
                  </button>
                </div>
              </form>
            )}

            {/* Create account link */}
            <div className="text-center mt-6 pt-4 border-t border-surface-container">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Don&apos;t have an account?{' '}
                <Link className="text-primary font-semibold hover:underline" to="/signup">
                  Create one
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

export default LoginPage;
