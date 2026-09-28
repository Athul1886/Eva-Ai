import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/common/Icon';
import EventPlanHeader from '../components/event-plan/EventPlanHeader';
import EventPlanEventSummary from '../components/event-plan/EventPlanEventSummary';
import SelectedServiceCard from '../components/event-plan/SelectedServiceCard';
import BudgetOverview from '../components/event-plan/BudgetOverview';
import BookingRequestConfirmation from '../components/event-plan/BookingRequestConfirmation';
import { EventPlanData, isUUID, BudgetOverviewData } from '../types/event';
import { SelectedServiceItem } from '../types/service';
import { Booking } from '../types/booking';
import { CustomerProfileData } from './CustomerSignupPage';
import { isProviderAvailable } from '../utils/providerAuth';
import { getCustomerSession } from '../utils/customerAuth';
import { apiClient } from '../utils/api';

export const EventPlanPage: React.FC = () => {
  // 1. Data States
  const [eventPlan, setEventPlan] = useState<EventPlanData | null>(null);
  const [customer, setCustomer] = useState<CustomerProfileData | null>(null);
  const [selectedServices, setSelectedServices] = useState<SelectedServiceItem[]>([]);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [backendBudgetOverview, setBackendBudgetOverview] = useState<BudgetOverviewData | null>(null);
  const [availabilityVersion, setAvailabilityVersion] = useState<number>(0);

  // 2. UI States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'info' | 'success' | 'warning'>('info');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [confirmedBookings, setConfirmedBookings] = useState<Booking[] | null>(null);

  const applyBackendPlan = (backendPlan: any) => {
    if (!backendPlan) return;

    if (backendPlan.event) {
      const e = backendPlan.event;
      const syncedEvent: EventPlanData = {
        id: e.id,
        customerId: e.customerId,
        title: e.title,
        status: e.status,
        eventType: e.eventType,
        eventDate: e.eventDate,
        location: e.location || e.city,
        guestCount: e.guestCount,
        budget: e.budget,
        services: Array.isArray(e.requiredServices) && e.requiredServices.length > 0
          ? e.requiredServices
          : (e.services || []),
        preferences: Array.isArray(e.preferences?.styles)
          ? e.preferences.styles
          : (Array.isArray(e.preferences) ? e.preferences : []),
        additionalNotes: e.additionalNotes || '',
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      };
      setEventPlan(syncedEvent);
      try {
        localStorage.setItem('eva_ai_event', JSON.stringify(syncedEvent));
      } catch (err) {
        console.warn('Failed saving synced event to localStorage:', err);
      }
    }

    if (Array.isArray(backendPlan.selectedServices)) {
      setSelectedServices(backendPlan.selectedServices);
      try {
        localStorage.setItem('eva_ai_selected_services', JSON.stringify(backendPlan.selectedServices));
      } catch (err) {
        console.warn('Failed saving synced selected services to localStorage:', err);
      }
    }

    if (backendPlan.budgetOverview) {
      setBackendBudgetOverview(backendPlan.budgetOverview);
    }
  };

  const syncPlanWithBackend = async (eventId: string) => {
    try {
      const localRaw = localStorage.getItem('eva_ai_selected_services');
      let localSelected: SelectedServiceItem[] = [];
      if (localRaw) {
        try {
          const parsed = JSON.parse(localRaw);
          if (Array.isArray(parsed)) localSelected = parsed;
        } catch {}
      }

      const planRes = await apiClient.get<any>(`/events/${eventId}/plan`, {
        requiresAuth: true,
      });

      if (planRes?.success && planRes.plan) {
        const backendPlan = planRes.plan;
        const backendServices: SelectedServiceItem[] = backendPlan.selectedServices || [];

        const backendProviderIds = new Set(backendServices.map((s: any) => s.providerId));
        const missingOnBackend = localSelected.filter(
          (s) => isUUID(s.providerId) && !backendProviderIds.has(s.providerId)
        );

        if (missingOnBackend.length > 0) {
          for (const item of missingOnBackend) {
            try {
              await apiClient.post(
                `/events/${eventId}/services`,
                { providerId: item.providerId, serviceId: item.serviceId },
                { requiresAuth: true }
              );
            } catch (e) {
              console.warn(`Could not sync item ${item.providerId} to backend:`, e);
            }
          }
          const refetched = await apiClient.get<any>(`/events/${eventId}/plan`, {
            requiresAuth: true,
          });
          if (refetched?.success && refetched.plan) {
            applyBackendPlan(refetched.plan);
            return;
          }
        }

        applyBackendPlan(backendPlan);
      }
    } catch (err) {
      console.warn('Could not sync event plan with backend:', err);
    }
  };

  // Load on mount
  useEffect(() => {
    // A. Read event information from localStorage: eva_ai_event
    let initialEventId: string | undefined;
    try {
      const eventJson = localStorage.getItem('eva_ai_event');
      if (eventJson) {
        const parsed = JSON.parse(eventJson);
        setEventPlan(parsed);
        if (parsed?.id) initialEventId = parsed.id;
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

    // E. Fetch authoritative active event from backend if authenticated
    const session = getCustomerSession();
    if (session?.customerId) {
      apiClient
        .get('/events/my', { requiresAuth: true })
        .then(async (res: any) => {
          if (res?.success && Array.isArray(res.events) && res.events.length > 0) {
            const latestBackendEvent = res.events[0];
            const eventId = latestBackendEvent.id;

            if (isUUID(eventId)) {
              await syncPlanWithBackend(eventId);
            }
          } else if (isUUID(initialEventId)) {
            await syncPlanWithBackend(initialEventId!);
          }
        })
        .catch((err) => {
          console.warn('Could not sync events from backend:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });

      // Also sync user's active bookings from backend
      apiClient
        .get('/bookings/my', { requiresAuth: true })
        .then((bRes: any) => {
          if (bRes?.success && Array.isArray(bRes.bookings)) {
            setExistingBookings(bRes.bookings);
            try {
              localStorage.setItem('eva_ai_bookings', JSON.stringify(bRes.bookings));
            } catch {}
          }
        })
        .catch(() => {});
    } else {
      setIsLoading(false);
    }

    // F. Listen for live availability & booking changes
    const handleAvailabilityChange = () => {
      setAvailabilityVersion((v) => v + 1);
    };

    const handleBookingsUpdated = () => {
      try {
        const bookingsJson = localStorage.getItem('eva_ai_bookings');
        if (bookingsJson) {
          const parsed = JSON.parse(bookingsJson);
          if (Array.isArray(parsed)) {
            setExistingBookings(parsed);
          }
        }
      } catch (e) {
        console.warn('Failed to parse eva_ai_bookings:', e);
      }
    };

    window.addEventListener('eva_ai_availability_updated', handleAvailabilityChange);
    window.addEventListener('eva_ai_bookings_updated', handleBookingsUpdated);
    window.addEventListener('storage', handleAvailabilityChange);
    window.addEventListener('storage', handleBookingsUpdated);

    return () => {
      window.removeEventListener('eva_ai_availability_updated', handleAvailabilityChange);
      window.removeEventListener('eva_ai_bookings_updated', handleBookingsUpdated);
      window.removeEventListener('storage', handleAvailabilityChange);
      window.removeEventListener('storage', handleBookingsUpdated);
    };
  }, []);

  const showToast = (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3800);
  };

  // Compute live estimated cost (authoritative from backend plan when available)
  const estimatedCost = useMemo(() => {
    if (backendBudgetOverview?.estimatedCost !== undefined) {
      return backendBudgetOverview.estimatedCost;
    }
    return selectedServices.reduce((sum, item) => sum + (Number(item.startingPrice) || 0), 0);
  }, [selectedServices, backendBudgetOverview]);

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

  // Live calculation of unavailable services
  const unavailableServices = useMemo(() => {
    if (!eventPlan?.eventDate) return [];
    return selectedServices.filter((s) => {
      if (s.isAvailable !== undefined) return !s.isAvailable;
      return !isProviderAvailable(s.providerId, eventPlan.eventDate);
    });
  }, [selectedServices, eventPlan?.eventDate, availabilityVersion]);

  // Handle removing a service from event plan
  const handleRemoveService = async (providerId: string) => {
    const updated = selectedServices.filter((s) => s.providerId !== providerId);
    setSelectedServices(updated);

    try {
      localStorage.setItem('eva_ai_selected_services', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to update eva_ai_selected_services in localStorage:', e);
    }

    showToast('Service removed from your event plan.', 'info');

    const eventId = eventPlan?.id;
    if (isUUID(eventId) && eventId) {
      try {
        await apiClient.delete(`/events/${eventId}/services/${providerId}`, { requiresAuth: true });
        await syncPlanWithBackend(eventId);
      } catch (err) {
        console.warn('Failed to remove service on backend:', err);
      }
    }
  };

  // Handle sending booking requests with multi-provider backend dispatch
  const handleSendBookingRequests = async () => {
    if (isSending || selectedServices.length === 0) return;

    setIsSending(true);

    const eventId = eventPlan?.id;
    const isRealBackendEvent = isUUID(eventId);

    // =========================================================================
    // 1. BACKEND DISPATCH (Authoritative Phase 5 / Phase 6 integration)
    // =========================================================================
    if (isRealBackendEvent && eventId) {
      try {
        const response = await apiClient.post<any>(`/events/${eventId}/bookings`, {}, {
          requiresAuth: true,
        });

        if (response && response.success) {
          const newlyCreatedBookings: Booking[] = response.newlyCreatedBookings || [];
          const alreadyRequested = response.alreadyRequestedProviders || [];
          const unavailable = response.unavailableProviders || [];

          // Sync newly created bookings into state & localStorage
          if (newlyCreatedBookings.length > 0) {
            const currentList = [...existingBookings];
            const updated = [
              ...currentList.filter(
                (b) => !newlyCreatedBookings.some((nb) => nb.bookingId === b.bookingId)
              ),
              ...newlyCreatedBookings,
            ];
            setExistingBookings(updated);
            try {
              localStorage.setItem('eva_ai_bookings', JSON.stringify(updated));
            } catch (e) {
              console.warn('Failed to save eva_ai_bookings to localStorage:', e);
            }

            window.dispatchEvent(
              new CustomEvent('eva_ai_bookings_updated', {
                detail: { newlyCreatedBookings },
              })
            );
            window.dispatchEvent(new Event('storage'));
          }

          // Authoritative refresh of event plan from backend
          // All shortlisted providers remain in the plan, reflecting live booking status
          await syncPlanWithBackend(eventId);

          setIsSending(false);

          if (newlyCreatedBookings.length > 0) {
            setConfirmedBookings(newlyCreatedBookings);
            if (unavailable.length > 0) {
              showToast(
                `Sent ${newlyCreatedBookings.length} booking request(s). Note: ${unavailable.map((p: any) => p.providerName).join(', ')} skipped (unavailable).`,
                'warning'
              );
            } else {
              showToast(`Booking requests created for ${newlyCreatedBookings.length} provider(s) ✓`, 'success');
            }
          } else if (alreadyRequested.length > 0) {
            const names = alreadyRequested.map((p: any) => p.providerName).join(', ');
            showToast(`All eligible providers have already been requested (${names}).`, 'warning');
            const activeList = selectedServices
              .filter((s) => s.hasActiveBooking || activeBookingsMap.has(s.providerId))
              .map((s) => activeBookingsMap.get(s.providerId) || {
                bookingId: s.bookingId || s.bookingReference || `EVA-BOOK-${s.providerId.substring(0, 6).toUpperCase()}`,
                providerId: s.providerId,
                providerName: s.providerName,
                category: s.category,
                startingPrice: s.startingPrice,
                status: (s.bookingStatus as any) || 'PENDING',
                createdAt: new Date().toISOString(),
              });
            if (activeList.length > 0) {
              setConfirmedBookings(activeList as Booking[]);
            }
          } else if (unavailable.length > 0) {
            const names = unavailable.map((p: any) => p.providerName).join(', ');
            showToast(`Booking blocked: All selected providers are unavailable on your event date (${names}).`, 'warning');
          }
          return;
        }
      } catch (err: any) {
        console.warn('Backend booking dispatch failed:', err);
        const errMsg = err?.message || 'Failed to dispatch booking requests to backend';
        showToast(errMsg, 'warning');
        setIsSending(false);
        return;
      }
    }

    // =========================================================================
    // 2. OFFLINE / GUEST FALLBACK
    // =========================================================================
    let currentEventDate = eventPlan?.eventDate || '';
    try {
      const eventJson = localStorage.getItem('eva_ai_event');
      if (eventJson) {
        const parsed = JSON.parse(eventJson);
        if (parsed?.eventDate) {
          currentEventDate = parsed.eventDate;
        }
      }
    } catch (e) {
      console.warn('Failed to parse fresh eva_ai_event:', e);
    }

    const freshAvailableServices: SelectedServiceItem[] = [];
    const freshUnavailableServices: SelectedServiceItem[] = [];

    selectedServices.forEach((service) => {
      if (isProviderAvailable(service.providerId, currentEventDate)) {
        freshAvailableServices.push(service);
      } else {
        freshUnavailableServices.push(service);
      }
    });

    if (freshAvailableServices.length === 0 && freshUnavailableServices.length > 0) {
      setIsSending(false);
      showToast(
        `Booking blocked: All selected providers are unavailable on your event date (${currentEventDate || 'selected date'}).`,
        'warning'
      );
      return;
    }

    let freshExistingBookings: Booking[] = [];
    try {
      const bRaw = localStorage.getItem('eva_ai_bookings');
      if (bRaw) {
        const parsed = JSON.parse(bRaw);
        if (Array.isArray(parsed)) freshExistingBookings = parsed;
      }
    } catch (e) {
      console.warn('Failed to parse fresh eva_ai_bookings:', e);
    }

    const freshActiveMap = new Map<string, Booking>();
    freshExistingBookings.forEach((b) => {
      if (b.status === 'PENDING' || b.status === 'ACCEPTED') {
        freshActiveMap.set(b.providerId, b);
      }
    });

    const customerSession = getCustomerSession();
    const custId = customerSession?.customerId;
    const custName = customerSession?.fullName || customer?.fullName || 'Event Host';
    const custPhone = customerSession?.phone || customer?.phone || '+91 98471 23456';
    const custEmail = customerSession?.email || customer?.email || 'host@eva-ai.internal';

    const newlyCreatedBookings: Booking[] = [];
    const alreadyRequestedProviders: string[] = [];

    const evId = eventPlan?.id || '';
    const eventType = eventPlan?.eventType || 'Celebration';
    const eventDate = currentEventDate;
    const location = eventPlan?.location || '';
    const guestCount = eventPlan?.guestCount || '';

    freshAvailableServices.forEach((service) => {
      const existing = freshActiveMap.get(service.providerId);
      if (existing) {
        alreadyRequestedProviders.push(service.providerName);
      } else {
        const newBooking: Booking = {
          bookingId: `EVA-BOOK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          providerId: service.providerId,
          providerName: service.providerName,
          category: service.category,
          eventId: evId,
          eventType,
          eventDate,
          location: service.location || location,
          guestCount,
          startingPrice: service.startingPrice,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          customerId: custId,
          customerName: custName,
          customerPhone: custPhone,
          customerEmail: custEmail,
        };
        newlyCreatedBookings.push(newBooking);
      }
    });

    if (newlyCreatedBookings.length > 0) {
      const updatedBookings = [...freshExistingBookings, ...newlyCreatedBookings];
      setExistingBookings(updatedBookings);

      try {
        localStorage.setItem('eva_ai_bookings', JSON.stringify(updatedBookings));
      } catch (e) {
        console.warn('Failed to save eva_ai_bookings to localStorage:', e);
      }

      window.dispatchEvent(
        new CustomEvent('eva_ai_bookings_updated', {
          detail: { newlyCreatedBookings },
        })
      );
      window.dispatchEvent(new Event('storage'));
    }

    setIsSending(false);

    if (newlyCreatedBookings.length > 0) {
      setConfirmedBookings(newlyCreatedBookings);
      showToast(`Booking requests created for ${newlyCreatedBookings.length} providers ✓`, 'success');
    } else if (alreadyRequestedProviders.length > 0) {
      showToast(`Booking request already sent to ${alreadyRequestedProviders.join(', ')}.`, 'warning');
      const relevantActive = freshAvailableServices
        .map((s) => activeBookingsMap.get(s.providerId))
        .filter((b): b is Booking => Boolean(b));
      setConfirmedBookings(relevantActive);
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
                        <p className="font-body-md text-sm text-on-surface-variant max-w-md mx-auto leading-relaxed">
                          You haven&apos;t added any service providers to your blueprint yet. Explore verified caterers, venues, photographers, and decorators to build your event package.
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
                      {unavailableServices.length > 0 && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-error-container/30 border border-error/40 flex items-start gap-3 text-xs sm:text-sm text-error animate-fadeIn">
                          <Icon name="event_busy" className="text-error text-[22px] flex-shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="font-bold text-sm">
                              {unavailableServices.length} {unavailableServices.length === 1 ? 'provider is' : 'providers are'} unavailable on your event date ({eventPlan?.eventDate || 'selected date'}).
                            </p>
                            <p className="text-on-surface-variant text-xs leading-relaxed">
                              {unavailableServices.map((s) => s.providerName).join(', ')} cannot accept bookings for this date. They will be excluded if you send booking requests.
                            </p>
                          </div>
                        </div>
                      )}

                      {selectedServices.map((service) => {
                        const activeBooking = activeBookingsMap.get(service.providerId);
                        const isUnavailable =
                          service.isAvailable !== undefined
                            ? !service.isAvailable
                            : !isProviderAvailable(service.providerId, eventPlan?.eventDate);
                        const hasActive =
                          service.hasActiveBooking !== undefined
                            ? service.hasActiveBooking
                            : Boolean(activeBooking);
                        const activeStatus =
                          service.activeBookingStatus || service.bookingStatus || activeBooking?.status;

                        return (
                          <SelectedServiceCard
                            key={service.providerId}
                            service={service}
                            hasActiveBooking={hasActive}
                            activeBookingStatus={activeStatus || undefined}
                            isUnavailable={isUnavailable}
                            eventDate={eventPlan?.eventDate}
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
                    unavailableCount={unavailableServices.length}
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
