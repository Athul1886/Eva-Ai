import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import Icon from '../components/common/Icon';
import { Booking, BookingStatus, normalizeBackendBooking, normalizeBackendBookings } from '../types/booking';
import { ProviderSession } from '../types/provider';
import { getProviderBookings } from '../utils/providerAuth';
import { bookingsApi, ApiError } from '../api/api';

export const ProviderBookingsPage: React.FC = () => {
  const { session } = useOutletContext<{ session: ProviderSession }>();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [toastMessage, setToastMessage] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionPendingMap, setActionPendingMap] = useState<Record<string, 'ACCEPTED' | 'REJECTED'>>({});

  const showToast = (message: string, type: 'success' | 'error' = 'success', duration = 3500) => {
    setToastMessage({ message, type });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.message === message ? null : prev));
    }, duration);
  };

  const loadBookings = useCallback(async (silent = false) => {
    if (!session?.providerId) return;

    // 1. Local cache fast read for layout speed
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

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== 'ALL' && b.status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchType = (b.eventType || '').toLowerCase().includes(q);
      const matchLoc = (b.location || '').toLowerCase().includes(q);
      const matchCat = (b.category || '').toLowerCase().includes(q);
      const matchId = (b.bookingId || '').toLowerCase().includes(q);
      const matchCustomer = (b.customerName || '').toLowerCase().includes(q);
      return matchType || matchLoc || matchCat || matchId || matchCustomer;
    }
    return true;
  });

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
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl backdrop-blur-xl border shadow-2xl text-sm font-semibold flex items-center gap-3 animate-in slide-in-from-bottom duration-200 max-w-[calc(100vw-3rem)] ${
            toastMessage.type === 'error'
              ? 'bg-error-container/95 border-error/40 text-on-error-container'
              : 'bg-surface-container-high/95 border-secondary/40 text-secondary'
          }`}
        >
          <Icon
            name={toastMessage.type === 'error' ? 'error' : 'check_circle'}
            className="text-[20px] shrink-0"
          />
          <span className="break-words">{toastMessage.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-surface-container/60">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-secondary/20 text-secondary border border-secondary/30">
              Inquiry Pipeline
            </span>
            <span className="text-xs text-outline">• {bookings.length} Total Records</span>
          </div>
          <h1 className="font-headline-sm text-2xl sm:text-3xl font-bold text-on-surface break-words">
            Client Booking Requests
          </h1>
          <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant mt-1 break-words">
            Review detailed event briefs submitted by clients. Accept to unlock communication and reserve dates.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => loadBookings(false)}
            disabled={isLoading}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold border border-surface-container-highest/60 transition-colors text-center"
          >
            <Icon name="refresh" className={`text-[16px] ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Refreshing...' : 'Refresh Inquiries'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-surface-container-high/60 border border-surface-container-highest/60 overflow-x-auto max-w-full min-w-0">
          {[
            { id: 'ALL', label: 'All Requests' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'ACCEPTED', label: 'Accepted' },
            { id: 'REJECTED', label: 'Declined' },
            { id: 'CANCELLED', label: 'Cancelled' },
            { id: 'COMPLETED', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 sm:px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-secondary text-on-secondary-fixed shadow-[0_0_12px_rgba(255,178,190,0.3)]'
                  : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
              }`}
            >
              {tab.label}
              {tab.id === 'PENDING' && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300">
                  {bookings.filter((b) => b.status === 'PENDING').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by event, location, client..."
            className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-container text-on-surface text-xs focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
          />
          <Icon name="search" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline text-[18px]" />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-outline hover:text-on-surface"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <div className="p-12 rounded-3xl bg-surface-container-high/40 border border-surface-container-highest/60 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-surface-container text-outline mx-auto flex items-center justify-center">
            <Icon name="filter_list" className="text-[24px]" />
          </div>
          <h3 className="font-bold text-sm text-on-surface">No Requests Found</h3>
          <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
            {searchTerm
              ? 'No booking requests match your current search query.'
              : 'No booking requests under this status filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBookings.map((b) => {
            const isPendingAction = !!actionPendingMap[b.bookingId];
            return (
              <div
                key={b.bookingId}
                className="p-4 sm:p-5 rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 shadow-lg flex flex-col justify-between hover:border-secondary/30 transition-all group min-w-0"
              >
                <div className="space-y-3 min-w-0">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-secondary">
                        {b.category}
                      </span>
                      <h3 className="font-bold text-base text-on-surface mt-0.5 break-words leading-tight">
                        {b.eventType || 'Celebration Event'}
                      </h3>
                    </div>
                    <div className="shrink-0">{getStatusBadge(b.status)}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-surface-container/60 border border-surface-container space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 text-on-surface min-w-0">
                      <Icon name="calendar_today" className="text-outline text-[14px] shrink-0" />
                      <span className="font-medium truncate">{formatDateDisplay(b.eventDate)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-on-surface-variant min-w-0">
                      <Icon name="place" className="text-outline text-[14px] shrink-0" />
                      <span className="break-words">{b.location || 'Kerala'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-on-surface-variant min-w-0">
                      <Icon name="groups" className="text-outline text-[14px] shrink-0" />
                      <span>{b.guestCount ? `${b.guestCount} guests` : 'Guest count flexible'}</span>
                    </div>
                  </div>

                  {b.notes && (
                    <p className="text-xs text-on-surface-variant line-clamp-2 italic break-words">
                      "{b.notes}"
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-surface-container flex flex-wrap items-center justify-between gap-2">
                  <div className="font-bold text-sm text-primary">
                    {b.startingPrice ? `₹${b.startingPrice.toLocaleString('en-IN')}` : 'Custom'}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {b.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          disabled={isPendingAction}
                          onClick={() => handleStatusChange(b.bookingId, 'ACCEPTED')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-300 font-bold text-xs border border-emerald-500/40 transition-colors flex items-center gap-1"
                        >
                          {actionPendingMap[b.bookingId] === 'ACCEPTED' ? (
                            <>
                              <span className="w-3 h-3 border-2 border-emerald-300 border-t-transparent rounded-full animate-spin" />
                              <span>Accepting...</span>
                            </>
                          ) : (
                            <>
                              <Icon name="check" className="text-[13px]" />
                              <span>Accept</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={isPendingAction}
                          onClick={() => handleStatusChange(b.bookingId, 'REJECTED')}
                          className="px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-error/20 disabled:opacity-50 disabled:cursor-not-allowed text-on-surface-variant hover:text-error text-xs font-semibold border border-surface-container-highest transition-colors"
                        >
                          {actionPendingMap[b.bookingId] === 'REJECTED' ? (
                            <span className="w-3 h-3 border-2 border-outline border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <span>Decline</span>
                          )}
                        </button>
                      </>
                    )}

                    {b.status === 'ACCEPTED' && (
                      <button
                        type="button"
                        onClick={() => setSelectedBooking(b)}
                        className="px-3 py-1.5 rounded-lg bg-secondary/15 hover:bg-secondary/25 text-secondary text-xs font-bold border border-secondary/30 transition-colors flex items-center gap-1"
                      >
                        <Icon name="contact_phone" className="text-[13px]" />
                        <span>Client Phone</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setSelectedBooking(b)}
                      className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-outline hover:text-on-surface transition-colors"
                      title="View details"
                    >
                      <Icon name="visibility" className="text-[16px]" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details Modal */}
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

            {/* Client Contact Info Box (strictly conditional on authoritative status) */}
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

export default ProviderBookingsPage;
