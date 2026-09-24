import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { SelectedServiceItem } from '../../types/service';
import { MOCK_PROVIDERS } from '../../data/mockProviders';
import { formatIndianRupees } from '../../types/event';

interface SelectedServiceCardProps {
  service: SelectedServiceItem;
  hasActiveBooking?: boolean;
  activeBookingStatus?: string;
  onRemove: (providerId: string) => void;
}

export const SelectedServiceCard: React.FC<SelectedServiceCardProps> = ({
  service,
  hasActiveBooking = false,
  activeBookingStatus,
  onRemove,
}) => {
  // Enrich from mock provider data if available
  const provider = MOCK_PROVIDERS.find((p) => p.id === service.providerId);

  const displayName = provider?.name || service.providerName;
  const displayCategory = provider?.category || service.category;
  const displayLocation = provider?.location || service.location;
  const displayPrice = provider?.startingPrice || service.startingPrice;
  const displayImage = provider?.images?.[0] || service.imageUrl || 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80';
  const displayDescription = provider?.description || 'Verified luxury event service partner for your celebration.';
  const displayRating = provider?.rating;
  const displayReviewCount = provider?.reviewCount;

  return (
    <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 hover:border-primary/40 transition-all duration-300 p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row gap-5 items-start sm:items-center justify-between group">
      {/* Left: Image & Details */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5 flex-1 w-full">
        {/* Thumbnail Image */}
        <div className="relative w-full sm:w-28 sm:h-28 h-40 rounded-2xl overflow-hidden bg-surface-container flex-shrink-0 border border-surface-container-highest/50">
          <img
            src={displayImage}
            alt={displayName}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high/80 via-transparent to-transparent sm:hidden" />
        </div>

        {/* Info Column */}
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {displayCategory}
            </span>

            <span className="text-xs text-on-surface-variant flex items-center gap-0.5">
              <Icon name="location_on" className="text-primary text-[14px]" />
              <span>{displayLocation}</span>
            </span>

            {hasActiveBooking && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <Icon name="schedule" className="text-[12px]" />
                <span>Request {activeBookingStatus === 'ACCEPTED' ? 'Accepted' : 'Pending'}</span>
              </span>
            )}
          </div>

          <div>
            <h3 className="font-headline-sm text-lg sm:text-xl font-bold text-on-surface group-hover:text-primary transition-colors truncate">
              {displayName}
            </h3>

            {displayRating && (
              <div className="flex items-center gap-1.5 text-xs text-on-surface-variant mt-0.5">
                <div className="flex items-center text-primary font-bold">
                  <Icon name="star" className="text-[14px] fill-current" />
                  <span className="ml-1">{displayRating}</span>
                </div>
                {displayReviewCount && (
                  <span>({displayReviewCount} reviews)</span>
                )}
              </div>
            )}
          </div>

          <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed max-w-xl">
            {displayDescription}
          </p>

          <div className="pt-1 flex items-baseline gap-1.5">
            <span className="text-[11px] text-on-surface-variant uppercase tracking-wider">
              Starting Price:
            </span>
            <span className="text-base sm:text-lg font-bold text-primary">
              {formatIndianRupees(displayPrice)}
            </span>
          </div>
        </div>
      </div>

      {/* Right / Bottom Action Buttons */}
      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2.5 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-surface-container-highest/40 flex-shrink-0">
        <Link
          to={`/customer/services/${service.providerId}`}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface text-xs sm:text-sm font-semibold transition-colors border border-surface-container-highest/60 w-full sm:w-36 text-center"
        >
          <Icon name="visibility" className="text-[16px] text-primary" />
          <span>View Details</span>
        </Link>

        <button
          type="button"
          onClick={() => onRemove(service.providerId)}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-surface-container hover:bg-error/15 text-on-surface-variant hover:text-error text-xs sm:text-sm font-semibold transition-colors border border-surface-container-highest/60 hover:border-error/30 w-full sm:w-36 text-center"
        >
          <Icon name="delete_outline" className="text-[16px]" />
          <span>Remove</span>
        </button>
      </div>
    </div>
  );
};

export default SelectedServiceCard;
