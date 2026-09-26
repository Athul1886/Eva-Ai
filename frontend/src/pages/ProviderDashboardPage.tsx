import React, { useState, useEffect, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import Icon from '../components/common/Icon';
import { Booking, BookingStatus, normalizeBackendBooking, normalizeBackendBookings } from '../types/booking';
import { ProviderSession } from '../types/provider';
import { getProviderBookings } from '../utils/providerAuth';
import { bookingsApi, ApiError } from '../api/api';

export const ProviderDashboardPage: React.FC = () => {
  const { session } = useOutletContext<{ session: ProviderSession }>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [statusActionToast, setStatusActionToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionPendingMap, setActionPendingMap] = useState<Record<string, 'ACCEPTED' | 'REJECTED'>>({});

  const showToast = (message: string, type: 'success' | 'error' = 'success', duration = 3500) => {
    setStatusActionToast({ message, type });
    setTimeout(() => {
      setStatusActionToast((prev) => (prev?.message === message ? null : prev));
    }, duration);
  };

  const loadBookings = useCallback(async (silent = false) => {
    if (!session?.providerId) return;

    // 1. Initial fast local cache read for immediate layout rendering
    if (!silent) {
      const cached = getProviderBookings(session.providerId);
      if (cached.length > 0) {
        setBookings(cached);
      }
    }

    try {
      if (!silent) setIsLoading(true);
      const res: any = await bookingsApi.getProviderBookings();
      const raw = res?.data?.bookings || res?.data || res?.bookings || res;
      const backendBookings = normalizeBackendBookings(raw);

      // 2. Authoritative backend response overrides local state
      setBookings(backendBookings);

      // 3. Cache synchronization (Backend -> State -> Local Cache)
      try {
        const rawStorage = localStorage.getItem('eva_ai_bookings');
        const existing: Booking[] = rawStorage ? JSON.parse(rawStorage) : [];
        const nonProviderBookings = Array.isArray(existing)
          ? existing.filter((b: Booking) => b.providerId && b.providerId !== session.providerId)
          : [];
        const updatedCache = [...backendBookings, ...nonProviderBookings];
        localStorage.setItem('eva_ai_bookings', JSON.stringify(updatedCache));
      } catch (err) {
        console.warn('Failed to update local bookings cache:', err);
      }
    } catch (err: any) {
      console.warn('Failed to fetch provider bookings from backend:', err);
      if (err instanceof ApiError) {
        if (err.status === 401) {
          // Handled by token refresh / auth invalidation
        } else if (err.status === 403) {
          showToast('Access denied: You do not have permission to view these bookings.', 'error');
        } else {
          showToast(err.message || 'Unable to refresh bookings from server.', 'error');
        }
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [session?.providerId]);

  useEffect(() => {
    loadBookings(false);

    const handleBookingsUpdate = () => {
      loadBookings(true);
    };

    window.addEventListener('eva_ai_bookings_updated', handleBookingsUpdate);
    window.addEventListener('storage', handleBookingsUpdate);

    return () => {
      window.removeEventListener('eva_ai_bookings_updated', handleBookingsUpdate);
      window.removeEventListener('storage', handleBookingsUpdate);
    };
  }, [loadBookings]);

  // Dynamic Dashboard Metrics calculated strictly from authoritative provider bookings
  const pendingRequests = bookings.filter((b) => b.status === 'PENDING');
  const acceptedBookings = bookings.filter((b) => b.status === 'ACCEPTED');
  const upcomingEvents = bookings.filter((b) => {
    if (b.status !== 'ACCEPTED') return false;
    if (!b.eventDate) return true;
    return new Date(b.eventDate).getTime() >= new Date().setHours(0, 0, 0, 0);
  });

  const handleStatusChange = async (bookingId: string, newStatus: BookingStatus) => {
    // 1. Double-click & concurrent action protection per booking
    if (actionPendingMap[bookingId]) {
      return;
    }

    // 2. Validate state machine transition (only PENDING -> ACCEPTED / REJECTED allowed)
    const targetBooking = bookings.find((b) => b.bookingId === bookingId);
    if (!targetBooking) return;
    if (targetBooking.status !== 'PENDING') {
      showToast('This booking request is in a terminal state and cannot be changed.', 'error');
      return;
    }

    if (newStatus !== 'ACCEPTED' && newStatus !== 'REJECTED') {
      showToast('Disallowed status transition.', 'error');
      return;
    }

    setActionPendingMap((prev) => ({ ...prev, [bookingId]: newStatus }));

    try {
      // 3. Authoritative backend request: PATCH /bookings/:id/status
      const res: any = await bookingsApi.updateStatus(bookingId, newStatus);
      const raw = res?.data?.booking || res?.data || res?.booking || res;
      const updatedBackendBooking = normalizeBackendBooking(raw);

      // 4. Update authoritative frontend state
      const updatedList = bookings.map((b) => {
        if (b.bookingId === bookingId) {
          return {
            ...b,
            ...(updatedBackendBooking.bookingId === bookingId ? updatedBackendBooking : {}),
            status: newStatus,
            updatedAt: updatedBackendBooking.updatedAt || new Date().toISOString(),
          };
        }
        return b;
      });

      setBookings(updatedList);

      if (selectedBooking && selectedBooking.bookingId === bookingId) {
        setSelectedBooking({
          ...selectedBooking,
          ...(updatedBackendBooking.bookingId === bookingId ? updatedBackendBooking : {}),
          status: newStatus,
          updatedAt: updatedBackendBooking.updatedAt || new Date().toISOString(),
        });
      }

      // 5. Update localStorage cache compatibility layer
      try {
        const rawStorage = localStorage.getItem('eva_ai_bookings');
        const existing: Booking[] = rawStorage ? JSON.parse(rawStorage) : [];
        if (Array.isArray(existing)) {
          const idx = existing.findIndex((b) => b.bookingId === bookingId);
          if (idx >= 0) {
            existing[idx] = {
              ...existing[idx],
              ...(updatedBackendBooking.bookingId === bookingId ? updatedBackendBooking : {}),
              status: newStatus,
              updatedAt: new Date().toISOString(),
            };
            localStorage.setItem('eva_ai_bookings', JSON.stringify(existing));
          }
        }
      } catch (err) {
        console.warn('Failed updating localStorage booking cache:', err);
      }

      // 6. Dispatch cross-role and cross-tab synchronization events
      window.dispatchEvent(
        new CustomEvent('eva_ai_bookings_updated', {
          detail: { bookingId, status: newStatus, providerId: session?.providerId },
        })
      );
      window.dispatchEvent(new Event('storage'));

      showToast(
        newStatus === 'ACCEPTED'
          ? 'Booking request accepted successfully'
          : 'Booking request declined'
      );
    } catch (err: any) {
      console.warn('Failed to update booking status on backend:', err);
      if (err instanceof ApiError) {
        if (err.status === 404 || err.status === 409) {
          showToast('Booking status was modified elsewhere or is no longer available. Refreshing...', 'error');
          loadBookings(true);
        } else if (err.status === 403) {
          showToast('Permission denied: You cannot modify this booking request.', 'error');
        } else {
          showToast(err.message || 'Failed to update booking status on server.', 'error');
        }
      } else {
        showToast('Network error: Unable to reach backend server. Please try again.', 'error');
      }
    } finally {
      setActionPendingMap((prev) => {
        const next = { ...prev };
        delete next[bookingId];
        return next;
      });
    }
  };

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return 'Date TBD';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Pending Review
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Icon name="check" className="text-[12px]" />
            Accepted
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30">
            <Icon name="close" className="text-[12px]" />
            Declined
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-container-highest text-outline">
            Cancelled
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/20 text-primary border border-primary/30">
            <Icon name="task_alt" className="text-[12px]" />
            Completed
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 w-full min-w-0 max-w-full">
      {/* Toast Notification */}
      {statusActionToast && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl backdrop-blur-xl border shadow-2xl text-sm font-semibold flex items-center gap-3 animate-in slide-in-from-bottom duration-200 max-w-[calc(100vw-3rem)] ${
            statusActionToast.type === 'error'
              ? 'bg-error-container/95 border-error/40 text-on-error-container'
              : 'bg-surface-container-high/95 border-secondary/40 text-secondary'
          }`}
        >
          <Icon
            name={statusActionToast.type === 'error' ? 'error' : 'check_circle'}
            className="text-[20px] shrink-0"
          />
          <span className="break-words">{statusActionToast.message}</span>
        </div>
      )}

      {/* WELCOME SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-surface-container/60">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-secondary/20 text-secondary border border-secondary/30">
              {session?.category || 'Atelier'} Partner
            </span>
            <span className="text-xs text-outline">• Portal Active</span>
          </div>
          <h1 className="font-headline-sm text-2xl sm:text-3xl font-bold text-on-surface break-words">
            Welcome back, {session?.businessName || 'Partner'}
          </h1>
          <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant mt-1 break-words">
            Manage your bookings, availability and services from one place.
          </p>
        </div>

        {/* Quick Action Pill Buttons */}
        <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={() => loadBookings(false)}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors border border-surface-container-highest/60 text-center"
            title="Refresh bookings from server"
          >
            <Icon name="refresh" className={`text-[16px] ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Syncing...' : 'Refresh'}</span>
          </button>
          <Link
            to="/provider/schedule"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-secondary hover:bg-secondary-fixed-dim text-on-secondary-fixed text-xs font-bold transition-all shadow-[0_0_15px_rgba(255,178,190,0.25)] text-center"
          >
            <Icon name="event_available" className="text-[16px]" />
            <span>Update Schedule</span>
          </Link>
          <Link
            to="/provider/bookings"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold transition-colors border border-surface-container-highest/60 text-center"
          >
            <Icon name="receipt_long" className="text-[16px]" />
            <span>View All Bookings</span>
          </Link>
        </div>
      </div>

      {/* OVERVIEW METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Pending Booking Requests */}
        <div className="p-4 sm:p-5 rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 shadow-lg relative overflow-hidden group hover:border-amber-500/40 transition-all min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-outline">
              Pending Requests
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-300 flex items-center justify-center shrink-0">
              <Icon name="hourglass_top" className="text-[18px]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-on-surface">
              {pendingRequests.length}
            </span>
            <span className="text-xs text-amber-400 font-medium">Require action</span>
          </div>
          <div className="mt-2 text-[11px] text-on-surface-variant flex items-center gap-1">
            <Icon name="info" className="text-[13px] shrink-0" />
            <span className="truncate">New inquiries from event hosts</span>
          </div>
        </div>

        {/* Card 2: Accepted Bookings */}
        <div className="p-4 sm:p-5 rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 shadow-lg relative overflow-hidden group hover:border-emerald-500/40 transition-all min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-outline">
              Accepted Bookings
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center shrink-0">
              <Icon name="task_alt" className="text-[18px]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-on-surface">
              {acceptedBookings.length}
            </span>
            <span className="text-xs text-emerald-400 font-medium">Confirmed</span>
          </div>
          <div className="mt-2 text-[11px] text-on-surface-variant flex items-center gap-1">
            <Icon name="lock_open" className="text-[13px] shrink-0" />
            <span className="truncate">Client contact details unlocked</span>
          </div>
        </div>

        {/* Card 3: Upcoming Events */}
        <div className="p-4 sm:p-5 rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 shadow-lg relative overflow-hidden group hover:border-primary/40 transition-all min-w-0 sm:col-span-2 md:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-outline">
              Upcoming Events
            </span>
            <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
              <Icon name="calendar_month" className="text-[18px]" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-on-surface">
              {upcomingEvents.length}
            </span>
            <span className="text-xs text-primary font-medium">Scheduled</span>
          </div>
          <div className="mt-2 text-[11px] text-on-surface-variant flex items-center gap-1">
            <Icon name="place" className="text-[13px] shrink-0" />
            <span className="truncate">On-ground productions</span>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS ROW */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-outline">
          Quick Management Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {[
            { to: '/provider/bookings', label: 'Booking Requests', icon: 'receipt_long', desc: 'Accept or decline briefs' },
            { to: '/provider/schedule', label: 'Update Schedule', icon: 'event_available', desc: 'Mark blackout dates' },
            { to: '/provider/profile', label: 'Edit Profile', icon: 'badge', desc: 'Update business specs' },
            { to: '/provider/profile', label: 'Manage Services', icon: 'tune', desc: 'Configure pricing & styles' },
            { to: '/provider/portfolio', label: 'Portfolio & Tiers', icon: 'photo_library', desc: 'Gallery & package tiers' },
          ].map((action, i) => (
            <Link
              key={i}
              to={action.to}
              className="p-3 sm:p-4 rounded-2xl bg-surface-container/70 hover:bg-surface-container-high border border-surface-container-highest/50 hover:border-secondary/40 transition-all group flex flex-col justify-between min-w-0"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-surface-container-high group-hover:bg-secondary/20 group-hover:text-secondary text-primary flex items-center justify-center transition-colors mb-2 sm:mb-3 shrink-0">
                <Icon name={action.icon} className="text-[16px] sm:text-[18px]" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] sm:text-xs font-bold text-on-surface block group-hover:text-primary transition-colors break-words leading-snug">
                  {action.label}
                </span>
                <span className="text-[9px] sm:text-[10px] text-on-surface-variant line-clamp-1 mt-0.5">
                  {action.desc}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* RECENT BOOKING REQUESTS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-on-surface flex items-center gap-2">
              <Icon name="receipt_long" className="text-secondary text-[18px] sm:text-[20px] shrink-0" />
              <span>Recent Booking Inquiries</span>
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Review and respond to client inquiries. Accepting a brief unlocks host contacts.
            </p>
          </div>
          {bookings.length > 0 && (
            <Link
              to="/provider/bookings"
              className="text-xs font-semibold text-secondary hover:underline flex items-center gap-1 shrink-0"
            >
              <span>View All</span>
              <Icon name="chevron_right" className="text-[16px]" />
            </Link>
          )}
        </div>

        {bookings.length === 0 ? (
          /* Empty State */
          <div className="p-6 sm:p-12 rounded-3xl bg-surface-container-high/40 border border-surface-container-highest/60 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-surface-container text-outline mx-auto flex items-center justify-center">
              <Icon name="inbox" className="text-[28px]" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-on-surface">No Booking Inquiries Yet</h3>
              <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                Inquiries submitted by event hosts through the Eva-Ai planner will appear here in real time.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => loadBookings(false)}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary/20 hover:bg-secondary/30 text-secondary text-xs font-bold border border-secondary/40 transition-colors"
              >
                <Icon name="refresh" className={`text-[16px] ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Checking Server...' : 'Check for New Inquiries'}</span>
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* MOBILE PRESENTATION: Stacked Card Layout (md:hidden) */}
            <div className="space-y-3 md:hidden">
              {bookings.slice(0, 6).map((booking) => {
                const isPendingAction = !!actionPendingMap[booking.bookingId];
                return (
                  <div
                    key={`mobile-${booking.bookingId}`}
                    className="p-4 rounded-2xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 shadow-md space-y-3 min-w-0"
                  >
                    {/* Event & Client */}
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-on-surface break-words leading-tight">
                          {booking.eventType || 'Celebration Event'}
                        </div>
                        <div className="text-[11px] text-on-surface-variant mt-1 flex flex-wrap items-center gap-1.5">
                          <span className="text-secondary font-medium">{booking.category}</span>
                          <span className="text-outline">
                            • ID: <span className="font-mono text-[10px] break-all">{booking.bookingId.substring(0, 12)}...</span>
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0">{getStatusBadge(booking.status)}</div>
                    </div>

                    {/* Event Date, Location, Guests & Estimated Value */}
                    <div className="p-3 rounded-xl bg-surface-container/60 border border-surface-container space-y-2 text-xs">
                      <div className="flex items-center gap-2 text-on-surface min-w-0">
                        <Icon name="calendar_today" className="text-outline text-[14px] shrink-0" />
                        <span className="font-medium text-xs truncate">{formatDateDisplay(booking.eventDate)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-on-surface-variant min-w-0">
                        <Icon name="place" className="text-outline text-[14px] shrink-0" />
                        <span className="text-xs break-words">{booking.location || 'Kerala'}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-surface-container/60 text-[11px]">
                        <span className="text-on-surface-variant">
                          {booking.guestCount ? `${booking.guestCount} guests` : 'Flexible guests'}
                        </span>
                        <span className="font-bold text-primary text-xs">
                          {booking.startingPrice ? `₹${booking.startingPrice.toLocaleString('en-IN')}` : 'Custom Quote'}
                        </span>
                      </div>
                    </div>

                    {/* Status / Action Buttons */}
                    <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedBooking(booking)}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface text-xs font-semibold border border-surface-container-highest transition-colors"
                      >
                        <Icon name="visibility" className="text-[15px]" />
                        <span>Details</span>
                      </button>

                      <div className="flex items-center gap-2 flex-1 justify-end">
                        {booking.status === 'PENDING' && (
                          <>
                            <button
                              type="button"
                              disabled={isPendingAction}
                              onClick={() => handleStatusChange(booking.bookingId, 'ACCEPTED')}
                              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-300 font-bold text-xs border border-emerald-500/40 transition-colors"
                            >
                              {actionPendingMap[booking.bookingId] === 'ACCEPTED' ? (
                                <>
                                  <span className="w-3 h-3 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin" />
                                  <span>Accepting...</span>
                                </>
                              ) : (
                                <>
                                  <Icon name="check" className="text-[14px]" />
                                  <span>Accept</span>
                                </>
                              )}
                            </button>
                            <button
                              type="button"
                              disabled={isPendingAction}
                              onClick={() => handleStatusChange(booking.bookingId, 'REJECTED')}
                              className="inline-flex items-center justify-center px-2.5 py-2 rounded-xl bg-surface-container hover:bg-error/20 disabled:opacity-50 disabled:cursor-not-allowed text-on-surface-variant hover:text-error text-xs font-semibold border border-surface-container-highest transition-colors"
                            >
                              {actionPendingMap[booking.bookingId] === 'REJECTED' ? (
                                <span className="w-3 h-3 border-2 border-outline border-t-transparent rounded-full animate-spin" />
                              ) : (
                                <span>Decline</span>
                              )}
                            </button>
                          </>
                        )}

                        {booking.status === 'ACCEPTED' && (
                          <button
                            type="button"
                            onClick={() => setSelectedBooking(booking)}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 px-3.5 py-2 rounded-xl bg-secondary/15 hover:bg-secondary/25 text-secondary text-xs font-bold border border-secondary/30 transition-colors"
                          >
                            <Icon name="contact_phone" className="text-[14px]" />
                            <span>Client Phone</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DESKTOP PRESENTATION: Table (hidden md:block) */}
            <div className="hidden md:block rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 shadow-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-surface-container/80 text-[11px] font-bold uppercase tracking-wider text-outline bg-surface-container-low/40">
                      <th className="py-3.5 px-4 sm:px-6">Event & Client</th>
                      <th className="py-3.5 px-4">Event Date</th>
                      <th className="py-3.5 px-4">Location</th>
                      <th className="py-3.5 px-4">Guests</th>
                      <th className="py-3.5 px-4">Estimated Value</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container/60 text-xs">
                    {bookings.slice(0, 6).map((booking) => {
                      const isPendingAction = !!actionPendingMap[booking.bookingId];
                      return (
                        <tr
                          key={booking.bookingId}
                          className="hover:bg-surface-container/40 transition-colors"
                        >
                          {/* Event / Client */}
                          <td className="py-4 px-4 sm:px-6">
                            <div className="font-bold text-sm text-on-surface">
                              {booking.eventType || 'Celebration Event'}
                            </div>
                            <div className="text-[11px] text-on-surface-variant mt-0.5 flex items-center gap-1.5">
                              <span className="text-secondary font-medium">{booking.category}</span>
                              <span>• ID: {booking.bookingId.substring(0, 12)}...</span>
                            </div>
                          </td>

                          {/* Event Date */}
                          <td className="py-4 px-4 font-medium text-on-surface whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Icon name="calendar_today" className="text-[14px] text-outline" />
                              <span>{formatDateDisplay(booking.eventDate)}</span>
                            </div>
                          </td>

                          {/* Location */}
                          <td className="py-4 px-4 text-on-surface-variant whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Icon name="place" className="text-[14px] text-outline" />
                              <span className="truncate max-w-[120px]">{booking.location || 'Kerala'}</span>
                            </div>
                          </td>

                          {/* Guests */}
                          <td className="py-4 px-4 text-on-surface-variant">
                            {booking.guestCount ? `${booking.guestCount} guests` : '—'}
                          </td>

                          {/* Price */}
                          <td className="py-4 px-4 font-bold text-primary whitespace-nowrap">
                            {booking.startingPrice
                              ? `₹${booking.startingPrice.toLocaleString('en-IN')}`
                              : 'Custom Quote'}
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4 whitespace-nowrap">
                            {getStatusBadge(booking.status)}
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              {booking.status === 'PENDING' && (
                                <>
                                  <button
                                    type="button"
                                    disabled={isPendingAction}
                                    onClick={() => handleStatusChange(booking.bookingId, 'ACCEPTED')}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-300 font-bold text-xs border border-emerald-500/40 transition-colors flex items-center gap-1"
                                    title="Accept brief"
                                  >
                                    {actionPendingMap[booking.bookingId] === 'ACCEPTED' ? (
                                      <>
                                        <span className="w-3 h-3 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin" />
                                        <span>Accepting...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Icon name="check" className="text-[14px]" />
                                        <span>Accept</span>
                                      </>
                                    )}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isPendingAction}
                                    onClick={() => handleStatusChange(booking.bookingId, 'REJECTED')}
                                    className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-error/20 disabled:opacity-50 disabled:cursor-not-allowed text-on-surface-variant hover:text-error text-xs font-semibold border border-surface-container-highest transition-colors"
                                    title="Decline brief"
                                  >
                                    {actionPendingMap[booking.bookingId] === 'REJECTED' ? (
                                      <span className="w-3 h-3 border-2 border-outline border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                      <span>Decline</span>
                                    )}
                                  </button>
                                </>
                              )}

                              {booking.status === 'ACCEPTED' && (
                                <button
                                  type="button"
                                  onClick={() => setSelectedBooking(booking)}
                                  className="px-3 py-1.5 rounded-lg bg-secondary/15 hover:bg-secondary/25 text-secondary text-xs font-bold border border-secondary/30 transition-colors flex items-center gap-1"
                                >
                                  <Icon name="contact_phone" className="text-[14px]" />
                                  <span>Client Phone</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setSelectedBooking(booking)}
                                className="p-1.5 rounded-lg hover:bg-surface-container text-outline hover:text-on-surface transition-colors"
                                title="View details"
                              >
                                <Icon name="visibility" className="text-[16px]" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* DETAIL MODAL / DRAWER */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="max-w-lg w-full bg-surface-container-high rounded-3xl border border-surface-container-highest shadow-2xl p-4 sm:p-8 space-y-4 sm:space-y-5 my-auto">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-secondary">
                  Booking Request Details
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-on-surface mt-0.5 break-words">
                  {selectedBooking.eventType || 'Celebration Event'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="p-2 rounded-xl bg-surface-container hover:bg-surface-container-highest text-outline hover:text-on-surface transition-colors shrink-0"
              >
                <Icon name="close" className="text-[18px]" />
              </button>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-container-low border border-surface-container space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-surface-container">
                <span className="text-on-surface-variant">Status:</span>
                <div>{getStatusBadge(selectedBooking.status)}</div>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-surface-container">
                <span className="text-on-surface-variant">Event Date:</span>
                <span className="font-semibold text-on-surface">{formatDateDisplay(selectedBooking.eventDate)}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-surface-container">
                <span className="text-on-surface-variant">Location:</span>
                <span className="font-semibold text-on-surface break-words text-right">{selectedBooking.location || 'Kerala'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-surface-container">
                <span className="text-on-surface-variant">Guests:</span>
                <span className="font-semibold text-on-surface">{selectedBooking.guestCount ? `${selectedBooking.guestCount} attendees` : 'Flexible'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-surface-container">
                <span className="text-on-surface-variant">Estimated Fee:</span>
                <span className="font-bold text-primary">₹{selectedBooking.startingPrice?.toLocaleString('en-IN') || '45,000'}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-on-surface-variant shrink-0">Booking ID:</span>
                <span className="font-mono text-[10px] sm:text-[11px] text-outline break-all text-right ml-2">{selectedBooking.bookingId}</span>
              </div>
            </div>

            {/* Client Contact Info Box (conditional strictly on authoritative status) */}
            {selectedBooking.status === 'ACCEPTED' || selectedBooking.status === 'COMPLETED' ? (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold">
                    <Icon name="lock_open" className="text-[16px]" />
                    <span>Client Contact Details</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                    Unlocked
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container/60 border border-surface-container space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant">Client Name:</span>
                    <span className="font-semibold text-on-surface">
                      {selectedBooking.customerName || 'Event Client'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant font-medium">Client Mobile:</span>
                    <span className="font-bold text-emerald-300 font-mono text-sm tracking-wide">
                      {selectedBooking.customerPhone || 'Not provided'}
                    </span>
                  </div>
                  {selectedBooking.customerEmail && (
                    <div className="flex justify-between items-center">
                      <span className="text-on-surface-variant">Client Email:</span>
                      <span className="font-medium text-on-surface break-all text-right ml-2">
                        {selectedBooking.customerEmail}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-1 flex flex-col xs:flex-row items-stretch xs:items-center gap-2.5">
                  {selectedBooking.customerPhone ? (
                    <a
                      href={`tel:${selectedBooking.customerPhone.replace(/[^0-9+]/g, '')}`}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-on-primary font-bold text-xs transition-colors shadow-sm text-center"
                    >
                      <Icon name="call" className="text-[15px]" />
                      <span>Call Client</span>
                    </a>
                  ) : null}
                  {selectedBooking.customerEmail ? (
                    <a
                      href={`mailto:${selectedBooking.customerEmail}`}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs border border-surface-container-highest transition-colors text-center"
                    >
                      <Icon name="mail" className="text-[15px]" />
                      <span>Send Email</span>
                    </a>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-container-low border border-surface-container text-xs text-on-surface-variant flex items-center gap-2.5">
                <Icon name="lock" className="text-outline text-[18px] shrink-0" />
                <span>
                  {selectedBooking.status === 'REJECTED' || selectedBooking.status === 'CANCELLED'
                    ? 'Client contact information is locked for declined or cancelled booking requests.'
                    : 'Client phone number and contact details become available immediately once you Accept this booking inquiry.'}
                </span>
              </div>
            )}

            {/* Action Buttons in Modal */}
            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2.5 pt-2">
              {selectedBooking.status === 'PENDING' && (
                <>
                  <button
                    type="button"
                    disabled={!!actionPendingMap[selectedBooking.bookingId]}
                    onClick={() => handleStatusChange(selectedBooking.bookingId, 'ACCEPTED')}
                    className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-on-primary font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    {actionPendingMap[selectedBooking.bookingId] === 'ACCEPTED' ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Accepting...</span>
                      </>
                    ) : (
                      <>
                        <Icon name="check" className="text-[16px]" />
                        <span>Accept Booking</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={!!actionPendingMap[selectedBooking.bookingId]}
                    onClick={() => handleStatusChange(selectedBooking.bookingId, 'REJECTED')}
                    className="py-3 px-4 rounded-xl bg-surface-container hover:bg-error/20 disabled:opacity-50 disabled:cursor-not-allowed text-on-surface-variant hover:text-error text-xs font-semibold border border-surface-container-highest transition-colors text-center flex items-center justify-center gap-1.5"
                  >
                    {actionPendingMap[selectedBooking.bookingId] === 'REJECTED' ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-outline border-t-transparent rounded-full animate-spin" />
                        <span>Declining...</span>
                      </>
                    ) : (
                      <span>Decline</span>
                    )}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setSelectedBooking(null)}
                className="w-full py-3 rounded-xl bg-surface-container hover:bg-surface-container-highest text-on-surface text-xs font-semibold border border-surface-container-highest"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderDashboardPage;
