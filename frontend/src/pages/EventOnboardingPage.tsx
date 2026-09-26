import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Icon from '../components/common/Icon';
import OnboardingProgress from '../components/onboarding/OnboardingProgress';
import EventTypeStep from '../components/onboarding/EventTypeStep';
import EventDetailsStep from '../components/onboarding/EventDetailsStep';
import EventScaleStep from '../components/onboarding/EventScaleStep';
import ServicesStep from '../components/onboarding/ServicesStep';
import PreferencesStep from '../components/onboarding/PreferencesStep';
import ReviewStep from '../components/onboarding/ReviewStep';
import {
  EventPlanData,
  INITIAL_EVENT_DATA,
  AVAILABLE_SERVICES,
  extractEventData,
} from '../types/event';
import { eventsApi, getStoredAccessToken } from '../api/api';

export const EventOnboardingPage: React.FC = () => {
  const navigate = useNavigate();

  // Load existing event data if present (e.g. from an edit request)
  const [eventData, setEventData] = useState<EventPlanData>(() => {
    try {
      const saved = localStorage.getItem('eva_ai_event');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...INITIAL_EVENT_DATA,
          ...parsed,
        };
      }
    } catch (e) {
      console.warn('Could not read existing event data from localStorage:', e);
    }
    return INITIAL_EVENT_DATA;
  });

  const [currentStep, setCurrentStep] = useState<number>(1);
  const [maxVisitedStep, setMaxVisitedStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Field validation errors
  const [errors, setErrors] = useState<{
    eventType?: string;
    eventDate?: string;
    location?: string;
    guestCount?: string;
    budget?: string;
    services?: string;
  }>({});

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (currentStep > maxVisitedStep) {
      setMaxVisitedStep(currentStep);
    }
  }, [currentStep, maxVisitedStep]);

  // Step 1 Validation
  const validateStep1 = (): boolean => {
    if (!eventData.eventType) {
      setErrors((prev) => ({ ...prev, eventType: 'Please select an event type to continue.' }));
      return false;
    }
    setErrors((prev) => ({ ...prev, eventType: undefined }));
    return true;
  };

  // Step 2 Validation
  const validateStep2 = (): boolean => {
    const newErrors: { eventDate?: string; location?: string } = {};
    if (!eventData.eventDate) {
      newErrors.eventDate = 'Event date is required.';
    }
    if (!eventData.location.trim()) {
      newErrors.location = 'Event location is required.';
    }
    setErrors((prev) => ({ ...prev, ...newErrors }));
    return !newErrors.eventDate && !newErrors.location;
  };

  // Step 3 Validation
  const validateStep3 = (): boolean => {
    const newErrors: { guestCount?: string; budget?: string } = {};

    if (eventData.guestCount === '' || typeof eventData.guestCount !== 'number' || eventData.guestCount <= 0) {
      newErrors.guestCount = 'Please enter a valid guest count (must be a positive number).';
    }

    if (eventData.budget === '' || typeof eventData.budget !== 'number' || eventData.budget <= 0) {
      newErrors.budget = 'Please enter a valid estimated budget in INR (positive number).';
    }

    setErrors((prev) => ({ ...prev, ...newErrors }));
    return !newErrors.guestCount && !newErrors.budget;
  };

  // Step 4 Validation
  const validateStep4 = (): boolean => {
    if (!eventData.services || eventData.services.length === 0) {
      setErrors((prev) => ({ ...prev, services: 'Please select at least one required service.' }));
      return false;
    }
    setErrors((prev) => ({ ...prev, services: undefined }));
    return true;
  };

  // Comprehensive validation across all steps
  const validateAll = (): boolean => {
    const valid1 = validateStep1();
    const valid2 = validateStep2();
    const valid3 = validateStep3();
    const valid4 = validateStep4();

    if (!valid1) {
      setCurrentStep(1);
      return false;
    }
    if (!valid2) {
      setCurrentStep(2);
      return false;
    }
    if (!valid3) {
      setCurrentStep(3);
      return false;
    }
    if (!valid4) {
      setCurrentStep(4);
      return false;
    }
    return true;
  };

  // Navigation handlers
  const handleContinue = () => {
    let isValid = false;
    if (currentStep === 1) isValid = validateStep1();
    else if (currentStep === 2) isValid = validateStep2();
    else if (currentStep === 3) isValid = validateStep3();
    else if (currentStep === 4) isValid = validateStep4();
    else if (currentStep === 5) isValid = true; // Preferences optional

    if (isValid && currentStep < 6) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleJumpToStep = (stepNumber: number) => {
    if (stepNumber >= 1 && stepNumber <= 6) {
      setCurrentStep(stepNumber);
    }
  };

  // State mutators
  const handleSelectEventType = (type: string) => {
    setEventData((prev) => ({ ...prev, eventType: type }));
    setErrors((prev) => ({ ...prev, eventType: undefined }));
  };

  const handleChangeDate = (date: string) => {
    setEventData((prev) => ({ ...prev, eventDate: date }));
    if (errors.eventDate) {
      setErrors((prev) => ({ ...prev, eventDate: undefined }));
    }
  };

  const handleChangeLocation = (loc: string) => {
    setEventData((prev) => ({ ...prev, location: loc }));
    if (errors.location) {
      setErrors((prev) => ({ ...prev, location: undefined }));
    }
  };

  const handleChangeGuestCount = (count: number | '') => {
    setEventData((prev) => ({ ...prev, guestCount: count }));
    if (errors.guestCount) {
      setErrors((prev) => ({ ...prev, guestCount: undefined }));
    }
  };

  const handleChangeBudget = (budget: number | '') => {
    setEventData((prev) => ({ ...prev, budget: budget }));
    if (errors.budget) {
      setErrors((prev) => ({ ...prev, budget: undefined }));
    }
  };

  const handleToggleService = (srvLabel: string) => {
    setEventData((prev) => {
      const exists = prev.services.includes(srvLabel);
      const newServices = exists
        ? prev.services.filter((s) => s !== srvLabel)
        : [...prev.services, srvLabel];
      return { ...prev, services: newServices };
    });
    if (errors.services) {
      setErrors((prev) => ({ ...prev, services: undefined }));
    }
  };

  const handleSelectAllServices = () => {
    setEventData((prev) => ({
      ...prev,
      services: AVAILABLE_SERVICES.map((s) => s.label),
    }));
    if (errors.services) {
      setErrors((prev) => ({ ...prev, services: undefined }));
    }
  };

  const handleClearAllServices = () => {
    setEventData((prev) => ({ ...prev, services: [] }));
  };

  const handleTogglePreference = (prefLabel: string) => {
    setEventData((prev) => {
      const exists = prev.preferences.includes(prefLabel);
      const newPrefs = exists
        ? prev.preferences.filter((p) => p !== prefLabel)
        : [...prev.preferences, prefLabel];
      return { ...prev, preferences: newPrefs };
    });
  };

  const handleChangeNotes = (notes: string) => {
    setEventData((prev) => ({ ...prev, additionalNotes: notes }));
  };

  // Final submission to Backend API & localStorage
  const handleFinalSubmit = async () => {
    if (!validateAll()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        eventType: eventData.eventType,
        eventDate: eventData.eventDate,
        location: eventData.location.trim(),
        guestCount:
          typeof eventData.guestCount === 'number'
            ? eventData.guestCount
            : Number(eventData.guestCount) || 0,
        budget:
          typeof eventData.budget === 'number'
            ? eventData.budget
            : Number(eventData.budget) || 0,
        services: eventData.services,
        preferences: eventData.preferences,
        additionalNotes: eventData.additionalNotes.trim(),
      };

      const token = getStoredAccessToken();
      let savedPlan: EventPlanData;

      if (token) {
        // Authenticated customer: sync with backend API
        if (eventData.id) {
          try {
            // Update existing event via PUT /events/:id
            const res = await eventsApi.update(eventData.id, payload);
            const backendEvent = extractEventData(res);
            savedPlan = backendEvent || {
              ...eventData,
              ...payload,
              updatedAt: new Date().toISOString(),
            };
          } catch (updateErr) {
            console.warn('Backend update failed, attempting create as fallback:', updateErr);
            const createRes = await eventsApi.create(payload);
            const backendEvent = extractEventData(createRes);
            savedPlan = backendEvent || {
              ...eventData,
              ...payload,
              createdAt: new Date().toISOString(),
            };
          }
        } else {
          // Create new event via POST /events
          const res = await eventsApi.create(payload);
          const backendEvent = extractEventData(res);
          savedPlan = backendEvent || {
            ...eventData,
            ...payload,
            createdAt: new Date().toISOString(),
          };
        }
      } else {
        // Unauthenticated visitor draft
        savedPlan = {
          ...eventData,
          ...payload,
          createdAt: eventData.createdAt || new Date().toISOString(),
        };
      }

      // 1. Save event planning information containing the backend event UUID
      localStorage.setItem('eva_ai_event', JSON.stringify(savedPlan));

      // 2. Note: eva_ai_customer, eva_ai_event_plan, eva_ai_selected_services, eva_ai_bookings remain preserved.

      // 3. Navigate to /customer/dashboard
      setTimeout(() => {
        navigate('/customer/dashboard');
      }, 350);
    } catch (e) {
      console.error('Failed to submit event plan to backend:', e);
      // Preserve local draft on network failure
      const fallbackPlan: EventPlanData = {
        ...eventData,
        createdAt: eventData.createdAt || new Date().toISOString(),
      };
      localStorage.setItem('eva_ai_event', JSON.stringify(fallbackPlan));
      navigate('/customer/dashboard');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary">
      <Header />

      <main className="flex-1 pt-28 pb-20 relative overflow-hidden">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-10 right-0 w-96 h-96 bg-secondary-container/10 rounded-full blur-[130px] pointer-events-none" />

        <div className="max-w-4xl w-full mx-auto px-margin-mobile md:px-margin relative z-10">
          {/* Top Breadcrumb & Exit link */}
          <div className="flex items-center justify-between mb-8">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 font-label-md text-label-md text-on-surface-variant hover:text-primary transition-colors"
            >
              <Icon name="arrow_back" className="text-[16px]" />
              <span>Back to home</span>
            </Link>

            <span className="font-label-md text-xs text-on-surface-variant uppercase tracking-wider">
              Eva-Ai Event Planner
            </span>
          </div>

          {/* Main Card Container */}
          <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-xl p-6 sm:p-10 md:p-12 shadow-2xl border border-surface-container-highest/60">
            {/* Step Progress Indicator */}
            <div className="mb-10 sm:mb-12">
              <OnboardingProgress
                currentStep={currentStep}
                onStepClick={handleJumpToStep}
                maxVisitedStep={maxVisitedStep}
              />
            </div>

            {/* Step 1: Event Type */}
            {currentStep === 1 && (
              <EventTypeStep
                selectedType={eventData.eventType}
                onSelectType={handleSelectEventType}
                onContinue={handleContinue}
                error={errors.eventType}
              />
            )}

            {/* Step 2: Date & Location */}
            {currentStep === 2 && (
              <EventDetailsStep
                eventDate={eventData.eventDate}
                location={eventData.location}
                onChangeDate={handleChangeDate}
                onChangeLocation={handleChangeLocation}
                onBack={handleBack}
                onContinue={handleContinue}
                errors={{
                  eventDate: errors.eventDate,
                  location: errors.location,
                }}
              />
            )}

            {/* Step 3: Guests & Budget */}
            {currentStep === 3 && (
              <EventScaleStep
                guestCount={eventData.guestCount}
                budget={eventData.budget}
                onChangeGuestCount={handleChangeGuestCount}
                onChangeBudget={handleChangeBudget}
                onBack={handleBack}
                onContinue={handleContinue}
                errors={{
                  guestCount: errors.guestCount,
                  budget: errors.budget,
                }}
              />
            )}

            {/* Step 4: Required Services */}
            {currentStep === 4 && (
              <ServicesStep
                selectedServices={eventData.services}
                onToggleService={handleToggleService}
                onSelectAll={handleSelectAllServices}
                onClearAll={handleClearAllServices}
                onBack={handleBack}
                onContinue={handleContinue}
                error={errors.services}
              />
            )}

            {/* Step 5: Event Preferences & Notes */}
            {currentStep === 5 && (
              <PreferencesStep
                preferences={eventData.preferences}
                additionalNotes={eventData.additionalNotes}
                onTogglePreference={handleTogglePreference}
                onChangeNotes={handleChangeNotes}
                onBack={handleBack}
                onContinue={handleContinue}
              />
            )}

            {/* Step 6: Review */}
            {currentStep === 6 && (
              <ReviewStep
                eventData={eventData}
                onEditStep={handleJumpToStep}
                onBack={handleBack}
                onSubmit={handleFinalSubmit}
                isSubmitting={isSubmitting}
              />
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default EventOnboardingPage;
