import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/common/Icon';
import EventPlanHeader from '../components/event-plan/EventPlanHeader';
import EventPlanEventSummary from '../components/event-plan/EventPlanEventSummary';
import SelectedServiceCard from '../components/event-plan/SelectedServiceCard';
import BudgetOverview from '../components/event-plan/BudgetOverview';
import BookingRequestConfirmation from '../components/event-plan/BookingRequestConfirmation';
import { EventPlanData } from '../types/event';
import { SelectedServiceItem } from '../types/service';
import { Booking } from '../types/booking';
import { CustomerProfileData } from './CustomerSignupPage';

export const EventPlanPage: React.FC = () => {
  // 1. Data States
  const [eventPlan, setEventPlan] = useState<EventPlanData | null>(null);
  const [customer, setCustomer] = useState<CustomerProfileData | null>(null);
  const [selectedServices, setSelectedServices] = useState<SelectedServiceItem[]>([]);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);

  // 2. UI States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'info' | 'success' | 'warning'>('info');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [confirmedBookings, setConfirmedBookings] = useState<Booking[] | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    // A. Read event information from localStorage: eva_ai_event
    try {
      const eventJson = localStorage.getItem('eva_ai_event');
      if (eventJson) {
        setEventPlan(JSON.parse(eventJson));
      }
    } catch (e) {
      console.warn('Failed to parse eva_ai_event from localStorage:', e);
    }

    // B. Read customer info if present
    try {
      const customerJson = localStorage.getItem('eva_ai_customer');
      if (customerJson) {
        setCustomer(JSON.parse(customerJson));
      }
    } catch (e) {
      console.warn('Failed to parse eva_ai_customer from localStorage:', e);
    }

    // C. Read selected services from localStorage: eva_ai_selected_services
    try {
      const selectedJson = localStorage.getItem('eva_ai_selected_services');
      if (selectedJson) {
        const parsed = JSON.parse(selectedJson);
        if (Array.isArray(parsed)) {
          setSelectedServices(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to parse eva_ai_selected_services from localStorage:', e);
    }

    // D. Read existing booking requests from localStorage: eva_ai_bookings
    try {
      const bookingsJson = localStorage.getItem('eva_ai_bookings');
      if (bookingsJson) {
        const parsed = JSON.parse(bookingsJson);
        if (Array.isArray(parsed)) {
          setExistingBookings(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to parse eva_ai_bookings from localStorage:', e);
    }

    setIsLoading(false);
  }, []);

  const showToast = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  };

  // Compute live estimated cost
  const estimatedCost = useMemo(() => {
    return selectedServices.reduce((sum, item) => sum + (Number(item.startingPrice) || 0), 0);
  }, [selectedServices]);

  // Active bookings map for fast lookup: providerId -> booking
  const activeBookingsMap = useMemo(() => {
    const map = new Map<string, Booking>();
    existingBookings.forEach((b) => {
      if (b.status === 'PENDING' || b.status === 'ACCEPTED') {
        map.set(b.providerId, b);
      }
    });
    return map;
  }, [existingBookings]);

  // Handle removing a service from event plan
  const handleRemoveService = (providerId: string) => {
    const updated = selectedServices.filter((s) => s.providerId !== providerId);
    setSelectedServices(updated);

    try {
      localStorage.setItem('eva_ai_selected_services', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to update eva_ai_selected_services in localStorage:', e);
    }

    showToast('Service removed from your event plan.', 'info');
  };

  // Handle sending booking requests
  const handleSendBookingRequests = () => {
    if (isSending || selectedServices.length === 0) return;

    setIsSending(true);

    const newlyCreatedBookings: Booking[] = [];
    const alreadyRequestedProviders: string[] = [];

    // Current event metadata
    const eventId = eventPlan?.createdAt ? `event-${new Date(eventPlan.createdAt).getTime()}` : `event-current`;
    const eventType = eventPlan?.eventType || 'Celebration';
    const eventDate = eventPlan?.eventDate || '';
    const location = eventPlan?.location || '';
    const guestCount = eventPlan?.guestCount || '';

    selectedServices.forEach((service) => {
      // Check if an active booking request already exists for this provider
      const existing = activeBookingsMap.get(service.providerId);
      if (existing) {
        alreadyRequestedProviders.push(service.providerName);
      } else {
        // Create an independent mock booking record for each provider
        const newBooking: Booking = {
          bookingId: `booking-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          providerId: service.providerId,
          providerName: service.providerName,
          category: service.category,
          eventId,
          eventType,
          eventDate,
          location: service.location || location,
          guestCount,
          startingPrice: service.startingPrice,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        };
        newlyCreatedBookings.push(newBooking);
      }
    });

    if (newlyCreatedBookings.length > 0) {
      const updatedBookings = [...existingBookings, ...newlyCreatedBookings];
      setExistingBookings(updatedBookings);

      try {
        localStorage.setItem('eva_ai_bookings', JSON.stringify(updatedBookings));
      } catch (e) {
        console.warn('Failed to save eva_ai_bookings to localStorage:', e);
      }
    }

    // CLEAR ONLY the selected-service / cart state after successful booking creation
    // Maintain strict separation: eva_ai_selected_services is cleared, while eva_ai_bookings, eva_ai_event, and eva_ai_customer are kept intact.
    setSelectedServices([]);
    try {
      localStorage.setItem('eva_ai_selected_services', JSON.stringify([]));
    } catch (e) {
      console.warn('Failed to clear eva_ai_selected_services from localStorage:', e);
    }

    setIsSending(false);

    if (alreadyRequestedProviders.length > 0 && newlyCreatedBookings.length === 0) {
      // All selected providers were already requested
      showToast(
        `Booking request already sent to ${alreadyRequestedProviders.join(', ')}.`,
        'warning'
      );
      // Show confirmation screen for their active bookings
      const relevantActive = selectedServices
        .map((s) => activeBookingsMap.get(s.providerId))
        .filter((b): b is Booking => Boolean(b));
      setConfirmedBookings(relevantActive);
    } else if (alreadyRequestedProviders.length > 0 && newlyCreatedBookings.length > 0) {
      showToast(
        `Sent ${newlyCreatedBookings.length} requests. (Already sent to ${alreadyRequestedProviders.join(', ')})`,
        'success'
      );
      setConfirmedBookings(newlyCreatedBookings);
    } else {
      showToast(`Booking requests created for ${newlyCreatedBookings.length} providers ✓`, 'success');
      setConfirmedBookings(newlyCreatedBookings);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-surface min-h-screen flex items-center justify-center text-on-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs uppercase tracking-wider text-primary font-bold">
            Loading Event Plan...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-fadeIn transition-all">
          <div
            className={`px-5 py-3 rounded-2xl backdrop-blur-xl border shadow-2xl flex items-center gap-3 text-sm font-semibold ${
              toastType === 'warning'
                ? 'bg-amber-950/90 border-amber-500/50 text-amber-200'
                : toastType === 'success'
                ? 'bg-surface-container-high/95 border-primary/60 text-primary shadow-[0_0_20px_rgba(242,202,80,0.3)]'
                : 'bg-surface-container-high/95 border-surface-container-highest text-on-surface'
            }`}
          >
            <Icon
              name={
                toastType === 'warning'
                  ? 'info'
                  : toastType === 'success'
                  ? 'check_circle'
                  : 'notifications'
              }
              className={`text-[18px] ${
                toastType === 'warning'
                  ? 'text-amber-400'
                  : toastType === 'success'
                  ? 'text-primary'
                  : 'text-on-surface-variant'
              }`}
            />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Customer Portal Navigation Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-surface/85 backdrop-blur-2xl border-b border-surface-container/60 shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        <div className="h-20 max-w-[1440px] mx-auto px-margin-mobile md:px-margin flex items-center justify-between">
          <div className="flex items-center gap-6 sm:gap-10">
            {/* Brand Logo */}
            <Link className="flex items-center gap-space-sm group" to="/">
              <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center shadow-[inset_0_1px_1px_rgba(242,202,80,0.3)] transition-transform group-hover:scale-105">
                <Icon name="auto_awesome" className="text-primary text-[20px]" />
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm font-semibold tracking-wider text-primary uppercase">
                  EVA-AI
                </span>
                <span className="font-label-sm text-label-sm uppercase text-on-surface-variant -mt-1 tracking-widest">
                  Event Plan
                </span>
              </div>
            </Link>

            {/* Breadcrumb Navigation */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-on-surface-variant">
              <Link to="/customer/dashboard" className="hover:text-primary transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-primary font-semibold">Event Plan</span>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-3">
            <Link
              to="/customer/bookings"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-container/80 hover:bg-surface-container text-on-surface-variant hover:text-primary text-xs font-semibold border border-surface-container-highest/60 transition-colors"
            >
              <Icon name="receipt_long" className="text-[16px] text-primary" />
              <span>My Bookings</span>
            </Link>

            <Link
              to="/customer/services"
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-surface-container/80 hover:bg-surface-container text-on-surface-variant hover:text-primary text-xs font-semibold border border-surface-container-highest/60 transition-colors"
            >
              <Icon name="explore" className="text-[16px]" />
              <span>Explore Services</span>
            </Link>

            <Link
              to="/customer/dashboard"
              className="flex items-center gap-2.5 pl-3 py-1 pr-1.5 rounded-full bg-surface-container/70 border border-surface-container-highest/60 hover:border-primary/40 transition-colors group"
            >
              <span className="hidden md:inline text-xs font-semibold text-on-surface group-hover:text-primary transition-colors">
                {customer?.fullName || 'Event Host'}
              </span>
              <div className="w-8 h-8 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center border border-primary/30">
                {customer?.fullName ? customer.fullName.charAt(0).toUpperCase() : 'H'}
              </div>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Page Layout */}
      <main className="flex-1 pt-28 pb-28 relative overflow-hidden">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[850px] h-[350px] bg-primary/8 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/2 right-[-100px] w-96 h-96 bg-secondary-container/10 rounded-full blur-[130px] pointer-events-none" />

        <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin relative z-10 space-y-8">
          {/* If Booking Requests Were Just Sent -> Show Confirmation View */}
          {confirmedBookings ? (
            <BookingRequestConfirmation
              createdBookings={confirmedBookings}
              onReturnToPlan={() => setConfirmedBookings(null)}
            />
          ) : (
            <>
              {/* 1. Page Header */}
              <EventPlanHeader selectedCount={selectedServices.length} />

              {/* 2. Event Summary Card */}
              <EventPlanEventSummary eventPlan={eventPlan} />

              {/* 3. Main Grid: Selected Services (Left) + Budget Overview (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Left Column: Selected Services */}
                <div className="lg:col-span-8 space-y-6">
                  {/* Section Title */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-headline-sm text-2xl font-bold text-on-surface flex items-center gap-2">
                        <Icon name="check_box" className="text-primary text-[24px]" />
                        <span>Selected Services</span>
                      </h2>
                      <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
                        Services you&apos;ve added to your event plan.
                      </p>
                    </div>

                    {selectedServices.length > 0 && (
                      <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/30">
                        {selectedServices.length} {selectedServices.length === 1 ? 'Provider' : 'Providers'}
                      </span>
                    )}
                  </div>

                  {/* Empty State */}
                  {selectedServices.length === 0 ? (
                    <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 p-8 sm:p-14 text-center space-y-5 max-w-xl mx-auto shadow-xl">
                      <div className="w-16 h-16 rounded-2xl bg-surface-container text-on-surface-variant mx-auto flex items-center justify-center border border-surface-container-highest/60 shadow-inner">
                        <Icon name="event_seat" className="text-[32px] text-primary/70" />
                      </div>

                      <div className="space-y-2">
                        <h3 className="font-headline-sm text-xl sm:text-2xl font-bold text-on-surface">
                          Your Event Plan is Empty
                        </h3>
                        <p className="font-body-md text-sm text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                          Add services to your event plan to start building your event.
                        </p>
                      </div>

                      <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                        <Link
                          to="/customer/services"
                          className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md font-bold transition-all shadow-[0_0_20px_rgba(242,202,80,0.25)] hover:shadow-[0_0_28px_rgba(242,202,80,0.4)]"
                        >
                          <Icon name="explore" className="text-[18px]" />
                          <span>Explore Services</span>
                        </Link>

                        <Link
                          to="/customer/bookings"
                          className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface font-title-md font-semibold transition-colors border border-surface-container-highest/60 hover:border-primary/40"
                        >
                          <Icon name="receipt_long" className="text-[18px] text-primary" />
                          <span>View My Bookings</span>
                        </Link>
                      </div>
                    </div>
                  ) : (
                    /* Selected Services List */
                    <div className="space-y-4">
                      {selectedServices.map((service) => {
                        const activeBooking = activeBookingsMap.get(service.providerId);
                        return (
                          <SelectedServiceCard
                            key={service.providerId}
                            service={service}
                            hasActiveBooking={Boolean(activeBooking)}
                            activeBookingStatus={activeBooking?.status}
                            onRemove={handleRemoveService}
                          />
                        );
                      })}

                      {/* Bottom navigation link to continue exploring */}
                      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-surface-container-high/40 border border-surface-container-highest/40">
                        <div className="flex items-center gap-2 text-xs sm:text-sm text-on-surface-variant">
                          <Icon name="add_circle_outline" className="text-primary text-[18px]" />
                          <span>Looking for more event professionals?</span>
                        </div>

                        <Link
                          to="/customer/services"
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-bright text-primary text-xs sm:text-sm font-semibold transition-colors border border-primary/30"
                        >
                          <span>Continue Exploring</span>
                          <Icon name="arrow_forward" className="text-[16px]" />
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column: Budget Overview Card */}
                <div className="lg:col-span-4">
                  <BudgetOverview
                    totalBudget={eventPlan?.budget || ''}
                    estimatedCost={estimatedCost}
                    selectedCount={selectedServices.length}
                    onSendBookingRequests={handleSendBookingRequests}
                    isSending={isSending}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default EventPlanPage;
