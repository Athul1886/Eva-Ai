import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Icon from '../components/common/Icon';

export interface CustomerProfileData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  createdAt: string;
}

export const CustomerSignupPage: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    location: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);
  const [savedProfile, setSavedProfile] = useState<CustomerProfileData | null>(null);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    // Full Name
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full Name is required.';
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = 'Full Name must contain at least 2 characters.';
    } else if (!/^[a-zA-Z\s.'-]+$/.test(formData.fullName.trim())) {
      newErrors.fullName = 'Full Name should only contain letters and standard name characters.';
    }

    // Email
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please provide a valid email address (e.g. name@domain.com).';
    }

    // Phone Number
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required.';
    } else {
      const digitsOnly = formData.phone.replace(/[^0-9]/g, '');
      if (digitsOnly.length < 10) {
        newErrors.phone = 'Please enter a valid phone number with at least 10 digits.';
      }
    }

    // Location
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required (e.g. Palakkad, Kochi, Bangalore).';
    }

    // Password
    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    // Confirm Password
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm Password is required.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validate()) {
      // Temporary frontend storage in localStorage (NEVER store sensitive passwords)
      const customerData: CustomerProfileData = {
        fullName: formData.fullName.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        location: formData.location.trim(),
        createdAt: new Date().toISOString(),
      };

      try {
        localStorage.setItem('eva_ai_customer', JSON.stringify(customerData));
      } catch (storageErr) {
        console.warn('Unable to write to localStorage:', storageErr);
      }

      setSavedProfile(customerData);
      setIsSuccess(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
        <div className="absolute -bottom-20 right-0 w-96 h-96 bg-secondary-container/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-xl w-full mx-auto px-margin-mobile md:px-margin relative z-10">
          {/* Back Navigation */}
          <div className="mb-6">
            <Link
              to="/signup"
              className="inline-flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
            >
              <Icon name="arrow_back" className="text-[16px]" />
              <span>Back to account type</span>
            </Link>
          </div>

          <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-xl p-8 sm:p-10 shadow-2xl border border-surface-container-highest/60">
            {/* Header info */}
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary mx-auto flex items-center justify-center mb-3">
                <Icon name="celebration" className="text-[24px]" />
              </div>
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
                Customer Account
              </span>
              <h1 className="font-headline-sm text-headline-sm text-on-surface font-semibold mt-1">
                Create your customer account
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 max-w-sm mx-auto">
                This account will be used to plan and manage your events with verified providers.
              </p>
            </div>

            {isSuccess ? (
              /* Success State */
              <div className="py-6 text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-primary/20 text-primary mx-auto flex items-center justify-center shadow-[0_0_20px_rgba(242,202,80,0.25)]">
                  <Icon name="check_circle" className="text-[36px]" />
                </div>

                <div className="space-y-2">
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Your details are ready.
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-sm mx-auto">
                    Let&apos;s set up your event preferences next.
                  </p>
                </div>

                {savedProfile && (
                  <div className="p-4 rounded-xl bg-surface-container-low text-left space-y-2 text-sm border border-surface-container">
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Host Name:</span>
                      <span className="text-on-surface font-semibold">{savedProfile.fullName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Email:</span>
                      <span className="text-on-surface font-semibold">{savedProfile.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Phone:</span>
                      <span className="text-on-surface font-semibold">{savedProfile.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-on-surface-variant">Location:</span>
                      <span className="text-on-surface font-semibold">{savedProfile.location}</span>
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="button"
                    className="w-full py-4 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md text-title-md font-bold transition-all shadow-[0_0_20px_rgba(242,202,80,0.3)] hover:shadow-[0_0_30px_rgba(242,202,80,0.5)] flex items-center justify-center gap-2"
                    onClick={() => navigate('/onboarding/event')}
                  >
                    <span>Continue</span>
                    <Icon name="arrow_forward" className="text-[18px]" />
                  </button>
                </div>
              </div>
            ) : (
              /* Registration Form */
              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block font-label-md text-label-md text-outline uppercase mb-1">
                    Full Name <span className="text-primary">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className={`w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-primary border ${
                      errors.fullName ? 'border-error' : 'border-surface-container-highest/50'
                    }`}
                    placeholder="Meera Nambiar"
                  />
                  {errors.fullName && (
                    <span className="text-error font-body-sm text-xs mt-1 block">
                      {errors.fullName}
                    </span>
                  )}
                </div>

                {/* Email Address */}
                <div>
                  <label className="block font-label-md text-label-md text-outline uppercase mb-1">
                    Email Address <span className="text-primary">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-primary border ${
                      errors.email ? 'border-error' : 'border-surface-container-highest/50'
                    }`}
                    placeholder="meera@domain.com"
                  />
                  {errors.email && (
                    <span className="text-error font-body-sm text-xs mt-1 block">
                      {errors.email}
                    </span>
                  )}
                </div>

                {/* Phone & Location Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md text-outline uppercase mb-1">
                      Phone Number <span className="text-primary">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className={`w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-primary border ${
                        errors.phone ? 'border-error' : 'border-surface-container-highest/50'
                      }`}
                      placeholder="+91 98765 43210"
                    />
                    {errors.phone && (
                      <span className="text-error font-body-sm text-xs mt-1 block">
                        {errors.phone}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block font-label-md text-label-md text-outline uppercase mb-1">
                      Location <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className={`w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-primary border ${
                        errors.location ? 'border-error' : 'border-surface-container-highest/50'
                      }`}
                      placeholder="Palakkad, Kerala"
                    />
                    {errors.location && (
                      <span className="text-error font-body-sm text-xs mt-1 block">
                        {errors.location}
                      </span>
                    )}
                  </div>
                </div>

                {/* Password & Confirm Password Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md text-outline uppercase mb-1">
                      Password <span className="text-primary">*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className={`w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-primary border ${
                        errors.password ? 'border-error' : 'border-surface-container-highest/50'
                      }`}
                      placeholder="••••••••"
                    />
                    {errors.password && (
                      <span className="text-error font-body-sm text-xs mt-1 block">
                        {errors.password}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block font-label-md text-label-md text-outline uppercase mb-1">
                      Confirm Password <span className="text-primary">*</span>
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-primary border ${
                        errors.confirmPassword ? 'border-error' : 'border-surface-container-highest/50'
                      }`}
                      placeholder="••••••••"
                    />
                    {errors.confirmPassword && (
                      <span className="text-error font-body-sm text-xs mt-1 block">
                        {errors.confirmPassword}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-4 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md text-title-md font-bold transition-all shadow-[0_0_20px_rgba(242,202,80,0.3)] hover:shadow-[0_0_30px_rgba(242,202,80,0.5)] flex items-center justify-center gap-2"
                  >
                    <span>Create Customer Account</span>
                    <Icon name="arrow_forward" className="text-[18px]" />
                  </button>
                </div>
              </form>
            )}

            {/* Below Form: Already have an account? Sign In */}
            <div className="text-center mt-6 pt-4 border-t border-surface-container">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Already have an account?{' '}
                <Link className="text-primary font-semibold hover:underline transition-colors" to="/login">
                  Sign In
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

export default CustomerSignupPage;
