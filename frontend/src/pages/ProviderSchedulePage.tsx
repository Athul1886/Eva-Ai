import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import Icon from '../components/common/Icon';
import { ProviderSession } from '../types/provider';
import {
  getProviderAvailability,
  saveProviderAvailability,
  normalizeUnavailableDates,
  getProviderBookings,
  normalizeCalendarDate,
} from '../utils/providerAuth';
import { normalizeBackendBookings } from '../types/booking';
import { providersApi, bookingsApi, ApiError } from '../api/api';

export const ProviderSchedulePage: React.FC = () => {
  const { session } = useOutletContext<{ session: ProviderSession }>();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [manualBlackoutDates, setManualBlackoutDates] = useState<string[]>([]);
  const [bookedDates, setBookedDates] = useState<string[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [saveNotice, setSaveNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const inFlightRef = useRef(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success', duration = 3500) => {
    setSaveNotice({ message, type });
    setTimeout(() => {
      setSaveNotice((prev) => (prev?.message === message ? null : prev));
    }, duration);
  };

  // Robust local date string helper avoiding timezone shift
  const formatLocalDate = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const todayStr = formatLocalDate(new Date());

  const loadAvailability = useCallback(async (silent = false) => {
    if (!session?.providerId) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    // 1. Initial fast local cache read for layout rendering
    if (!silent) {
      const cached = getProviderAvailability(session.providerId);
      const validCached = cached.filter((d) => d >= todayStr);
      setUnavailableDates(validCached);
    }

    // 2. Fetch authoritative availability AND bookings in parallel
    try {
      if (!silent) setIsLoading(true);

      const [availResult, bookingsResult] = await Promise.allSettled([
        providersApi.getUnavailableDates(session.providerId).catch(async () => {
          return await providersApi.getAvailability();
        }),
        bookingsApi.getProviderBookings(),
      ]);

      let backendUnavailableDates: string[] = [];
      if (availResult.status === 'fulfilled' && availResult.value) {
        const raw = (availResult.value as any)?.data ?? availResult.value;
        backendUnavailableDates = normalizeUnavailableDates(raw);
      }

      let backendBookedDates: string[] = [];
      if (bookingsResult.status === 'fulfilled' && bookingsResult.value) {
        const raw =
          (bookingsResult.value as any)?.data?.bookings ||
          (bookingsResult.value as any)?.data ||
          (bookingsResult.value as any)?.bookings ||
          bookingsResult.value;
        const bookingsList = normalizeBackendBookings(raw);
        const acceptedBookings = bookingsList.filter(
          (b) => b.status === 'ACCEPTED' && b.eventDate
        );
        backendBookedDates = Array.from(
          new Set(
            acceptedBookings
              .map((b) => normalizeCalendarDate(b.eventDate))
              .filter((d): d is string => Boolean(d))
          )
        );
      } else {
        const localBookings = getProviderBookings(session.providerId);
        const accepted = localBookings.filter((b) => b.status === 'ACCEPTED' && b.eventDate);
        backendBookedDates = Array.from(
          new Set(
            accepted
              .map((b) => normalizeCalendarDate(b.eventDate))
              .filter((d): d is string => Boolean(d))
          )
        );
      }

      // Distinguish manual blackouts from booked dates
      const manualDates = backendUnavailableDates.filter((d) => !backendBookedDates.includes(d));
      const compositeDates = Array.from(new Set([...backendUnavailableDates, ...backendBookedDates]))
        .filter((d) => d >= todayStr)
        .sort();

      setManualBlackoutDates(manualDates);
      setBookedDates(backendBookedDates);
      setUnavailableDates(compositeDates);
      saveProviderAvailability(session.providerId, compositeDates);
    } catch (err: any) {
      console.warn('Failed fetching provider availability from backend:', err);
      if (err instanceof ApiError) {
        if (err.status === 403) {
          showToast('Access denied: You do not have permission to view this schedule.', 'error');
        }
      }
    } finally {
      inFlightRef.current = false;
      if (!silent) setIsLoading(false);
    }
  }, [session?.providerId, todayStr]);

  useEffect(() => {
    loadAvailability(false);

    const handleSync = () => {
      loadAvailability(true);
    };

    window.addEventListener('eva_ai_provider_availability_updated', handleSync);
    window.addEventListener('eva_ai_bookings_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('eva_ai_provider_availability_updated', handleSync);
      window.removeEventListener('eva_ai_bookings_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadAvailability]);

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDateStr(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDateStr(null);
  };

  const getDateStr = (day: number) => {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    return `${year}-${monthStr}-${dayStr}`;
  };

  const isPastDate = (day: number) => {
    return getDateStr(day) < todayStr;
  };

  const handleDateClick = (day: number) => {
    // Past dates cannot be modified
    if (isPastDate(day)) return;

    const fullDate = getDateStr(day);
    setSelectedDateStr(fullDate);

    // If date is an accepted client booking, it cannot be manually toggled
    if (bookedDates.includes(fullDate)) {
      showToast('This date is reserved for an accepted client booking.', 'error', 3000);
      return;
    }

    // Toggle manual blackout
    setManualBlackoutDates((prev) => {
      let updated: string[];
      if (prev.includes(fullDate)) {
        updated = prev.filter((d) => d !== fullDate);
      } else {
        updated = [...prev, fullDate];
      }
      const composite = Array.from(new Set([...updated, ...bookedDates])).filter((d) => d >= todayStr);
      setUnavailableDates(composite);
      return updated;
    });
  };

  const handleSaveSchedule = async () => {
    if (!session?.providerId || isSaving) return;

    // Only persist manual blackout dates to PUT /providers/availability/sync
    const cleanManualDates = manualBlackoutDates.filter((d) => d >= todayStr && !bookedDates.includes(d));

    setIsSaving(true);

    try {
      // 1. Authoritative backend request: PUT /providers/availability/sync
      const res: any = await providersApi.syncAvailability({
        dates: cleanManualDates,
        unavailableDates: cleanManualDates,
      });

      // 2. Normalize backend response if dates returned
      const raw = res?.data ?? res;
      const returnedManualDates = normalizeUnavailableDates(raw);
      const finalManual = returnedManualDates.length > 0
        ? returnedManualDates.filter((d) => d >= todayStr && !bookedDates.includes(d))
        : cleanManualDates;

      setManualBlackoutDates(finalManual);
      const composite = Array.from(new Set([...finalManual, ...bookedDates])).filter((d) => d >= todayStr);

      setUnavailableDates(composite);
      saveProviderAvailability(session.providerId, composite);
      showToast('Schedule & Availability synchronized successfully with server!', 'success');
    } catch (err: any) {
      console.warn('Failed to sync schedule with backend:', err);
      // Fallback: preserve composite in localStorage cache
      const composite = Array.from(new Set([...cleanManualDates, ...bookedDates])).filter((d) => d >= todayStr);
      saveProviderAvailability(session.providerId, composite);
      setUnavailableDates(composite);

      if (err instanceof ApiError) {
        if (err.status === 403) {
          showToast('Permission denied: You cannot modify this availability schedule.', 'error');
        } else {
          showToast(err.message || 'Server error syncing schedule. Saved locally as fallback.', 'error');
        }
      } else {
        showToast('Network error: Unable to reach server. Saved locally as fallback.', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAll = () => {
    setManualBlackoutDates([]);
    const composite = bookedDates.filter((d) => d >= todayStr);
    setUnavailableDates(composite);
    setSelectedDateStr(null);
    if (bookedDates.length > 0) {
      showToast('Cleared manual blackouts. Accepted booking dates remain reserved.', 'success', 3000);
    } else {
      showToast('All blackout dates cleared.', 'success', 2500);
    }
  };

  const isToday = (day: number) => {
    return getDateStr(day) === todayStr;
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-300 w-full min-w-0 max-w-full">
      {/* Toast Notification */}
      {saveNotice && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl backdrop-blur-xl border shadow-2xl text-sm font-semibold flex items-center gap-3 animate-in slide-in-from-bottom duration-200 max-w-[calc(100vw-3rem)] ${
            saveNotice.type === 'error'
              ? 'bg-error-container/95 border-error/40 text-on-error-container'
              : 'bg-surface-container-high/95 border-secondary/40 text-secondary'
          }`}
        >
          <Icon
            name={saveNotice.type === 'error' ? 'error' : 'check_circle'}
            className="text-[20px] shrink-0"
          />
          <span className="break-words">{saveNotice.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-surface-container/60">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-secondary/20 text-secondary border border-secondary/30">
              Calendar Management
            </span>
            <span className="text-xs text-outline">• Live Booking Guard</span>
          </div>
          <h1 className="font-headline-sm text-2xl sm:text-3xl font-bold text-on-surface break-words">
            Update Atelier Schedule &amp; Availability
          </h1>
          <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant mt-1 break-words">
            Click on individual dates to mark them as unavailable (blackout dates). Accepted client bookings are automatically guarded.
          </p>
          <div className="flex items-center gap-1.5 text-xs text-outline mt-1 font-medium">
            <Icon name="lock" className="text-[14px] text-outline/70 shrink-0" />
            <span>Past dates cannot be modified. Booked event dates are locked.</span>
          </div>
        </div>

        {/* Save Schedule CTA */}
        <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={() => loadAvailability(false)}
            disabled={isLoading || isSaving}
            className="px-3.5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold border border-surface-container-highest transition-colors text-center flex items-center justify-center gap-1.5"
            title="Refresh schedule from server"
          >
            <Icon name="refresh" className={`text-[16px] ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Syncing...' : 'Refresh'}</span>
          </button>
          <button
            type="button"
            onClick={handleClearAll}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high disabled:opacity-50 text-on-surface text-xs font-semibold border border-surface-container-highest transition-colors text-center"
          >
            Clear Blackouts
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={handleSaveSchedule}
            className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary-fixed-dim disabled:opacity-50 text-on-secondary-fixed text-xs font-bold transition-all shadow-[0_0_20px_rgba(255,178,190,0.3)] flex items-center justify-center gap-2 text-center"
          >
            {isSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-on-secondary-fixed border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Icon name="save" className="text-[16px]" />
                <span>Save Schedule</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Calendar Card and Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Interactive Calendar (2 Cols) */}
        <div className="lg:col-span-2 p-3.5 sm:p-6 lg:p-8 rounded-3xl bg-surface-container-high/60 backdrop-blur-2xl border border-surface-container-highest/60 shadow-xl space-y-4 sm:space-y-6 min-w-0">
          {/* Month Navigation */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h2 className="text-lg sm:text-xl font-bold text-on-surface">
                {monthNames[month]} {year}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-semibold bg-surface-container text-primary border border-surface-container-highest">
                {unavailableDates.filter((d) => d.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length} Unavailable this month
              </span>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 sm:p-2 rounded-xl bg-surface-container hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors"
                title="Previous Month"
              >
                <Icon name="chevron_left" className="text-[18px] sm:text-[20px]" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentDate(new Date())}
                className="px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-highest text-xs font-semibold text-on-surface transition-colors"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 sm:p-2 rounded-xl bg-surface-container hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors"
                title="Next Month"
              >
                <Icon name="chevron_right" className="text-[18px] sm:text-[20px]" />
              </button>
            </div>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-outline border-b border-surface-container pb-2 sm:pb-3">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          {/* Calendar Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-3 min-w-0">
            {/* Blank leading days */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`blank-${i}`} className="h-12 sm:h-20 rounded-xl sm:rounded-2xl bg-surface-container/20 opacity-30" />
            ))}

            {/* Month days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const fullDate = getDateStr(day);
              const isPast = isPastDate(day);
              const isBooked = !isPast && bookedDates.includes(fullDate);
              const isManual = !isPast && manualBlackoutDates.includes(fullDate);
              const unavailable = isBooked || isManual;
              const current = isToday(day);
              const isSelected = selectedDateStr === fullDate;

              return (
                <button
                  key={`day-${day}`}
                  type="button"
                  disabled={isPast}
                  onClick={() => handleDateClick(day)}
                  title={
                    isPast
                      ? 'Past dates cannot be modified.'
                      : isBooked
                      ? 'Reserved for accepted client booking (Locked)'
                      : isManual
                      ? 'Marked as manual blackout (Click to remove)'
                      : isSelected
                      ? 'Selected date'
                      : 'Click to toggle availability'
                  }
                  className={`h-12 sm:h-20 p-1 sm:p-2 rounded-xl sm:rounded-2xl border text-left transition-all flex flex-col justify-between relative overflow-hidden min-w-0 ${
                    isPast
                      ? 'opacity-35 cursor-not-allowed bg-surface-container-low/30 border-surface-container/30 text-outline select-none'
                      : isBooked
                      ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.15)] group'
                      : isManual
                      ? 'bg-rose-950/40 border-rose-500/50 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)] group'
                      : isSelected
                      ? 'bg-secondary/20 border-secondary text-on-surface ring-1 ring-secondary group'
                      : 'bg-surface-container/70 border-surface-container-highest/60 text-on-surface hover:bg-surface-container-high hover:border-secondary/40 group'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span
                      className={`text-[11px] sm:text-sm font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shrink-0 ${
                        current
                          ? 'bg-primary text-on-primary shadow-sm'
                          : isPast
                          ? 'text-outline/70'
                          : 'text-on-surface'
                      }`}
                    >
                      {day}
                    </span>
                    {isBooked && (
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-400 shrink-0" />
                    )}
                    {isManual && (
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-400 shrink-0" />
                    )}
                    {isPast && (
                      <Icon name="lock" className="text-[11px] sm:text-[13px] text-outline/50 shrink-0" />
                    )}
                  </div>

                  <div className="text-[8px] sm:text-[10px] font-medium truncate leading-tight">
                    {isPast ? (
                      <span className="text-outline/60">Past</span>
                    ) : isBooked ? (
                      <>
                        <span className="text-amber-400 font-bold sm:hidden">Booked</span>
                        <span className="text-amber-400 font-bold hidden sm:inline">Booked Event</span>
                      </>
                    ) : isManual ? (
                      <>
                        <span className="text-rose-400 font-bold sm:hidden">Off</span>
                        <span className="text-rose-400 font-bold hidden sm:inline">Blackout</span>
                      </>
                    ) : (
                      <>
                        <span className="text-emerald-400/80 group-hover:text-emerald-300 sm:hidden">Avail</span>
                        <span className="text-emerald-400/80 group-hover:text-emerald-300 hidden sm:inline">Available</span>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="pt-4 border-t border-surface-container grid grid-cols-2 sm:flex sm:items-center gap-2.5 sm:gap-6 text-xs text-on-surface-variant flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-emerald-400/80 shrink-0" />
              <span className="truncate">Available</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-amber-400 shrink-0" />
              <span className="truncate">Booked Event (Guarded)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-rose-500 shrink-0" />
              <span className="truncate">Manual Blackout</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-primary shrink-0" />
              <span className="truncate">Today</span>
            </div>
            <div className="flex items-center gap-2 opacity-70">
              <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-outline/40 shrink-0" />
              <span className="truncate">Past (Locked)</span>
            </div>
          </div>
        </div>

        {/* Schedule Sidebar / Actions (1 Col) */}
        <div className="space-y-4 sm:space-y-6">
          {/* Quick Date Inspector */}
          <div className="p-4 sm:p-6 rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 shadow-lg space-y-4">
            <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <Icon name="event_note" className="text-secondary text-[18px]" />
              <span>Date Inspector</span>
            </h3>

            {selectedDateStr ? (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-container-low border border-surface-container space-y-3 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Selected:</span>
                  <span className="font-bold text-on-surface text-sm">
                    {new Date(selectedDateStr).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-on-surface-variant">Status:</span>
                  <span
                    className={`font-bold ${
                      bookedDates.includes(selectedDateStr)
                        ? 'text-amber-400'
                        : manualBlackoutDates.includes(selectedDateStr)
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {bookedDates.includes(selectedDateStr)
                      ? 'Reserved by Client Booking'
                      : manualBlackoutDates.includes(selectedDateStr)
                      ? 'Manual Blackout'
                      : 'Available'}
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  {bookedDates.includes(selectedDateStr)
                    ? 'This date is reserved for an accepted client booking and cannot be unblocked here.'
                    : manualBlackoutDates.includes(selectedDateStr)
                    ? 'Marked as a manual blackout. Click the date in the grid or list below to remove.'
                    : 'Date is currently available. Click in the calendar grid to mark as blackout.'}
                </p>
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant">
                Click any date on the calendar grid to view its booking availability state and toggle blackout status.
              </p>
            )}

            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveSchedule}
              className="w-full py-3.5 rounded-xl bg-secondary hover:bg-secondary-fixed-dim disabled:opacity-50 text-on-secondary-fixed font-bold text-xs transition-all shadow-[0_0_15px_rgba(255,178,190,0.25)] flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-on-secondary-fixed border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Icon name="save" className="text-[16px]" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>

          {/* Active Blackout & Reserved Dates List */}
          <div className="p-4 sm:p-6 rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 shadow-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <Icon name="block" className="text-rose-400 text-[18px]" />
                <span>Unavailable Dates</span>
              </h3>
              <span className="text-xs font-bold text-secondary">
                {unavailableDates.length} Total
              </span>
            </div>

            {unavailableDates.length === 0 ? (
              <p className="text-xs text-on-surface-variant">
                No blackout dates currently selected. All calendar dates are currently marked available.
              </p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                {unavailableDates.sort().map((dateStr) => {
                  const isBooked = bookedDates.includes(dateStr);
                  return (
                    <div
                      key={dateStr}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                        isBooked
                          ? 'bg-amber-950/20 border-amber-500/30'
                          : 'bg-surface-container border-surface-container-highest'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Icon
                          name={isBooked ? 'event_available' : 'event_busy'}
                          className={`text-[16px] ${isBooked ? 'text-amber-400' : 'text-rose-400'}`}
                        />
                        <span className="font-medium text-on-surface">{dateStr}</span>
                        {isBooked ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                            Booked
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold">
                            Blackout
                          </span>
                        )}
                      </div>
                      {!isBooked && (
                        <button
                          type="button"
                          onClick={() => {
                            setManualBlackoutDates((prev) => {
                              const updated = prev.filter((d) => d !== dateStr);
                              const composite = Array.from(new Set([...updated, ...bookedDates])).filter((d) => d >= todayStr);
                              setUnavailableDates(composite);
                              return updated;
                            });
                          }}
                          className="text-outline hover:text-error text-xs font-semibold p-1"
                          title="Remove Blackout"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderSchedulePage;

