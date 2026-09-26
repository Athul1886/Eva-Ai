import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/common/Icon';
import EventPlanHeader from '../components/event-plan/EventPlanHeader';
import EventPlanEventSummary from '../components/event-plan/EventPlanEventSummary';
import SelectedServiceCard from '../components/event-plan/SelectedServiceCard';
import BudgetOverview from '../components/event-plan/BudgetOverview';
import BookingRequestConfirmation from '../components/event-plan/BookingRequestConfirmation';
import { EventPlanData, extractEventData } from '../types/event';
import { SelectedServiceItem } from '../types/service';
import { Booking, normalizeBackendBookings, normalizeBackendBooking } from '../types/booking';
import { CustomerProfileData } from './CustomerSignupPage';
import { isProviderAvailable, fetchAndCacheProviderAvailability } from '../utils/providerAuth';
import { getCustomerSession } from '../utils/customerAuth';
import { eventsApi, bookingsApi, getStoredAccessToken } from '../api/api';

export const EventPlanPage: React.FC = () => {
  // 1. Data States
  const [eventPlan, setEventPlan] = useState<EventPlanData | null>(null);
  const [customer, setCustomer] = useState<CustomerProfileData | null>(null);
  const [selectedServices, setSelectedServices] = useState<SelectedServiceItem[]>([]);
  const [existingBookings, setExistingBookings] = useState<Booking[]>([]);
  const [availabilityVersion, setAvailabilityVersion] = useState<number>(0);
  const [backendPlanMetrics, setBackendPlanMetrics] = useState<{
    totalBudget?: number;
    estimatedCost?: number;
    committedCost?: number;
    pendingCost?: number;
    remainingBudget?: number;
    isOverBudget?: boolean;
  } | null>(null);

  // 2. UI States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'info' | 'success' | 'warning'>('info');
  const [isSending, setIsSending] = useState<boolean>(false);
  const [confirmedBookings, setConfirmedBookings] = useState<Booking[] | null>(null);

  // Load from localStorage & backend on mount
  useEffect(() => {
    let isMounted = true;

    async function loadPlanData() {
      // A. Read event information from localStorage: eva_ai_event
      let localEvent: EventPlanData | null = null;
      try {
        const eventJson = localStorage.getItem('eva_ai_event');
        if (eventJson) {
          localEvent = JSON.parse(eventJson);
          if (isMounted) {
            setEventPlan(localEvent);
          }
        }
      } catch (e) {
        console.warn('Failed to parse eva_ai_event from localStorage:', e);
      }

      // B. Read customer info if present
      try {
        const customerJson = localStorage.getItem('eva_ai_customer');
        if (customerJson && isMounted) {
          setCustomer(JSON.parse(customerJson));
        }
      } catch (e) {
        console.warn('Failed to parse eva_ai_customer from localStorage:', e);
      }

      // C. Read selected services from localStorage: eva_ai_selected_services
      try {
        const selectedJson = localStorage.getItem('eva_ai_selected_services');
        if (selectedJson && isMounted) {
          const parsed = JSON.parse(selectedJson);
          if (Array.isArray(parsed)) {
            setSelectedServices(parsed);
            const providerIds = Array.from(new Set(parsed.map((s: any) => s.providerId).filter(Boolean))) as string[];
            if (providerIds.length > 0) {
              Promise.allSettled(providerIds.map((id) => fetchAndCacheProviderAvailability(id))).then(() => {
                if (isMounted) {
                  setAvailabilityVersion((v) => v + 1);
                }
              });
            }
          }
        }
      } catch (e) {
        console.warn('Failed to parse eva_ai_selected_services from localStorage:', e);
      }

      // D. Read existing booking requests from localStorage: eva_ai_bookings
      try {
        const bookingsJson = localStorage.getItem('eva_ai_bookings');
        if (bookingsJson && isMounted) {
          const parsed = JSON.parse(bookingsJson);
          if (Array.isArray(parsed)) {
            setExistingBookings(parsed);
          }
        }
      } catch (e) {
        console.warn('Failed to parse eva_ai_bookings from localStorage:', e);
      }

      // E. If authenticated, rehydrate event & plan from backend API
      const token = getStoredAccessToken();
      if (token) {
        try {
          let backendEvent: EventPlanData | null = null;
          if (localEvent?.id) {
            try {
              const res = await eventsApi.getById(localEvent.id);
              backendEvent = extractEventData(res);
            } catch {
              backendEvent = null;
            }
          }

          if (!backendEvent) {
            const listRes = await eventsApi.getAll();
            const rawData: any = listRes?.data;
            const rawList =
              rawData?.events ||
              (Array.isArray(rawData) ? rawData : null) ||
              (listRes as any)?.events ||
              (Array.isArray(listRes) ? listRes : []);
            const eventsList = Array.isArray(rawList) ? rawList : [];

            if (eventsList.length > 0) {
              const latest = eventsList[eventsList.length - 1];
              backendEvent = extractEventData({ data: latest });
            }
          }

          if (backendEvent && isMounted) {
            setEventPlan(backendEvent);
            localStorage.setItem('eva_ai_event', JSON.stringify(backendEvent));

            // Fetch backend plan summary (GET /events/:id/plan)
            if (backendEvent.id) {
              try {
                const planRes = await eventsApi.getPlan(backendEvent.id);
                const planData = planRes?.data?.plan || planRes?.data || planRes;
                if (planData && typeof planData === 'object') {
                  setBackendPlanMetrics({
                    totalBudget: typeof planData.totalBudget === 'number' ? planData.totalBudget : undefined,
                    estimatedCost: typeof planData.estimatedCost === 'number' ? planData.estimatedCost : undefined,
                    committedCost: typeof planData.committedCost === 'number' ? planData.committedCost : undefined,
                    pendingCost: typeof planData.pendingCost === 'number' ? planData.pendingCost : undefined,
                    remainingBudget: typeof planData.remainingBudget === 'number' ? planData.remainingBudget : undefined,
                    isOverBudget: typeof planData.isOverBudget === 'boolean' ? planData.isOverBudget : undefined,
                  });

                  // If backend returns shortlisted services (including empty array []), BACKEND WINS
                  const rawBackendServices =
                    planData.services !== undefined
                      ? planData.services
                      : planData.shortlistedServices !== undefined
                      ? planData.shortlistedServices
                      : planData.selectedServices !== undefined
                      ? planData.selectedServices
                      : planData.items;

                  if (Array.isArray(rawBackendServices)) {
                    const normalized: SelectedServiceItem[] = rawBackendServices.map((s: any) => ({
                      cartItemId: s.cartItemId || s.id || s.serviceId,
                      serviceId: s.serviceId || s.id,
                      providerId: s.providerId || s.id,
                      providerName: s.providerName || s.name || '',
                      category: s.category || '',
                      location: s.location || '',
                      startingPrice: Number(s.startingPrice || s.price || 0),
                      selectedAt: s.selectedAt || s.createdAt || new Date().toISOString(),
                      imageUrl: s.imageUrl || s.images?.[0],
                      notes: s.notes,
                      packageDetails: s.packageDetails || s.package,
                    }));
                    setSelectedServices(normalized);
                    localStorage.setItem('eva_ai_selected_services', JSON.stringify(normalized));
                  }
                }
              } catch (planErr) {
                console.warn('Backend getPlan warning:', planErr);
              }
            }
          }

          // Fetch authoritative bookings (GET /bookings/my)
          try {
            const bookingsRes: any = await bookingsApi.getMyBookings();
            const rawBookings =
              bookingsRes?.data?.bookings ||
              bookingsRes?.data ||
              bookingsRes?.bookings ||
              bookingsRes;
            if (Array.isArray(rawBookings) || Array.isArray(bookingsRes?.data)) {
              const backendBookings = normalizeBackendBookings(rawBookings);
              if (isMounted) {
                setExistingBookings(backendBookings);
                localStorage.setItem('eva_ai_bookings', JSON.stringify(backendBookings));
              }
            }
          } catch (bErr) {
            console.warn('Backend getMyBookings in plan page warning:', bErr);
          }
        } catch (apiErr) {
          console.warn('Failed to rehydrate event from backend on plan page:', apiErr);
        }
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    loadPlanData();

    // F. Listen for live availability & booking changes
    const handleAvailabilityChange = () => {
      setAvailabilityVersion((v) => v + 1);
    };

    const handleServicesUpdated = () => {
      try {
        const selectedJson = localStorage.getItem('eva_ai_selected_services');
        if (selectedJson) {
          setSelectedServices(JSON.parse(selectedJson));
        }
      } catch {}
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
    window.addEventListener('eva_ai_provider_availability_updated', handleAvailabilityChange);
    window.addEventListener('eva_ai_selected_services_updated', handleServicesUpdated);
    window.addEventListener('eva_ai_bookings_updated', handleBookingsUpdated);
    window.addEventListener('storage', handleAvailabilityChange);
    window.addEventListener('storage', handleServicesUpdated);
    window.addEventListener('storage', handleBookingsUpdated);

    return () => {
      window.removeEventListener('eva_ai_availability_updated', handleAvailabilityChange);
      window.removeEventListener('eva_ai_provider_availability_updated', handleAvailabilityChange);
      window.removeEventListener('eva_ai_selected_services_updated', handleServicesUpdated);
      window.removeEventListener('eva_ai_bookings_updated', handleBookingsUpdated);
      window.removeEventListener('storage', handleAvailabilityChange);
      window.removeEventListener('storage', handleServicesUpdated);
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

  // Live calculation of unavailable services
  const unavailableServices = useMemo(() => {
    if (!eventPlan?.eventDate) return [];
    return selectedServices.filter((s) => !isProviderAvailable(s.providerId, eventPlan.eventDate));
  }, [selectedServices, eventPlan?.eventDate, availabilityVersion]);

  // Handle removing a service from event plan (DELETE /events/:id/services/:serviceId)
  const handleRemoveService = async (providerId: string) => {
    const itemToRemove = selectedServices.find((s) => s.providerId === providerId);
    const token = getStoredAccessToken();

    if (token && eventPlan?.id && itemToRemove) {
      const serviceIdentifier =
        itemToRemove.serviceId || itemToRemove.id || itemToRemove.cartItemId || providerId;
      try {
        await eventsApi.removeService(eventPlan.id, serviceIdentifier);
      } catch (apiErr: any) {
        console.warn('Backend removeService failed on plan page:', apiErr);
        showToast(apiErr?.message || 'Failed to remove service from backend plan.', 'warning');
        return;
      }
    }

    const updated = selectedServices.filter((s) => s.providerId !== providerId);
    setSelectedServices(updated);

    try {
      localStorage.setItem('eva_ai_selected_services', JSON.stringify(updated));
      window.dispatchEvent(new Event('eva_ai_selected_services_updated'));
    } catch (e) {
      console.warn('Failed to update eva_ai_selected_services in localStorage:', e);
    }

    showToast('Service removed from your event plan.', 'info');
  };

  // Handle sending booking requests with strict fresh availability validation & backend integration
  const handleSendBookingRequests = async () => {
    if (isSending || selectedServices.length === 0) return;

    setIsSending(true);

    try {
      // 1. Fresh check: Re-read latest event date from localStorage
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

      // 2. Perform fresh availability check using latest localStorage availability
      const freshAvailableServices: SelectedServiceItem[] = [];
      const freshUnavailableServices: SelectedServiceItem[] = [];

      selectedServices.forEach((service) => {
        if (isProviderAvailable(service.providerId, currentEventDate)) {
          freshAvailableServices.push(service);
        } else {
          freshUnavailableServices.push(service);
        }
      });

      // 3. If ALL selected providers are unavailable on the event date -> BLOCK SUBMISSION
      if (freshAvailableServices.length === 0 && freshUnavailableServices.length > 0) {
        showToast(
          `Booking blocked: All selected providers are unavailable on your event date (${currentEventDate || 'selected date'}).`,
          'warning'
        );
        return;
      }

      if (freshAvailableServices.length === 0) {
        showToast('No available service providers selected.', 'warning');
        return;
      }

      // 4. Fresh read of existing bookings from localStorage for duplicate detection
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

      // Customer Session Information
      const customerSession = getCustomerSession();
      const custId = customerSession?.customerId;
      const custName = customerSession?.fullName || customer?.fullName || 'Event Host';
      const custPhone = customerSession?.phone || customer?.phone || '+91 98471 23456';
      const custEmail = customerSession?.email || customer?.email || 'host@eva-ai.internal';

      const token = getStoredAccessToken();
      const backendEventId = eventPlan?.id;

      let newlyCreatedBookings: Booking[] = [];
      const alreadyRequestedProviders: string[] = [];

      // Available provider IDs to request
      const providerIdsToSend = freshAvailableServices
        .filter((s) => {
          const existing = freshActiveMap.get(s.providerId);
          if (existing) {
            alreadyRequestedProviders.push(s.providerName);
            return false;
          }
          return true;
        })
        .map((s) => s.providerId);

      if (token && backendEventId && providerIdsToSend.length > 0) {
        // Authoritative Backend Booking Dispatch: POST /events/:id/bookings
        try {
          const apiRes = await eventsApi.createBookings(backendEventId, {
            providerIds: providerIdsToSend,
          });

          const rawBookings =
            apiRes?.data?.bookings ||
            apiRes?.data ||
            (apiRes as any)?.bookings ||
            [];

          const normalized = normalizeBackendBookings(rawBookings);

          if (normalized.length > 0) {
            newlyCreatedBookings = normalized.map((b) => {
              const matchedService = freshAvailableServices.find(
                (s) => s.providerId === b.providerId
              );
              return {
                ...b,
                providerName: b.providerName || matchedService?.providerName || 'Service Provider',
                category: b.category || matchedService?.category || 'General',
                location: b.location || matchedService?.location || eventPlan?.location || '',
                startingPrice:
                  b.startingPrice && b.startingPrice > 0
                    ? b.startingPrice
                    : matchedService?.startingPrice || 0,
                eventDate: b.eventDate || currentEventDate,
                eventType: b.eventType || eventPlan?.eventType || 'Celebration',
                guestCount: b.guestCount || eventPlan?.guestCount,
                customerId: b.customerId || custId,
                customerName: b.customerName || custName,
                customerPhone: b.customerPhone || custPhone,
                customerEmail: b.customerEmail || custEmail,
              };
            });
          } else {
            const single = normalizeBackendBooking(apiRes?.data || apiRes);
            if (single.providerId || single.bookingId) {
              newlyCreatedBookings = [single];
            }
          }
        } catch (apiErr: any) {
          console.warn('Backend createBookings error:', apiErr);
          if (apiErr?.status === 409) {
            showToast('One or more booking requests have already been submitted.', 'warning');
          } else {
            showToast(
              apiErr?.message || 'Failed to submit booking requests to backend.',
              'warning'
            );
          }
          return;
        }
      } else if (!token || !backendEventId) {
        // Offline / Local fallback path when no backend event UUID is present
        const eventId = eventPlan?.createdAt
          ? `event-${new Date(eventPlan.createdAt).getTime()}`
          : `event-current`;
        const eventType = eventPlan?.eventType || 'Celebration';
        const eventDate = currentEventDate;
        const location = eventPlan?.location || '';
        const guestCount = eventPlan?.guestCount || '';

        freshAvailableServices.forEach((service) => {
          const existing = freshActiveMap.get(service.providerId);
          if (existing) {
            if (!alreadyRequestedProviders.includes(service.providerName)) {
              alreadyRequestedProviders.push(service.providerName);
            }
          } else {
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
              customerId: custId,
              customerName: custName,
              customerPhone: custPhone,
              customerEmail: custEmail,
            };
            newlyCreatedBookings.push(newBooking);
          }
        });
      }

      if (newlyCreatedBookings.length > 0) {
        // Merge without duplicating by bookingId / providerId
        const existingIds = new Set(
          freshExistingBookings.map((b) => b.bookingId || b.providerId)
        );
        const filteredNew = newlyCreatedBookings.filter(
          (b) => !existingIds.has(b.bookingId) && !existingIds.has(b.providerId)
        );
        const updatedBookings = [...freshExistingBookings, ...filteredNew];
        setExistingBookings(updatedBookings);

        try {
          localStorage.setItem('eva_ai_bookings', JSON.stringify(updatedBookings));
        } catch (e) {
          console.warn('Failed to save eva_ai_bookings to localStorage:', e);
        }

        // Dispatch synchronized booking update events
        window.dispatchEvent(
          new CustomEvent('eva_ai_bookings_updated', {
            detail: { newlyCreatedBookings },
          })
        );
        window.dispatchEvent(new Event('storage'));
      }

      // Retain only unavailable providers in the event plan
      setSelectedServices(freshUnavailableServices);
      try {
        localStorage.setItem('eva_ai_selected_services', JSON.stringify(freshUnavailableServices));
      } catch (e) {
        console.warn('Failed to update eva_ai_selected_services in localStorage:', e);
      }

      const unavailableNames = freshUnavailableServices.map((s) => s.providerName).join(', ');

      if (alreadyRequestedProviders.length > 0 && newlyCreatedBookings.length === 0) {
        if (freshUnavailableServices.length > 0) {
          showToast(
            `Already requested ${alreadyRequestedProviders.join(', ')}. Note: ${unavailableNames} skipped (unavailable on ${currentEventDate}).`,
            'warning'
          );
        } else {
          showToast(
            `Booking request already sent to ${alreadyRequestedProviders.join(', ')}.`,
            'warning'
          );
        }
        const relevantActive = freshAvailableServices
          .map((s) => activeBookingsMap.get(s.providerId))
          .filter((b): b is Booking => Boolean(b));
        setConfirmedBookings(relevantActive);
      } else if (alreadyRequestedProviders.length > 0 && newlyCreatedBookings.length > 0) {
        if (freshUnavailableServices.length > 0) {
          showToast(
            `Sent ${newlyCreatedBookings.length} requests. Skipped ${unavailableNames} (unavailable).`,
            'warning'
          );
        } else {
          showToast(
            `Sent ${newlyCreatedBookings.length} requests. (Already sent to ${alreadyRequestedProviders.join(', ')})`,
            'success'
          );
        }
        setConfirmedBookings(newlyCreatedBookings);
      } else {
        if (freshUnavailableServices.length > 0) {
          showToast(
            `Booking requests sent for ${newlyCreatedBookings.length} available providers. Skipped ${unavailableNames} (unavailable on ${currentEventDate}).`,
            'warning'
          );
        } else {
          showToast(`Booking requests created for ${newlyCreatedBookings.length} providers ✓`, 'success');
        }
        setConfirmedBookings(newlyCreatedBookings);
      }
    } finally {
      setIsSending(false);
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
                        const isUnavailable = !isProviderAvailable(service.providerId, eventPlan?.eventDate);
                        return (
                          <SelectedServiceCard
                            key={service.providerId}
                            service={service}
                            hasActiveBooking={Boolean(activeBooking)}
                            activeBookingStatus={activeBooking?.status}
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
                    totalBudget={backendPlanMetrics?.totalBudget ?? eventPlan?.budget ?? ''}
                    estimatedCost={backendPlanMetrics?.estimatedCost ?? estimatedCost}
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
