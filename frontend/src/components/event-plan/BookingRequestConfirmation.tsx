import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { Booking } from '../../types/booking';
import { formatIndianRupees } from '../../types/event';

interface BookingRequestConfirmationProps {
  createdBookings: Booking[];
  onReturnToPlan: () => void;
}

const getCategoryEmoji = (category: string = ''): string => {
  const cat = category.toLowerCase();
  if (cat.includes('photo')) return '📸';
  if (cat.includes('makeup')) return '💄';
  if (cat.includes('venue')) return '🏰';
  if (cat.includes('cater')) return '🍽️';
  if (cat.includes('decor')) return '🌸';
  if (cat.includes('dj') || cat.includes('music') || cat.includes('entertain')) return '🎵';
  if (cat.includes('manage')) return '📋';
  return '✨';
};

export const BookingRequestConfirmation: React.FC<BookingRequestConfirmationProps> = ({
  createdBookings,
  onReturnToPlan,
}) => {
  const count = createdBookings.length;

  return (
    <div className="max-w-2xl mx-auto rounded-3xl bg-surface-container-high/90 backdrop-blur-2xl border border-primary/40 p-6 sm:p-10 shadow-2xl space-y-8 animate-fadeIn">
      {/* Header & Success Icon */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/20 text-primary mx-auto flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(242,202,80,0.35)] animate-pulse">
          <Icon name="check_circle" className="text-[36px]" />
        </div>

        <div className="space-y-1.5">
          <span className="font-label-sm uppercase tracking-widest text-primary font-bold">
            Request Dispatch Complete
          </span>
          <h2 className="font-headline-lg text-2xl sm:text-3xl md:text-4xl font-semibold text-on-surface">
            Booking requests sent successfully
          </h2>
          <p className="font-body-md text-sm sm:text-base text-on-surface-variant max-w-lg mx-auto">
            Your service providers have been notified. You can track their responses in My Bookings.
          </p>
        </div>

        {/* Notice of mock status / future backend ready */}
        <div className="p-3.5 rounded-2xl bg-surface-container border border-surface-container-highest/60 text-xs text-on-surface-variant max-w-lg mx-auto leading-relaxed">
          <p>
            Your booking requests have been created. Provider responses will appear in your bookings portal once reviewed.
          </p>
        </div>
      </div>

      {/* Booked Providers List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-on-surface-variant uppercase tracking-wider px-1">
          <span>Requested Service Providers</span>
          <span>Status</span>
        </div>

        <div className="divide-y divide-surface-container-highest/50 rounded-2xl bg-surface-container-low border border-surface-container-highest/60 overflow-hidden">
          {createdBookings.map((booking) => (
            <div
              key={booking.bookingId}
              className="p-4 flex items-center justify-between gap-4 hover:bg-surface-container/60 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-2xl flex-shrink-0" role="img" aria-label={booking.category}>
                  {getCategoryEmoji(booking.category)}
                </span>
                <div className="min-w-0">
                  <h4 className="font-title-md text-sm sm:text-base font-semibold text-on-surface truncate">
                    {booking.providerName}
                  </h4>
                  <div className="flex items-center gap-2 text-xs text-on-surface-variant mt-0.5">
                    <span>{booking.category}</span>
                    {booking.startingPrice && (
                      <>
                        <span>&bull;</span>
                        <span className="text-primary font-medium">
                          {formatIndianRupees(booking.startingPrice)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Pill */}
              <div className="flex-shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  <span>Pending</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          to="/customer/bookings"
          className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md font-bold text-sm sm:text-base transition-all shadow-[0_0_20px_rgba(242,202,80,0.25)] hover:shadow-[0_0_28px_rgba(242,202,80,0.4)] flex items-center justify-center gap-2"
        >
          <Icon name="receipt_long" className="text-[18px]" />
          <span>View My Bookings</span>
        </Link>

        <Link
          to="/customer/services"
          className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface font-title-md font-semibold text-sm sm:text-base transition-colors border border-surface-container-highest/60 flex items-center justify-center gap-2"
        >
          <Icon name="explore" className="text-[18px]" />
          <span>Explore More Services</span>
        </Link>

        <button
          type="button"
          onClick={onReturnToPlan}
          className="w-full sm:w-auto px-4 py-3.5 rounded-xl text-xs sm:text-sm text-on-surface-variant hover:text-on-surface hover:underline transition-colors"
        >
          Return to Event Plan
        </button>
      </div>
    </div>
  );
};

export default BookingRequestConfirmation;
