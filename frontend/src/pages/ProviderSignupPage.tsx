import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Icon from '../components/common/Icon';
import { ProviderCategoryType, CategorySpecificData, ProviderAccount, ProviderSession } from '../types/provider';
import {
  saveProviderAccount,
  setProviderSession,
  hashPassword,
  seedDemoBookingIfEmpty,
} from '../utils/providerAuth';

const CATEGORIES: { id: ProviderCategoryType; label: string; icon: string; subtitle: string }[] = [
  { id: 'Photographer', label: 'Photographer', icon: 'photo_camera', subtitle: 'Cinematography & Heirloom Albums' },
  { id: 'Event Manager', label: 'Event Manager', icon: 'hub', subtitle: 'End-to-end luxury coordination' },
  { id: 'Makeup Artist', label: 'Makeup Artist', icon: 'brush', subtitle: 'Bridal makeovers & HD airbrush' },
  { id: 'Venue / Auditorium', label: 'Venue / Auditorium', icon: 'castle', subtitle: 'Grand ballrooms & convention halls' },
  { id: 'Caterer', label: 'Caterer', icon: 'restaurant', subtitle: 'Traditional sadyas & royal banquets' },
  { id: 'Decorator', label: 'Decorator', icon: 'local_florist', subtitle: 'Floral mandaps & chandelier arches' },
  { id: 'DJ / Entertainment', label: 'DJ / Entertainment', icon: 'speaker', subtitle: 'Celebrity DJs & acoustic acts' },
];

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
];

export const ProviderSignupPage: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Step 1: Basic Information
  const [basicInfo, setBasicInfo] = useState({
    fullName: '',
    businessName: '',
    email: '',
    phone: '',
    location: '',
    description: '',
    yearsExperience: '',
    startingPrice: '',
    profileImage: PRESET_AVATARS[0],
  });

  // Step 2: Category
  const [selectedCategory, setSelectedCategory] = useState<ProviderCategoryType | ''>('');

  // Step 3: Category-Specific Information
  const [catData, setCatData] = useState<CategorySpecificData>({
    photographyStyles: ['Candid Photography', 'Cinematic Wedding Films'],
    equipment: '',
    eventTypesHandled: ['Weddings', 'Receptions'],
    previousExperience: '',
    makeupTypes: ['Bridal HD Makeup', 'Hair Artistry'],
    capacity: 500,
    hasAC: true,
    hasParking: true,
    hasStage: true,
    hasDining: true,
    roomsCount: 4,
    otherFacilities: '',
    cuisineTypes: ['Kerala Sadhya', 'North Indian Royal'],
    pricePerPerson: 650,
    minGuests: 100,
    maxGuests: 1500,
    decorStyles: ['Royal Floral Mandap', 'Contemporary Minimalist'],
    djEquipment: '',
    entertainmentTypes: ['Celebrity DJ', 'Live Symphony'],
    servicesOffered: ['Full Event Coverage', 'Consultation & Planning'],
    portfolioImages: [
      'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
    ],
    packageInfo: [
      { name: 'Classic Gold Tier', price: 45000, description: 'Core essential coverage for single-day celebrations.' },
      { name: 'Royal Platinum Tier', price: 95000, description: 'Comprehensive 2-day coverage with complete team and equipment.' },
    ],
  });

  // Step 4: Account Setup
  const [accountData, setAccountData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    agreedToTerms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1 Validation
  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!basicInfo.fullName.trim()) errs.fullName = 'Full Name is required.';
    if (!basicInfo.businessName.trim()) errs.businessName = 'Business or Brand Name is required.';
    if (!basicInfo.email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(basicInfo.email.trim())) {
      errs.email = 'Please enter a valid email address.';
    }
    if (!basicInfo.phone.trim()) {
      errs.phone = 'Phone number is required.';
    } else if (!/^[0-9+\-\s()]{10,}$/.test(basicInfo.phone.trim())) {
      errs.phone = 'Please enter a valid phone number (at least 10 digits).';
    }
    if (!basicInfo.location.trim()) errs.location = 'Location or service area is required.';
    if (!basicInfo.description.trim()) errs.description = 'Brief description of services is required.';
    if (!basicInfo.yearsExperience.toString().trim()) {
      errs.yearsExperience = 'Years of experience is required.';
    } else if (isNaN(Number(basicInfo.yearsExperience)) || Number(basicInfo.yearsExperience) < 0) {
      errs.yearsExperience = 'Please enter a valid number of years.';
    }
    if (!basicInfo.startingPrice.toString().trim()) {
      errs.startingPrice = 'Starting price is required.';
    } else if (isNaN(Number(basicInfo.startingPrice.toString().replace(/[^0-9]/g, ''))) || Number(basicInfo.startingPrice.toString().replace(/[^0-9]/g, '')) <= 0) {
      errs.startingPrice = 'Please enter a valid starting price.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    if (!selectedCategory) {
      setErrors({ category: 'Please select one primary category to proceed.' });
      return false;
    }
    setErrors({});
    return true;
  };

  // Step 3 Validation
  const validateStep3 = () => {
    const errs: Record<string, string> = {};
    if (selectedCategory === 'Venue / Auditorium') {
      if (!catData.capacity || Number(catData.capacity) <= 0) {
        errs.capacity = 'Please enter a valid seating capacity.';
      }
    } else if (selectedCategory === 'Caterer') {
      if (!catData.pricePerPerson || Number(catData.pricePerPerson) <= 0) {
        errs.pricePerPerson = 'Please enter price per person.';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Step 4 Validation
  const validateStep4 = () => {
    const errs: Record<string, string> = {};
    const emailToUse = accountData.email.trim() || basicInfo.email.trim();
    if (!emailToUse) {
      errs.accountEmail = 'Account email is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToUse)) {
      errs.accountEmail = 'Please enter a valid email address.';
    }

    if (!accountData.password) {
      errs.password = 'Password is required.';
    } else if (accountData.password.length < 6) {
      errs.password = 'Password must be at least 6 characters.';
    }

    if (!accountData.confirmPassword) {
      errs.confirmPassword = 'Confirm your password.';
    } else if (accountData.password !== accountData.confirmPassword) {
      errs.confirmPassword = 'Passwords do not match.';
    }

    if (!accountData.agreedToTerms) {
      errs.agreedToTerms = 'You must agree to the Atelier Partner Terms & Conditions.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (validateStep1()) {
        // prefill account email with basicInfo email if empty
        if (!accountData.email) {
          setAccountData((prev) => ({ ...prev, email: basicInfo.email }));
        }
        setCurrentStep(2);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (currentStep === 2) {
      if (validateStep2()) {
        setCurrentStep(3);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (currentStep === 3) {
      if (validateStep3()) {
        setCurrentStep(4);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep4()) return;

    setIsSubmitting(true);

    const providerId = `provider-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
    const startingPriceNum = Number(basicInfo.startingPrice.toString().replace(/[^0-9]/g, '')) || 25000;
    const yearsExpNum = Number(basicInfo.yearsExperience) || 3;

    const newProvider: ProviderAccount = {
      id: providerId,
      fullName: basicInfo.fullName.trim(),
      businessName: basicInfo.businessName.trim(),
      email: (accountData.email.trim() || basicInfo.email.trim()).toLowerCase(),
      phone: basicInfo.phone.trim(),
      location: basicInfo.location.trim(),
      description: basicInfo.description.trim(),
      yearsExperience: yearsExpNum,
      startingPrice: startingPriceNum,
      category: selectedCategory as ProviderCategoryType,
      profileImage: basicInfo.profileImage,
      passwordHash: hashPassword(accountData.password),
      categoryData: catData,
      createdAt: new Date().toISOString(),
    };

    // Save account to localStorage
    saveProviderAccount(newProvider);

    // Seed a mock booking request for this provider so they immediately have requests to accept/reject
    seedDemoBookingIfEmpty(providerId, newProvider.businessName, newProvider.category);

    // Create session
    const session: ProviderSession = {
      providerId: newProvider.id,
      businessName: newProvider.businessName,
      fullName: newProvider.fullName,
      email: newProvider.email,
      category: newProvider.category,
      profileImage: newProvider.profileImage,
      loginAt: new Date().toISOString(),
    };
    setProviderSession(session);

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/provider/dashboard');
      }, 1200);
    }, 900);
  };

  // Toggle multi-select tags in category data
  const toggleArrayItem = (key: keyof CategorySpecificData, item: string) => {
    setCatData((prev) => {
      const current = (prev[key] as string[]) || [];
      const updated = current.includes(item) ? current.filter((x) => x !== item) : [...current, item];
      return { ...prev, [key]: updated };
    });
  };

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary">
      <Header />

      <main className="flex-1 pt-28 pb-20 flex items-center justify-center relative overflow-hidden">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-secondary-container/15 rounded-full blur-[160px] pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-72 h-72 bg-primary/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-3xl w-full mx-auto px-4 sm:px-6 relative z-10">
          <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-2xl p-6 sm:p-10 shadow-2xl border border-surface-container-highest/60">
            {/* Header info */}
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-secondary-container/30 text-secondary mx-auto flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(255,178,190,0.2)]">
                <Icon name="storefront" className="text-[24px]" />
              </div>
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-secondary font-bold">
                Provider Atelier Guild
              </span>
              <h1 className="font-headline-sm text-2xl sm:text-3xl text-on-surface font-semibold mt-1">
                Join Eva-Ai as a Verified Partner
              </h1>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1.5 max-w-lg mx-auto">
                Connect with premier event hosts, receive pre-qualified booking requests, and manage your luxury event schedule.
              </p>
            </div>

            {/* Stepper Progress Bar */}
            <div className="mb-10">
              <div className="flex items-center justify-between relative">
                {/* Connecting Line */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 w-full bg-surface-container -z-0" />
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-secondary to-primary transition-all duration-500 -z-0"
                  style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                />

                {[
                  { step: 1, label: 'Basic Info' },
                  { step: 2, label: 'Category' },
                  { step: 3, label: 'Specialization' },
                  { step: 4, label: 'Account' },
                ].map((s) => {
                  const isDone = currentStep > s.step;
                  const isCurrent = currentStep === s.step;
                  return (
                    <div key={s.step} className="flex flex-col items-center relative z-10">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                          isDone
                            ? 'bg-secondary text-on-secondary-fixed shadow-[0_0_12px_rgba(255,178,190,0.4)]'
                            : isCurrent
                            ? 'bg-surface-container-highest border-2 border-secondary text-secondary shadow-[0_0_15px_rgba(255,178,190,0.3)] scale-110'
                            : 'bg-surface-container border border-surface-container-highest text-outline'
                        }`}
                      >
                        {isDone ? <Icon name="check" className="text-[16px]" /> : s.step}
                      </div>
                      <span
                        className={`text-[11px] font-medium mt-1.5 hidden sm:block ${
                          isCurrent ? 'text-secondary font-bold' : isDone ? 'text-on-surface' : 'text-outline'
                        }`}
                      >
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Success Animation Overlay */}
            {isSuccess ? (
              <div className="py-12 text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
                <div className="w-20 h-20 rounded-full bg-secondary-container/40 text-secondary mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(255,178,190,0.4)]">
                  <Icon name="check_circle" className="text-[48px]" />
                </div>
                <div className="space-y-2">
                  <h2 className="font-headline-sm text-2xl font-bold text-on-surface">
                    Welcome to the Atelier Guild!
                  </h2>
                  <p className="font-body-md text-on-surface-variant max-w-md mx-auto">
                    Your provider profile has been registered. Initializing your provider management portal...
                  </p>
                </div>
                <div className="flex items-center justify-center gap-2 text-primary font-semibold text-sm pt-2">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  <span>Redirecting to Provider Dashboard...</span>
                </div>
              </div>
            ) : (
              <div>
                {/* STEP 1: Basic Information */}
                {currentStep === 1 && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="border-b border-surface-container pb-3 mb-4">
                      <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                        <Icon name="person" className="text-secondary text-[20px]" />
                        <span>Step 1: Basic Atelier Information</span>
                      </h2>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Tell us about yourself, your business brand, and base operating area.
                      </p>
                    </div>

                    {/* Full Name & Business Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                          Full Name <span className="text-secondary">*</span>
                        </label>
                        <input
                          type="text"
                          value={basicInfo.fullName}
                          onChange={(e) => {
                            setBasicInfo({ ...basicInfo, fullName: e.target.value });
                            if (errors.fullName) setErrors({ ...errors, fullName: '' });
                          }}
                          className="w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                          placeholder="e.g. Rohit Menon"
                        />
                        {errors.fullName && <span className="text-error text-xs mt-1 block">{errors.fullName}</span>}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                          Business / Brand Name <span className="text-secondary">*</span>
                        </label>
                        <input
                          type="text"
                          value={basicInfo.businessName}
                          onChange={(e) => {
                            setBasicInfo({ ...basicInfo, businessName: e.target.value });
                            if (errors.businessName) setErrors({ ...errors, businessName: '' });
                          }}
                          className="w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                          placeholder="e.g. LensCraft Studio & Visuals"
                        />
                        {errors.businessName && <span className="text-error text-xs mt-1 block">{errors.businessName}</span>}
                      </div>
                    </div>

                    {/* Email & Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                          Business Email <span className="text-secondary">*</span>
                        </label>
                        <input
                          type="email"
                          value={basicInfo.email}
                          onChange={(e) => {
                            setBasicInfo({ ...basicInfo, email: e.target.value });
                            if (errors.email) setErrors({ ...errors, email: '' });
                          }}
                          className="w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                          placeholder="studio@lenscraft.com"
                        />
                        {errors.email && <span className="text-error text-xs mt-1 block">{errors.email}</span>}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                          Phone Number <span className="text-secondary">*</span>
                        </label>
                        <input
                          type="tel"
                          value={basicInfo.phone}
                          onChange={(e) => {
                            setBasicInfo({ ...basicInfo, phone: e.target.value });
                            if (errors.phone) setErrors({ ...errors, phone: '' });
                          }}
                          className="w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                          placeholder="+91 94470 12345"
                        />
                        {errors.phone && <span className="text-error text-xs mt-1 block">{errors.phone}</span>}
                      </div>
                    </div>

                    {/* Location / Address */}
                    <div>
                      <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                        Location / City / Address <span className="text-secondary">*</span>
                      </label>
                      <input
                        type="text"
                        value={basicInfo.location}
                        onChange={(e) => {
                          setBasicInfo({ ...basicInfo, location: e.target.value });
                          if (errors.location) setErrors({ ...errors, location: '' });
                        }}
                        className="w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                        placeholder="e.g. Palakkad / Kochi, Kerala"
                      />
                      {errors.location && <span className="text-error text-xs mt-1 block">{errors.location}</span>}
                    </div>

                    {/* Years Experience & Starting Price */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                          Years of Experience <span className="text-secondary">*</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="60"
                          value={basicInfo.yearsExperience}
                          onChange={(e) => {
                            setBasicInfo({ ...basicInfo, yearsExperience: e.target.value });
                            if (errors.yearsExperience) setErrors({ ...errors, yearsExperience: '' });
                          }}
                          className="w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                          placeholder="e.g. 7"
                        />
                        {errors.yearsExperience && <span className="text-error text-xs mt-1 block">{errors.yearsExperience}</span>}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                          Starting Price (₹ INR) <span className="text-secondary">*</span>
                        </label>
                        <input
                          type="text"
                          value={basicInfo.startingPrice}
                          onChange={(e) => {
                            setBasicInfo({ ...basicInfo, startingPrice: e.target.value });
                            if (errors.startingPrice) setErrors({ ...errors, startingPrice: '' });
                          }}
                          className="w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                          placeholder="e.g. 45000"
                        />
                        {errors.startingPrice && <span className="text-error text-xs mt-1 block">{errors.startingPrice}</span>}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                        About Your Business / Service Description <span className="text-secondary">*</span>
                      </label>
                      <textarea
                        rows={3}
                        value={basicInfo.description}
                        onChange={(e) => {
                          setBasicInfo({ ...basicInfo, description: e.target.value });
                          if (errors.description) setErrors({ ...errors, description: '' });
                        }}
                        className="w-full p-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60 resize-none"
                        placeholder="Briefly describe your specialty, creative vision, team size, and key achievements..."
                      />
                      {errors.description && <span className="text-error text-xs mt-1 block">{errors.description}</span>}
                    </div>

                    {/* Profile Avatar Selection */}
                    <div>
                      <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-2">
                        Select Profile Avatar Image
                      </label>
                      <div className="flex items-center gap-3">
                        {PRESET_AVATARS.map((url, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setBasicInfo({ ...basicInfo, profileImage: url })}
                            className={`w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all ${
                              basicInfo.profileImage === url
                                ? 'border-secondary scale-105 shadow-[0_0_15px_rgba(255,178,190,0.4)]'
                                : 'border-surface-container-highest opacity-70 hover:opacity-100'
                            }`}
                          >
                            <img src={url} alt={`Avatar option ${i + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Next Button */}
                    <div className="pt-4">
                      <button
                        type="button"
                        onClick={handleNext}
                        className="w-full py-4 rounded-xl bg-secondary hover:bg-secondary-fixed-dim text-on-secondary-fixed font-title-md text-sm font-bold transition-all shadow-[0_0_20px_rgba(255,178,190,0.25)] flex items-center justify-center gap-2"
                      >
                        <span>Continue to Category Selection</span>
                        <Icon name="arrow_forward" className="text-[18px]" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Category Selection */}
                {currentStep === 2 && (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="border-b border-surface-container pb-3 mb-4">
                      <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                        <Icon name="category" className="text-secondary text-[20px]" />
                        <span>Step 2: Select Your Primary Category</span>
                      </h2>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Choose the primary craft category your atelier specializes in.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {CATEGORIES.map((cat) => {
                        const isSelected = selectedCategory === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(cat.id);
                              if (errors.category) setErrors({});
                            }}
                            className={`p-4 rounded-2xl border text-left transition-all flex items-start gap-3.5 ${
                              isSelected
                                ? 'bg-secondary/15 border-secondary text-on-surface shadow-[0_0_18px_rgba(255,178,190,0.2)]'
                                : 'bg-surface-container border-surface-container-highest/60 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                            }`}
                          >
                            <div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                isSelected ? 'bg-secondary text-on-secondary-fixed' : 'bg-surface-container-high text-outline'
                              }`}
                            >
                              <Icon name={cat.icon} className="text-[22px]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-sm text-on-surface block">{cat.label}</span>
                              <span className="text-xs text-on-surface-variant line-clamp-1 mt-0.5">{cat.subtitle}</span>
                            </div>
                            {isSelected && <Icon name="check_circle" className="text-secondary text-[20px]" />}
                          </button>
                        );
                      })}
                    </div>

                    {errors.category && (
                      <span className="text-error text-xs mt-1 block">{errors.category}</span>
                    )}

                    <div className="flex items-center gap-3 pt-6">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="w-1/3 py-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-semibold border border-surface-container-highest/60 flex items-center justify-center gap-1.5"
                      >
                        <Icon name="arrow_back" className="text-[16px]" />
                        <span>Back</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleNext}
                        className="w-2/3 py-3.5 rounded-xl bg-secondary hover:bg-secondary-fixed-dim text-on-secondary-fixed text-sm font-bold transition-all shadow-[0_0_20px_rgba(255,178,190,0.25)] flex items-center justify-center gap-2"
                      >
                        <span>Continue to Specialization Details</span>
                        <Icon name="arrow_forward" className="text-[18px]" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 3: Category-Specific Information */}
                {currentStep === 3 && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="border-b border-surface-container pb-3 mb-4">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-secondary/20 text-secondary border border-secondary/30">
                          {selectedCategory}
                        </span>
                        <h2 className="text-base font-bold text-on-surface">
                          Step 3: Category-Specific Information
                        </h2>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-1">
                        Provide technical and package specifications customized for {selectedCategory}.
                      </p>
                    </div>

                    {/* Category-conditional form fields */}
                    {selectedCategory === 'Photographer' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-2">
                            Photography & Cinematography Styles
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              'Candid Photography',
                              'Cinematic Wedding Films',
                              'Drone Aerial 4K',
                              'Traditional Rituals',
                              'Pre-Wedding Conceptual',
                              'Same-Day Highlights',
                            ].map((style) => {
                              const active = catData.photographyStyles?.includes(style);
                              return (
                                <button
                                  key={style}
                                  type="button"
                                  onClick={() => toggleArrayItem('photographyStyles', style)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                                    active
                                      ? 'bg-secondary/20 text-secondary border-secondary'
                                      : 'bg-surface-container text-on-surface-variant border-surface-container-highest/60 hover:text-on-surface'
                                  }`}
                                >
                                  {active ? '✓ ' : '+ '}
                                  {style}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                            Camera & Lighting Equipment
                          </label>
                          <input
                            type="text"
                            value={catData.equipment || ''}
                            onChange={(e) => setCatData({ ...catData, equipment: e.target.value })}
                            className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                            placeholder="e.g. Sony FX3 Cinema Rigs, Alpha 7 IV, DJI Mavic 3 Cine"
                          />
                        </div>
                      </div>
                    )}

                    {selectedCategory === 'Event Manager' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-2">
                            Event Types Handled
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              'Royal Destination Weddings',
                              'Grand Traditional Receptions',
                              'Corporate Galas',
                              'Sangeet & Cocktail Soirees',
                              'Boutique Engagements',
                            ].map((type) => {
                              const active = catData.eventTypesHandled?.includes(type);
                              return (
                                <button
                                  key={type}
                                  type="button"
                                  onClick={() => toggleArrayItem('eventTypesHandled', type)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                                    active
                                      ? 'bg-secondary/20 text-secondary border-secondary'
                                      : 'bg-surface-container text-on-surface-variant border-surface-container-highest/60 hover:text-on-surface'
                                  }`}
                                >
                                  {active ? '✓ ' : '+ '}
                                  {type}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                            Previous Event Experience & Track Record
                          </label>
                          <textarea
                            rows={2}
                            value={catData.previousExperience || ''}
                            onChange={(e) => setCatData({ ...catData, previousExperience: e.target.value })}
                            className="w-full p-3 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60 resize-none"
                            placeholder="Managed 120+ Kerala celebrations with up to 2500 attendees..."
                          />
                        </div>
                      </div>
                    )}

                    {selectedCategory === 'Makeup Artist' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-2">
                            Makeup & Styling Specialties
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              'Bridal HD Makeup',
                              'Airbrush Makeover',
                              'Kerala Kasavu Saree Draping',
                              'Editorial Hair Artistry',
                              'Groom Grooming',
                              'Pre-Bridal Glow Trials',
                            ].map((mk) => {
                              const active = catData.makeupTypes?.includes(mk);
                              return (
                                <button
                                  key={mk}
                                  type="button"
                                  onClick={() => toggleArrayItem('makeupTypes', mk)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                                    active
                                      ? 'bg-secondary/20 text-secondary border-secondary'
                                      : 'bg-surface-container text-on-surface-variant border-surface-container-highest/60 hover:text-on-surface'
                                  }`}
                                >
                                  {active ? '✓ ' : '+ '}
                                  {mk}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedCategory === 'Venue / Auditorium' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                              Guest Capacity (Seated) <span className="text-secondary">*</span>
                            </label>
                            <input
                              type="number"
                              value={catData.capacity || ''}
                              onChange={(e) => setCatData({ ...catData, capacity: Number(e.target.value) })}
                              className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                              placeholder="e.g. 1000"
                            />
                            {errors.capacity && <span className="text-error text-xs mt-1 block">{errors.capacity}</span>}
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                              Bridal & Guest Rooms Count
                            </label>
                            <input
                              type="number"
                              value={catData.roomsCount || ''}
                              onChange={(e) => setCatData({ ...catData, roomsCount: Number(e.target.value) })}
                              className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                              placeholder="e.g. 6"
                            />
                          </div>
                        </div>

                        {/* Amenities checklist */}
                        <div>
                          <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-2">
                            Key Venue Amenities
                          </label>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                            {[
                              { label: 'Central A/C', key: 'hasAC' as const },
                              { label: 'Valet Parking', key: 'hasParking' as const },
                              { label: 'Raised Stage', key: 'hasStage' as const },
                              { label: 'Dining Hall', key: 'hasDining' as const },
                            ].map((item) => (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => setCatData({ ...catData, [item.key]: !catData[item.key] })}
                                className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-colors ${
                                  catData[item.key]
                                    ? 'bg-secondary/20 text-secondary border-secondary'
                                    : 'bg-surface-container text-on-surface-variant border-surface-container-highest/60'
                                }`}
                              >
                                <span>{item.label}</span>
                                <Icon name={catData[item.key] ? 'check_box' : 'check_box_outline_blank'} className="text-[16px]" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedCategory === 'Caterer' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-2">
                            Cuisine Styles Offered
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              'Authentic Kerala Sadhya (32+ items)',
                              'Mughlai & Biryani Feasts',
                              'North Indian Royal',
                              'Live Chaat & Dessert Stations',
                              'Continental & Pan-Asian',
                            ].map((cuisine) => {
                              const active = catData.cuisineTypes?.includes(cuisine);
                              return (
                                <button
                                  key={cuisine}
                                  type="button"
                                  onClick={() => toggleArrayItem('cuisineTypes', cuisine)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                                    active
                                      ? 'bg-secondary/20 text-secondary border-secondary'
                                      : 'bg-surface-container text-on-surface-variant border-surface-container-highest/60 hover:text-on-surface'
                                  }`}
                                >
                                  {active ? '✓ ' : '+ '}
                                  {cuisine}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                              Price Per Plate (₹) <span className="text-secondary">*</span>
                            </label>
                            <input
                              type="number"
                              value={catData.pricePerPerson || ''}
                              onChange={(e) => setCatData({ ...catData, pricePerPerson: Number(e.target.value) })}
                              className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                              placeholder="e.g. 700"
                            />
                            {errors.pricePerPerson && <span className="text-error text-xs mt-1 block">{errors.pricePerPerson}</span>}
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                              Min Guests
                            </label>
                            <input
                              type="number"
                              value={catData.minGuests || ''}
                              onChange={(e) => setCatData({ ...catData, minGuests: Number(e.target.value) })}
                              className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                              placeholder="100"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                              Max Guests
                            </label>
                            <input
                              type="number"
                              value={catData.maxGuests || ''}
                              onChange={(e) => setCatData({ ...catData, maxGuests: Number(e.target.value) })}
                              className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                              placeholder="2500"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedCategory === 'Decorator' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-2">
                            Decor Themes & Specializations
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              'Royal Floral Mandap',
                              'Botanical Archways',
                              'Chandelier & Crystal Rigs',
                              'Traditional Kerala Kasavu Decor',
                              'Contemporary Minimalist Elegance',
                            ].map((theme) => {
                              const active = catData.decorStyles?.includes(theme);
                              return (
                                <button
                                  key={theme}
                                  type="button"
                                  onClick={() => toggleArrayItem('decorStyles', theme)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                                    active
                                      ? 'bg-secondary/20 text-secondary border-secondary'
                                      : 'bg-surface-container text-on-surface-variant border-surface-container-highest/60 hover:text-on-surface'
                                  }`}
                                >
                                  {active ? '✓ ' : '+ '}
                                  {theme}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedCategory === 'DJ / Entertainment' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-2">
                            Performance & Sound Specializations
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              'Celebrity Club & Wedding DJ',
                              'Live Acoustic & Symphony Duo',
                              'Traditional Kerala Chenda Melam',
                              'Dynamic Laser & Light Rigs',
                              'Professional Master of Ceremonies (MC)',
                            ].map((ent) => {
                              const active = catData.entertainmentTypes?.includes(ent);
                              return (
                                <button
                                  key={ent}
                                  type="button"
                                  onClick={() => toggleArrayItem('entertainmentTypes', ent)}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                                    active
                                      ? 'bg-secondary/20 text-secondary border-secondary'
                                      : 'bg-surface-container text-on-surface-variant border-surface-container-highest/60 hover:text-on-surface'
                                  }`}
                                >
                                  {active ? '✓ ' : '+ '}
                                  {ent}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Common: Sample Package Tier */}
                    <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-highest/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-on-surface uppercase tracking-wider">
                          Initial Package Tier
                        </span>
                        <span className="text-[11px] text-secondary font-medium">Editable in dashboard</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={catData.packageInfo?.[0]?.name || 'Standard Luxury Package'}
                          onChange={(e) => {
                            const pkgs = [...(catData.packageInfo || [])];
                            if (!pkgs[0]) pkgs[0] = { name: '', price: 35000, description: '' };
                            pkgs[0].name = e.target.value;
                            setCatData({ ...catData, packageInfo: pkgs });
                          }}
                          className="w-full h-10 px-3 rounded-lg bg-surface-container text-on-surface text-xs border border-surface-container-highest"
                          placeholder="Tier Name (e.g. Gold Collection)"
                        />
                        <input
                          type="number"
                          value={catData.packageInfo?.[0]?.price || 45000}
                          onChange={(e) => {
                            const pkgs = [...(catData.packageInfo || [])];
                            if (!pkgs[0]) pkgs[0] = { name: 'Gold', price: 45000, description: '' };
                            pkgs[0].price = Number(e.target.value);
                            setCatData({ ...catData, packageInfo: pkgs });
                          }}
                          className="w-full h-10 px-3 rounded-lg bg-surface-container text-on-surface text-xs border border-surface-container-highest"
                          placeholder="Tier Price (₹)"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 pt-6">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="w-1/3 py-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-semibold border border-surface-container-highest/60 flex items-center justify-center gap-1.5"
                      >
                        <Icon name="arrow_back" className="text-[16px]" />
                        <span>Back</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleNext}
                        className="w-2/3 py-3.5 rounded-xl bg-secondary hover:bg-secondary-fixed-dim text-on-secondary-fixed text-sm font-bold transition-all shadow-[0_0_20px_rgba(255,178,190,0.25)] flex items-center justify-center gap-2"
                      >
                        <span>Continue to Account Setup</span>
                        <Icon name="arrow_forward" className="text-[18px]" />
                      </button>
                    </div>
                  </div>
                )}

                {/* STEP 4: Account Setup */}
                {currentStep === 4 && (
                  <form onSubmit={handleFinalSubmit} className="space-y-5 animate-in fade-in duration-200">
                    <div className="border-b border-surface-container pb-3 mb-4">
                      <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
                        <Icon name="lock" className="text-secondary text-[20px]" />
                        <span>Step 4: Secure Atelier Credentials</span>
                      </h2>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Set up your provider login credentials to access your booking management portal.
                      </p>
                    </div>

                    {/* Login Email */}
                    <div>
                      <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                        Login Email Address <span className="text-secondary">*</span>
                      </label>
                      <input
                        type="email"
                        value={accountData.email || basicInfo.email}
                        onChange={(e) => {
                          setAccountData({ ...accountData, email: e.target.value });
                          if (errors.accountEmail) setErrors({ ...errors, accountEmail: '' });
                        }}
                        className="w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                        placeholder="studio@lenscraft.com"
                      />
                      {errors.accountEmail && <span className="text-error text-xs mt-1 block">{errors.accountEmail}</span>}
                    </div>

                    {/* Password & Confirm */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                          Create Password <span className="text-secondary">*</span>
                        </label>
                        <input
                          type="password"
                          value={accountData.password}
                          onChange={(e) => {
                            setAccountData({ ...accountData, password: e.target.value });
                            if (errors.password) setErrors({ ...errors, password: '' });
                          }}
                          className="w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                          placeholder="At least 6 characters"
                        />
                        {errors.password && <span className="text-error text-xs mt-1 block">{errors.password}</span>}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                          Confirm Password <span className="text-secondary">*</span>
                        </label>
                        <input
                          type="password"
                          value={accountData.confirmPassword}
                          onChange={(e) => {
                            setAccountData({ ...accountData, confirmPassword: e.target.value });
                            if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                          }}
                          className="w-full h-12 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                          placeholder="Re-enter password"
                        />
                        {errors.confirmPassword && (
                          <span className="text-error text-xs mt-1 block">{errors.confirmPassword}</span>
                        )}
                      </div>
                    </div>

                    {/* Terms Checkbox */}
                    <div className="pt-2">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={accountData.agreedToTerms}
                          onChange={(e) => {
                            setAccountData({ ...accountData, agreedToTerms: e.target.checked });
                            if (errors.agreedToTerms) setErrors({ ...errors, agreedToTerms: '' });
                          }}
                          className="mt-1 w-4 h-4 rounded text-secondary focus:ring-secondary border-surface-container-highest"
                        />
                        <span className="text-xs text-on-surface-variant leading-relaxed">
                          I agree to the <span className="text-primary font-semibold">Eva-Ai Provider Atelier Terms</span>,
                          agree to fulfill accepted client briefs professionally, and understand client contact unlock rules.
                        </span>
                      </label>
                      {errors.agreedToTerms && (
                        <span className="text-error text-xs mt-1 block">{errors.agreedToTerms}</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(3)}
                        disabled={isSubmitting}
                        className="w-1/3 py-4 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-sm font-semibold border border-surface-container-highest/60 flex items-center justify-center gap-1.5"
                      >
                        <Icon name="arrow_back" className="text-[16px]" />
                        <span>Back</span>
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-2/3 py-4 rounded-xl bg-secondary hover:bg-secondary-fixed-dim text-on-secondary-fixed text-sm font-bold transition-all shadow-[0_0_20px_rgba(255,178,190,0.3)] hover:shadow-[0_0_30px_rgba(255,178,190,0.5)] flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-on-secondary-fixed border-t-transparent rounded-full animate-spin" />
                            <span>Creating Account...</span>
                          </>
                        ) : (
                          <>
                            <span>Complete Provider Registration</span>
                            <Icon name="check_circle" className="text-[18px]" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Link to Provider Login */}
            <div className="text-center mt-8 pt-4 border-t border-surface-container">
              <p className="text-xs text-on-surface-variant">
                Already registered as a service provider?{' '}
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

export default ProviderSignupPage;
