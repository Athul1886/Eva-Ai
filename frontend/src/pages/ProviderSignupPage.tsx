import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Icon from '../components/common/Icon';

export const ProviderSignupPage: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: '',
    businessName: '',
    email: '',
    phone: '',
    location: '',
    description: '',
    yearsExperience: '',
    startingPrice: '',
    category: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidated, setIsValidated] = useState(false);
  const [nextStepNotice, setNextStepNotice] = useState(false);

  const categories = [
    { id: 'Photographer', label: 'Photographer', icon: 'photo_camera' },
    { id: 'Event Manager', label: 'Event Manager', icon: 'hub' },
    { id: 'Makeup Artist', label: 'Makeup Artist', icon: 'brush' },
    { id: 'Venue / Auditorium', label: 'Venue / Auditorium', icon: 'castle' },
    { id: 'Caterer', label: 'Caterer', icon: 'restaurant' },
    { id: 'Decorator', label: 'Decorator', icon: 'local_florist' },
    { id: 'DJ / Entertainment', label: 'DJ / Entertainment', icon: 'speaker' },
  ];

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required.';
    if (!formData.businessName.trim()) newErrors.businessName = 'Business Name is required.';

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required.';
    } else if (!/^[0-9+\-\s()]{10,}$/.test(formData.phone.trim())) {
      newErrors.phone = 'Please enter a valid phone number (at least 10 digits).';
    }

    if (!formData.location.trim()) newErrors.location = 'Location / Address is required.';
    if (!formData.description.trim()) newErrors.description = 'Brief service description is required.';

    if (!formData.yearsExperience.trim()) {
      newErrors.yearsExperience = 'Years of experience is required.';
    } else if (isNaN(Number(formData.yearsExperience)) || Number(formData.yearsExperience) < 0) {
      newErrors.yearsExperience = 'Please enter a valid non-negative number.';
    }

    if (!formData.startingPrice.trim()) {
      newErrors.startingPrice = 'Starting price is required.';
    } else if (isNaN(Number(formData.startingPrice.replace(/[^0-9]/g, ''))) || Number(formData.startingPrice.replace(/[^0-9]/g, '')) <= 0) {
      newErrors.startingPrice = 'Please enter a valid starting price.';
    }

    if (!formData.category) {
      newErrors.category = 'Please select your service category.';
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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSelectCategory = (catId: string) => {
    setFormData((prev) => ({ ...prev, category: catId }));
    if (errors.category) {
      setErrors((prev) => ({ ...prev, category: '' }));
    }
  };

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary">
      <Header />

      <main className="flex-1 pt-28 pb-20 flex items-center justify-center relative overflow-hidden">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-secondary-container/15 rounded-full blur-[140px] pointer-events-none"></div>

        <div className="max-w-2xl w-full mx-auto px-margin-mobile md:px-margin relative z-10">
          <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-xl p-8 sm:p-10 shadow-2xl border border-surface-container-highest/60">
            {/* Header info */}
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-secondary-container/30 text-secondary mx-auto flex items-center justify-center mb-3">
                <Icon name="storefront" className="text-[24px]" />
              </div>
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-bold">
                Provider Atelier Guild
              </span>
              <h1 className="font-headline-sm text-headline-sm text-on-surface font-semibold mt-1">
                Join as a Partner Provider
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                Showcase your craft to high-intent hosts and receive pre-qualified briefs.
              </p>
            </div>

            {isValidated ? (
              /* Next-step Placeholder State */
              <div className="py-6 text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-secondary-container/40 text-secondary mx-auto flex items-center justify-center">
                  <Icon name="check_circle" className="text-[36px]" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Registration details validated successfully.
                  </h2>
                  <p className="font-body-md text-body-md text-on-surface-variant max-w-md mx-auto">
                    Category-specific information will be collected next.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-surface-container-low text-left space-y-1.5 text-sm border border-surface-container">
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Business:</span>
                    <span className="text-on-surface font-medium">{formData.businessName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Lead Name:</span>
                    <span className="text-on-surface font-medium">{formData.fullName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Category:</span>
                    <span className="text-secondary font-semibold">{formData.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-on-surface-variant">Starting Price:</span>
                    <span className="text-primary font-medium">₹{formData.startingPrice}</span>
                  </div>
                </div>

                {nextStepNotice ? (
                  <div className="p-4 rounded-xl bg-secondary-container/20 border border-secondary/30 text-secondary text-sm font-medium">
                    Category-specific onboarding (portfolio uploads, calendar sync, bank verification) will be available in the upcoming release.
                  </div>
                ) : (
                  <button
                    type="button"
                    className="w-full py-4 rounded-xl bg-secondary hover:bg-secondary-fixed-dim text-on-secondary-fixed font-title-md text-title-md font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                    onClick={() => setNextStepNotice(true)}
                  >
                    <span>Continue</span>
                    <Icon name="arrow_forward" className="text-[18px]" />
                  </button>
                )}

                <div className="pt-2">
                  <Link
                    to="/login"
                    className="font-body-sm text-body-sm text-on-surface-variant hover:text-primary transition-colors"
                  >
                    Return to Sign In
                  </Link>
                </div>
              </div>
            ) : (
              /* Provider Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Category Picker */}
                <div>
                  <label className="block font-label-md text-label-md text-outline uppercase mb-2">
                    Select Your Service Category <span className="text-secondary">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {categories.map((cat) => {
                      const isSelected = formData.category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          className={`p-3 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                            isSelected
                              ? 'bg-secondary/20 border-secondary text-on-surface shadow-sm'
                              : 'bg-surface-container border-surface-container-highest/50 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                          }`}
                          onClick={() => handleSelectCategory(cat.id)}
                        >
                          <Icon
                            name={cat.icon}
                            className={`text-[20px] ${isSelected ? 'text-secondary' : 'text-outline'}`}
                          />
                          <span className="font-title-md text-xs sm:text-sm font-semibold truncate">
                            {cat.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {errors.category && (
                    <span className="text-error font-body-sm text-xs mt-1 block">
                      {errors.category}
                    </span>
                  )}
                </div>

                {/* Full Name & Business Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md text-outline uppercase mb-1">
                      Full Name <span className="text-secondary">*</span>
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/50"
                      placeholder="Rohit Menon"
                    />
                    {errors.fullName && (
                      <span className="text-error font-body-sm text-xs mt-1 block">
                        {errors.fullName}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block font-label-md text-label-md text-outline uppercase mb-1">
                      Business Name <span className="text-secondary">*</span>
                    </label>
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      className="w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/50"
                      placeholder="Menon Visuals &amp; Films"
                    />
                    {errors.businessName && (
                      <span className="text-error font-body-sm text-xs mt-1 block">
                        {errors.businessName}
                      </span>
                    )}
                  </div>
                </div>

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md text-outline uppercase mb-1">
                      Business Email <span className="text-secondary">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/50"
                      placeholder="studio@menonvisuals.com"
                    />
                    {errors.email && (
                      <span className="text-error font-body-sm text-xs mt-1 block">
                        {errors.email}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block font-label-md text-label-md text-outline uppercase mb-1">
                      Phone Number <span className="text-secondary">*</span>
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/50"
                      placeholder="+91 94470 12345"
                    />
                    {errors.phone && (
                      <span className="text-error font-body-sm text-xs mt-1 block">
                        {errors.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Location / Address */}
                <div>
                  <label className="block font-label-md text-label-md text-outline uppercase mb-1">
                    Location / Address <span className="text-secondary">*</span>
                  </label>
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/50"
                    placeholder="Palakkad, Kerala"
                  />
                  {errors.location && (
                    <span className="text-error font-body-sm text-xs mt-1 block">
                      {errors.location}
                    </span>
                  )}
                </div>

                {/* Years Experience & Starting Price */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md text-outline uppercase mb-1">
                      Years of Experience <span className="text-secondary">*</span>
                    </label>
                    <input
                      type="number"
                      name="yearsExperience"
                      value={formData.yearsExperience}
                      onChange={handleChange}
                      className="w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/50"
                      placeholder="7"
                    />
                    {errors.yearsExperience && (
                      <span className="text-error font-body-sm text-xs mt-1 block">
                        {errors.yearsExperience}
                      </span>
                    )}
                  </div>

                  <div>
                    <label className="block font-label-md text-label-md text-outline uppercase mb-1">
                      Starting Price (₹ INR) <span className="text-secondary">*</span>
                    </label>
                    <input
                      type="text"
                      name="startingPrice"
                      value={formData.startingPrice}
                      onChange={handleChange}
                      className="w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/50"
                      placeholder="40,000"
                    />
                    {errors.startingPrice && (
                      <span className="text-error font-body-sm text-xs mt-1 block">
                        {errors.startingPrice}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block font-label-md text-label-md text-outline uppercase mb-1">
                    Description of Services <span className="text-secondary">*</span>
                  </label>
                  <textarea
                    rows={3}
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full p-4 rounded-xl bg-surface-container text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/50 resize-none"
                    placeholder="Briefly describe your equipment, team size, specialty styles, and regional coverage..."
                  />
                  {errors.description && (
                    <span className="text-error font-body-sm text-xs mt-1 block">
                      {errors.description}
                    </span>
                  )}
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-4 rounded-xl bg-secondary hover:bg-secondary-fixed-dim text-on-secondary-fixed font-title-md text-title-md font-bold transition-all shadow-[0_0_20px_rgba(255,178,190,0.25)] hover:shadow-[0_0_30px_rgba(255,178,190,0.4)] flex items-center justify-center gap-2"
                  >
                    <span>Continue</span>
                    <Icon name="arrow_forward" className="text-[18px]" />
                  </button>
                </div>
              </form>
            )}

            {/* Link to Login */}
            <div className="text-center mt-6 pt-4 border-t border-surface-container">
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Already have an account?{' '}
                <Link className="text-primary font-semibold hover:underline" to="/login">
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

export default ProviderSignupPage;
