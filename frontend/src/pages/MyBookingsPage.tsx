import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/common/Icon';
import BookingCard from '../components/bookings/BookingCard';
import BookingSummary, { FilterStatus } from '../components/bookings/BookingSummary';
import BookingFilters from '../components/bookings/BookingFilters';
import { Booking, normalizeBackendBookings, getCachedCustomerBookings } from '../types/booking';
import { EventPlanData, formatIndianRupees, extractEventData } from '../types/event';
import { CustomerProfileData } from './CustomerSignupPage';
import { bookingsApi, eventsApi, getStoredAccessToken } from '../api/api';

export const MyBookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>(() => getCachedCustomerBookings());
  const [eventPlan, setEventPlan] = useState<EventPlanData | null>(() => {
    try {
      const e = localStorage.getItem('eva_ai_event');
      return e ? JSON.parse(e) : null;
    } catch {
      return null;
    }
  });
  const [customer, setCustomer] = useState<CustomerProfileData | null>(() => {
    try {
      const c = localStorage.getItem('eva_ai_customer');
      return c ? JSON.parse(c) : null;
    } catch {
      return null;
    }
  });
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(() => getCachedCustomerBookings().length === 0);
  const [isRehydrating, setIsRehydrating] = useState<boolean>(true);
  const [hasRehydrated, setHasRehydrated] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const isFetchingRef = useRef<boolean>(false);
  const pendingRefreshRef = useRef<boolean>(false);

  const fetchBookingsData = useCallback(async () => {
    if (isFetchingRef.current) {
      pendingRefreshRef.current = true;
      return;
    }

    isFetchingRef.current = true;
    setIsRehydrating(true);

    try {
      // Sync latest customer profile and local event plan if available
      try {
        const eventJson = localStorage.getItem('eva_ai_event');
        if (eventJson) setEventPlan(JSON.parse(eventJson));
        const customerJson = localStorage.getItem('eva_ai_customer');
        if (customerJson) setCustomer(JSON.parse(customerJson));
      } catch (e) {
        console.warn('Failed to parse local metadata:', e);
      }

      const token = getStoredAccessToken();
      if (!token) {
        setIsLoading(false);
        setIsRehydrating(false);
        setHasRehydrated(true);
        return;
      }

      let fetchSuccess = false;
      let backendBookings: Booking[] = [];
      let errorMessage: string | null = null;

      try {
        const bookingsRes: any = await bookingsApi.getMyBookings();
        const rawBookings =
          bookingsRes?.data?.bookings ||
          bookingsRes?.data ||
          bookingsRes?.bookings ||
          bookingsRes;

        if (Array.isArray(rawBookings) || Array.isArray(bookingsRes?.data)) {
          backendBookings = normalizeBackendBookings(rawBookings);
          fetchSuccess = true;
        } else {
          fetchSuccess = true;
          backendBookings = [];
        }
      } catch (bErr: any) {
        console.warn('Failed to fetch bookings from backend:', bErr);
        errorMessage =
          bErr?.message ||
          'Unable to refresh bookings from server. Showing saved local data.';
      }

      // Authoritative Event Rehydration
      try {
        let backendEvent: EventPlanData | null = null;
        let localEv: EventPlanData | null = null;
        try {
          const ej = localStorage.getItem('eva_ai_event');
          if (ej) localEv = JSON.parse(ej);
        } catch {}

        if (localEv?.id) {
          try {
            const res = await eventsApi.getById(localEv.id);
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

        if (backendEvent) {
          setEventPlan(backendEvent);
          try {
            localStorage.setItem('eva_ai_event', JSON.stringify(backendEvent));
          } catch {}
        }
      } catch (eErr) {
        console.warn('Failed to fetch event details in MyBookings:', eErr);
      }

      if (fetchSuccess) {
        // Backend is authoritative
        setBookings(backendBookings);
        try {
          localStorage.setItem('eva_ai_bookings', JSON.stringify(backendBookings));
        } catch (e) {
          console.warn('Failed to save eva_ai_bookings to localStorage:', e);
        }
        setFetchError(null);
      } else {
        // Backend request failed:
        // Preserve existing cached bookings without replacing with []
        setFetchError(errorMessage);
      }

      setHasRehydrated(true);
      setIsLoading(false);
      setIsRehydrating(false);
    } finally {
      isFetchingRef.current = false;
      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        fetchBookingsData();
      }
    }
  }, []);

  useEffect(() => {
    fetchBookingsData();

    const handleSync = () => {
      fetchBookingsData();
    };

    window.addEventListener('eva_ai_bookings_updated', handleSync);
    window.addEventListener('storage', handleSync);
    window.addEventListener('eva_ai_customer_session_updated', handleSync);

    return () => {
      window.removeEventListener('eva_ai_bookings_updated', handleSync);
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('eva_ai_customer_session_updated', handleSync);
    };
  }, [fetchBookingsData]);


  // Compute status counts dynamically
  const counts = useMemo<Record<FilterStatus, number>>(() => {
    const c: Record<FilterStatus, number> = {
      ALL: bookings.length,
      PENDING: 0,
      ACCEPTED: 0,
      REJECTED: 0,
      CANCELLED: 0,
      COMPLETED: 0,
    };

    bookings.forEach((b) => {
      const status = b.status?.toUpperCase() as keyof typeof c;
      if (c[status] !== undefined && status !== 'ALL') {
        c[status]++;
      }
    });

    return c;
  }, [bookings]);

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    if (activeFilter === 'ALL') return bookings;
    return bookings.filter((b) => b.status === activeFilter);
  }, [bookings, activeFilter]);

  // Format event date
  const formatEventDate = (dateStr?: string) => {
    if (!dateStr || dateStr.trim() === '') return 'Not specified';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const eventTypeDisplay = eventPlan?.eventType
    ? eventPlan.eventType.charAt(0).toUpperCase() + eventPlan.eventType.slice(1)
    : 'Not specified';

  const guestCountDisplay =
    eventPlan?.guestCount !== undefined &&
    eventPlan?.guestCount !== null &&
    eventPlan?.guestCount !== '' &&
    Number(eventPlan.guestCount) > 0
      ? `${eventPlan.guestCount} Guests`
      : 'Not specified';

  const budgetDisplay =
    eventPlan?.budget !== undefined &&
    eventPlan?.budget !== null &&
    eventPlan?.budget !== '' &&
    Number(eventPlan.budget) > 0
      ? formatIndianRupees(eventPlan.budget)
      : 'Not specified';

  const getFilterEmptyMessage = (filter: FilterStatus) => {
    switch (filter) {
      case 'PENDING':
        return {
          title: 'No pending requests',
          subtitle: 'Pending service requests waiting for provider review will appear here.',
        };
      case 'ACCEPTED':
        return {
          title: 'No accepted bookings',
          subtitle: 'Accepted service requests will appear here once approved by providers.',
        };
      case 'REJECTED':
        return {
          title: 'No rejected requests',
          subtitle: 'Declined service requests will appear here.',
        };
      case 'CANCELLED':
        return {
          title: 'No cancelled bookings',
          subtitle: 'Cancelled requests will appear here.',
        };
      case 'COMPLETED':
        return {
          title: 'No completed services',
          subtitle: 'Completed service deliveries will appear here.',
        };
      default:
        return {
          title: 'No bookings found',
          subtitle: 'No service booking requests match the selected filter.',
        };
    }
  };

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary">
      {/* Main Content */}
      <main className="flex-1 pt-28 pb-28 relative overflow-hidden">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[850px] h-[350px] bg-primary/8 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/2 right-[-100px] w-96 h-96 bg-secondary-container/10 rounded-full blur-[130px] pointer-events-none" />

        <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin relative z-10 space-y-8">
          {/* 1. Page Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-surface-container-highest/60">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-bold uppercase tracking-wider">
                <Icon name="receipt_long" className="text-[15px]" />
                <span>Customer Portal &bull; Booking Tracker</span>
                {bookings.length > 0 && (
                  <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-semibold border border-primary/30">
                    {bookings.length} {bookings.length === 1 ? 'Booking Request' : 'Booking Requests'}
                  </span>
                )}
                {isRehydrating && (
                  <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container text-primary text-[10px] font-semibold border border-primary/30 animate-pulse">
                    <Icon name="sync" className="animate-spin text-[10px]" />
                    <span>Syncing...</span>
                  </span>
                )}
              </div>

              <h1 className="font-headline-lg text-3xl sm:text-4xl md:text-5xl font-semibold text-on-surface tracking-tight">
                My Bookings
              </h1>

              <p className="font-body-lg text-sm sm:text-base text-on-surface-variant max-w-2xl leading-relaxed">
                Track your service requests and booking status in one place. Each provider independently reviews your request; verified contact details unlock upon confirmation.
              </p>
            </div>

            {/* Navigation Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/customer/dashboard"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface text-xs sm:text-sm font-semibold transition-colors border border-surface-container-highest/60"
              >
                <Icon name="dashboard" className="text-[18px] text-on-surface-variant" />
                <span>Back to Dashboard</span>
              </Link>

              <Link
                to="/customer/event-plan"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-bright text-primary text-xs sm:text-sm font-semibold transition-colors border border-primary/30"
              >
                <Icon name="event_note" className="text-[18px]" />
                <span>My Event Plan</span>
              </Link>

              <Link
                to="/customer/services"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary text-xs sm:text-sm font-semibold transition-all border border-primary/30"
              >
                <Icon name="explore" className="text-[18px]" />
                <span>Explore Services</span>
              </Link>
            </div>
          </div>

          {/* 2. Event Summary Card */}
          <div className="rounded-3xl bg-surface-container-high/70 backdrop-blur-xl border border-surface-container-highest/70 p-6 sm:p-7 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20 opacity-80" />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
                  <Icon name="event" className="text-[16px]" />
                  <span>Current Event Summary</span>
                </div>

                <Link
                  to="/customer/event-plan"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors py-1 px-2.5 rounded-lg hover:bg-surface-container"
                >
                  <Icon name="visibility" className="text-[14px]" />
                  <span>View Full Plan</span>
                </Link>
              </div>

              {/* 5-item Event Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                <div className="p-3.5 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 space-y-1">
                  <span className="text-[11px] text-on-surface-variant uppercase tracking-wider block font-medium">
                    Event Type
                  </span>
                  <p className="font-title-md text-sm sm:text-base font-bold text-on-surface truncate">
                    {eventTypeDisplay}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 space-y-1">
                  <span className="text-[11px] text-on-surface-variant uppercase tracking-wider block font-medium">
                    Date
                  </span>
                  <p className="font-title-md text-sm sm:text-base font-bold text-on-surface truncate">
                    {formatEventDate(eventPlan?.eventDate)}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 space-y-1">
                  <span className="text-[11px] text-on-surface-variant uppercase tracking-wider block font-medium">
                    Location
                  </span>
                  <p className="font-title-md text-sm sm:text-base font-bold text-on-surface truncate">
                    {eventPlan?.location || 'Not specified'}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 space-y-1">
                  <span className="text-[11px] text-on-surface-variant uppercase tracking-wider block font-medium">
                    Guest Count
                  </span>
                  <p className="font-title-md text-sm sm:text-base font-bold text-on-surface truncate">
                    {guestCountDisplay}
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 space-y-1 col-span-2 sm:col-span-1">
                  <span className="text-[11px] text-on-surface-variant uppercase tracking-wider block font-medium">
                    Budget
                  </span>
                  <p className="font-title-md text-sm sm:text-base font-bold text-primary truncate">
                    {budgetDisplay}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Non-blocking error banner if backend rehydration fails but cache is available */}
          {fetchError && bookings.length > 0 && (
            <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-200">
              <div className="flex items-center gap-2.5">
                <Icon name="cloud_off" className="text-amber-400 text-[18px] flex-shrink-0" />
                <span>
                  Unable to sync fresh bookings from server. Showing your locally saved bookings.
                </span>
              </div>
              <button
                type="button"
                onClick={() => fetchBookingsData()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-semibold border border-amber-500/30 transition-colors flex-shrink-0 self-start sm:self-auto"
              >
                <Icon name="refresh" className="text-[14px]" />
                <span>Retry Sync</span>
              </button>
            </div>
          )}

          {/* Render Branches: Skeleton Loading | Error State | Empty State | Bookings List */}
          {isLoading && bookings.length === 0 ? (
            /* Loading Skeleton (Never renders "No bookings yet" while loading) */
            <div className="space-y-8 animate-pulse">
              {/* Skeleton KPI Cards */}
              <div className="space-y-3">
                <div className="h-5 w-48 bg-surface-container rounded-lg" />
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-20 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40"
                    />
                  ))}
                </div>
              </div>

              {/* Skeleton Booking Cards */}
              <div className="space-y-5 pt-2">
                <div className="h-10 w-full max-w-md bg-surface-container rounded-xl" />
                {[...Array(2)].map((_, i) => (
                  <div
                    key={i}
                    className="h-64 rounded-3xl bg-surface-container-high/40 border border-surface-container-highest/50 p-6 space-y-4"
                  >
                    <div className="flex justify-between items-center">
                      <div className="h-5 w-32 bg-surface-container rounded-md" />
                      <div className="h-6 w-24 bg-surface-container rounded-full" />
                    </div>
                    <div className="flex gap-4 items-center">
                      <div className="w-28 h-28 rounded-2xl bg-surface-container flex-shrink-0" />
                      <div className="flex-1 space-y-3">
                        <div className="h-6 w-1/3 bg-surface-container rounded-md" />
                        <div className="h-4 w-1/4 bg-surface-container rounded-md" />
                        <div className="grid grid-cols-3 gap-2 pt-2">
                          <div className="h-10 bg-surface-container rounded-xl" />
                          <div className="h-10 bg-surface-container rounded-xl" />
                          <div className="h-10 bg-surface-container rounded-xl" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : !isLoading && bookings.length === 0 && fetchError ? (
            /* Error State (Network/Server failure with 0 cached bookings - Never falsely say "No bookings yet") */
            <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-rose-500/30 p-10 sm:p-14 text-center space-y-5 max-w-lg mx-auto shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-rose-500/15 text-rose-300 mx-auto flex items-center justify-center border border-rose-500/30">
                <Icon name="error_outline" className="text-[32px]" />
              </div>

              <div className="space-y-2">
                <h3 className="font-headline-sm text-xl sm:text-2xl font-bold text-on-surface">
                  Unable to Load Bookings
                </h3>
                <p className="font-body-md text-sm text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                  {fetchError}
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLoading(true);
                    fetchBookingsData();
                  }}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md font-bold transition-all shadow-[0_0_20px_rgba(242,202,80,0.25)] hover:shadow-[0_0_28px_rgba(242,202,80,0.4)]"
                >
                  <Icon name="refresh" className="text-[18px]" />
                  <span>Retry Connection</span>
                </button>
              </div>
            </div>
          ) : bookings.length === 0 ? (
            /* Authoritative Empty State: backend genuinely returned 0 bookings */
            <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 p-10 sm:p-16 text-center space-y-5 max-w-lg mx-auto shadow-xl">
              <div className="w-16 h-16 rounded-2xl bg-surface-container text-on-surface-variant mx-auto flex items-center justify-center border border-surface-container-highest/60">
                <Icon name="inbox" className="text-[32px] text-primary/70" />
              </div>

              <div className="space-y-2">
                <h3 className="font-headline-sm text-xl sm:text-2xl font-bold text-on-surface">
                  No bookings yet
                </h3>
                <p className="font-body-md text-sm text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                  You haven&apos;t sent any service booking requests yet. Build your event plan and dispatch your requests.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to="/customer/services"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md font-bold transition-all shadow-[0_0_20px_rgba(242,202,80,0.25)] hover:shadow-[0_0_28px_rgba(242,202,80,0.4)]"
                >
                  <Icon name="explore" className="text-[18px]" />
                  <span>Explore Services</span>
                </Link>

                <Link
                  to="/customer/event-plan"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface font-title-md font-semibold transition-colors border border-surface-container-highest/60"
                >
                  <Icon name="event_note" className="text-[18px]" />
                  <span>My Event Plan</span>
                </Link>
              </div>
            </div>
          ) : (
            /* 3. Active Bookings View */
            <div className="space-y-8">
              {/* Status Summary KPI Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="font-headline-sm text-xl font-bold text-on-surface flex items-center gap-2">
                    <Icon name="analytics" className="text-primary text-[20px]" />
                    <span>Booking Status Overview</span>
                  </h2>
                  <span className="text-xs text-on-surface-variant">
                    Click any status card to filter requests
                  </span>
                </div>

                <BookingSummary
                  counts={counts}
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                />
              </div>

              {/* Filter Tabs & Listing Section */}
              <div className="space-y-6 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-surface-container-highest/40">
                  <BookingFilters
                    activeFilter={activeFilter}
                    counts={counts}
                    onFilterChange={setActiveFilter}
                  />

                  <div className="text-xs text-on-surface-variant flex-shrink-0">
                    Showing <span className="font-bold text-on-surface">{filteredBookings.length}</span> of {bookings.length} requests
                  </div>
                </div>

                {/* Filter Empty State (when filtered bookings count is 0) */}
                {filteredBookings.length === 0 ? (
                  <div className="rounded-3xl bg-surface-container-high/40 border border-surface-container-highest/60 p-10 sm:p-14 text-center space-y-4 max-w-md mx-auto my-6">
                    <div className="w-14 h-14 rounded-2xl bg-surface-container text-on-surface-variant mx-auto flex items-center justify-center">
                      <Icon name="filter_list_off" className="text-[28px] text-on-surface-variant" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-headline-sm text-lg font-bold text-on-surface">
                        {getFilterEmptyMessage(activeFilter).title}
                      </h4>
                      <p className="text-xs text-on-surface-variant leading-relaxed">
                        {getFilterEmptyMessage(activeFilter).subtitle}
                      </p>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveFilter('ALL')}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-tertiary text-on-primary text-xs font-bold transition-all shadow-[0_0_15px_rgba(242,202,80,0.25)]"
                      >
                        <Icon name="refresh" className="text-[16px]" />
                        <span>View All Bookings</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 5. Booking Cards List */
                  <div className="space-y-5">
                    {filteredBookings.map((booking, idx) => (
                      <BookingCard
                        key={booking.bookingId || `booking-${idx}`}
                        booking={booking}
                        index={idx}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MyBookingsPage;

