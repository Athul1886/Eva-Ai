import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import BookingStatusBadge from './BookingStatusBadge';
import ContactProviderCard from './ContactProviderCard';
import { Booking } from '../../types/booking';
import { MOCK_PROVIDERS } from '../../data/mockProviders';
import { formatIndianRupees } from '../../types/event';

interface BookingCardProps {
  booking: Booking;
  index?: number;
}

export const BookingCard: React.FC<BookingCardProps> = ({ booking, index }) => {
  // Enrich with mock provider dataset
  const provider = MOCK_PROVIDERS.find((p) => p.id === booking.providerId);

  const displayName = provider?.name || booking.providerName;
  const displayCategory = provider?.category || booking.category;
  const displayLocation = provider?.location || booking.location || 'Palakkad, Kerala';
  const displayImage =
    provider?.images?.[0] ||
    'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80';
  const displayPrice = provider?.startingPrice || booking.startingPrice || 0;

  // Format Booking ID
  const displayBookingId = (() => {
    if (!booking.bookingId) {
      return `EVA-BOOK-${String((index ?? 0) + 1).padStart(3, '0')}`;
    }
    if (booking.bookingId.toUpperCase().startsWith('EVA-BOOK-')) {
      return booking.bookingId.toUpperCase();
    }
    const parts = booking.bookingId.split('-');
    const suffix = parts[parts.length - 1];
    return `EVA-BOOK-${suffix.toUpperCase().slice(0, 6)}`;
  })();

  // Format request date
  const formatRequestDate = (dateStr?: string) => {
    if (!dateStr) return 'Requested recently';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return `Requested ${dateStr}`;
      return `Requested ${d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })}`;
    } catch {
      return `Requested ${dateStr}`;
    }
  };

  // Format event date
  const formatEventDate = (dateStr?: string) => {
    if (!dateStr || dateStr.trim() === '') return 'Not set';
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

  const guestCountDisplay =
    booking.guestCount !== undefined &&
    booking.guestCount !== null &&
    booking.guestCount !== '' &&
    Number(booking.guestCount) > 0
      ? `${booking.guestCount} Guests`
      : 'Guest count not set';

  const isAccepted = booking.status === 'ACCEPTED';
  const isCompleted = booking.status === 'COMPLETED';
  const isPending = booking.status === 'PENDING';
  const isRejected = booking.status === 'REJECTED';
  const isCancelled = booking.status === 'CANCELLED';

  return (
    <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/70 hover:border-primary/40 transition-all duration-300 p-6 sm:p-7 shadow-xl space-y-6">
      {/* Top Bar: Booking ID & Status Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-surface-container-highest/60">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-bold text-primary tracking-wider px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/20">
            {displayBookingId}
          </span>
          <span className="text-xs text-on-surface-variant flex items-center gap-1">
            <Icon name="schedule" className="text-[14px]" />
            <span>{formatRequestDate(booking.createdAt)}</span>
          </span>
        </div>

        <BookingStatusBadge status={booking.status} />
      </div>

      {/* Main Body: Image & Core Details */}
      <div className="flex flex-col md:flex-row gap-5 items-start">
        {/* Thumbnail Image */}
        <div className="relative w-full md:w-36 h-48 md:h-36 rounded-2xl overflow-hidden bg-surface-container flex-shrink-0 border border-surface-container-highest/50">
          <img
            src={displayImage}
            alt={displayName}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute top-2.5 left-2.5">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-container-lowest/90 text-primary border border-primary/30 backdrop-blur-md">
              {displayCategory}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="flex-1 space-y-3 min-w-0 w-full">
          <div>
            <h3 className="font-headline-sm text-xl sm:text-2xl font-bold text-on-surface">
              {displayName}
            </h3>
            <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-0.5">
              <Icon name="location_on" className="text-primary text-[14px]" />
              <span>{displayLocation}</span>
            </p>
          </div>

          {/* Event Meta Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
            <div className="p-2.5 rounded-xl bg-surface-container-low border border-surface-container-highest/50">
              <span className="text-[10px] uppercase text-on-surface-variant font-medium block">
                📅 Event Date
              </span>
              <span className="font-semibold text-on-surface truncate block mt-0.5">
                {formatEventDate(booking.eventDate)}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-container-low border border-surface-container-highest/50">
              <span className="text-[10px] uppercase text-on-surface-variant font-medium block">
                👥 Guests
              </span>
              <span className="font-semibold text-on-surface truncate block mt-0.5">
                {guestCountDisplay}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-surface-container-low border border-surface-container-highest/50">
              <span className="text-[10px] uppercase text-on-surface-variant font-medium block">
                Starting Price
              </span>
              <span className="font-bold text-primary truncate block mt-0.5">
                {formatIndianRupees(displayPrice)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Status Section */}
      {/* 1. PENDING */}
      {isPending && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon name="hourglass_empty" className="text-[18px]" />
          </div>
          <div className="space-y-1">
            <h4 className="font-title-md text-xs sm:text-sm font-bold text-amber-200">
              Waiting for provider response
            </h4>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              The service professional has received your request. Contact details will become available if the provider accepts your request.
            </p>
          </div>
        </div>
      )}

      {/* 2. ACCEPTED (Reveals ContactProviderCard strictly for this booking) */}
      {(isAccepted || (isCompleted && provider?.contactDemo)) && provider?.contactDemo && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Icon name="check_circle" className="text-[16px]" />
            </div>
            <div>
              <span className="font-title-md text-xs sm:text-sm font-bold text-emerald-300 block">
                {isCompleted ? 'Service Completed' : 'Booking Accepted'}
              </span>
              <span className="text-[11px] text-on-surface-variant">
                The provider has confirmed your request. Contact details unlocked below:
              </span>
            </div>
          </div>

          <ContactProviderCard
            contactDemo={provider.contactDemo}
            providerName={displayName}
          />
        </div>
      )}

      {/* 3. REJECTED */}
      {isRejected && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-300 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon name="cancel" className="text-[18px]" />
            </div>
            <div className="space-y-0.5">
              <h4 className="font-title-md text-xs sm:text-sm font-bold text-rose-200">
                Booking Rejected
              </h4>
              <p className="text-xs text-on-surface-variant">
                The provider declined this booking request.
              </p>
            </div>
          </div>

          <Link
            to="/customer/services"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-bright text-primary text-xs font-semibold border border-primary/30 flex-shrink-0 self-start sm:self-auto transition-colors"
          >
            <Icon name="search" className="text-[14px]" />
            <span>Explore Similar Services</span>
          </Link>
        </div>
      )}

      {/* 4. CANCELLED */}
      {isCancelled && (
        <div className="p-4 rounded-2xl bg-surface-container border border-surface-container-highest/60 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-surface-container-highest text-on-surface-variant flex items-center justify-center flex-shrink-0">
            <Icon name="block" className="text-[18px]" />
          </div>
          <div>
            <h4 className="font-title-md text-xs sm:text-sm font-bold text-on-surface">
              Booking Cancelled
            </h4>
            <p className="text-xs text-on-surface-variant">
              This request was cancelled. Contact details remain protected.
            </p>
          </div>
        </div>
      )}

      {/* Card Footer: Subtle disclaimer & View Provider action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-surface-container-highest/50">
        <span className="text-[11px] text-on-surface-variant/80 italic">
          Final pricing is confirmed directly with the service provider.
        </span>

        <Link
          to={`/customer/services/${booking.providerId}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface text-xs font-semibold transition-colors border border-surface-container-highest/60 hover:border-primary/40 flex-shrink-0 self-end sm:self-auto"
        >
          <Icon name="visibility" className="text-[15px] text-primary" />
          <span>View Provider</span>
        </Link>
      </div>
    </div>
  );
};

export default BookingCard;
