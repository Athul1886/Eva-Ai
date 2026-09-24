import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { Provider } from '../../types/service';
import { formatIndianRupees } from '../../types/event';

interface ProviderCardProps {
  provider: Provider;
  isAdded: boolean;
  isAvailable?: boolean;
  eventDate?: string;
  onAddToEvent: (provider: Provider) => void;
}

export const ProviderCard: React.FC<ProviderCardProps> = ({
  provider,
  isAdded,
  isAvailable = true,
  eventDate,
  onAddToEvent,
}) => {
  return (
    <div className="group relative flex flex-col rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 hover:border-primary/50 transition-all duration-300 overflow-hidden shadow-xl hover:shadow-[0_12px_36px_rgba(0,0,0,0.6)] hover:-translate-y-1">
      {/* Provider Image Container */}
      <div className="relative h-52 sm:h-56 w-full overflow-hidden bg-surface-container">
        <img
          src={provider.images[0]}
          alt={provider.name}
          className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          loading="lazy"
        />

        {/* Ambient Dark Gradient Over Image */}
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high via-surface-container-high/20 to-transparent" />

        {/* Category Badge, Unavailable Badge & Location */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="px-3 py-1 rounded-full bg-surface-container-lowest/85 backdrop-blur-md text-primary font-bold text-[11px] uppercase tracking-wider border border-primary/20 shadow-md">
              {provider.category}
            </span>
            {!isAvailable && (
              <span className="px-2 py-0.5 rounded-full bg-error/90 text-on-error font-bold text-[10px] uppercase tracking-wider shadow-md flex items-center gap-1">
                <Icon name="event_busy" className="text-[12px]" />
                <span>Unavailable</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-lowest/85 backdrop-blur-md text-on-surface text-xs font-semibold border border-surface-container-highest/60 shadow-md">
            <Icon name="location_on" className="text-primary text-[14px]" />
            <span>{provider.location}</span>
          </div>
        </div>

        {/* Starting Price Overlay Pill at bottom-right of image */}
        <div className="absolute bottom-3 right-3 px-3 py-1 rounded-xl bg-surface-container-lowest/90 backdrop-blur-md border border-primary/30 shadow-lg text-right">
          <span className="text-[10px] text-on-surface-variant uppercase tracking-wider block font-medium">
            Starting from
          </span>
          <span className="text-sm font-bold text-primary">
            {formatIndianRupees(provider.startingPrice)}
          </span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2.5">
          {/* Rating, Reviews & Experience */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-primary">
              <Icon name="star" className="text-[16px] text-primary fill-current" />
              <span className="font-bold text-on-surface text-sm">{provider.rating.toFixed(1)}</span>
              <span className="text-on-surface-variant">({provider.reviewCount})</span>
            </div>

            <span className="text-on-surface-variant font-medium text-[11px] bg-surface-container px-2 py-0.5 rounded-md border border-surface-container-highest/50">
              {provider.yearsExperience} yrs exp
            </span>
          </div>

          {/* Business Name */}
          <Link
            to={`/customer/services/${provider.id}`}
            className="block group/title focus:outline-none"
          >
            <h3 className="font-title-lg text-lg font-semibold text-on-surface group-hover/title:text-primary transition-colors line-clamp-1">
              {provider.name}
            </h3>
          </Link>

          {/* Short Description */}
          <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">
            {provider.description}
          </p>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {provider.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-0.5 rounded-lg bg-surface-container text-on-surface-variant text-[11px] font-medium border border-surface-container-highest/40"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Card Footer Actions */}
        <div className="pt-3 border-t border-surface-container-highest/50 grid grid-cols-2 gap-2.5">
          <Link
            to={`/customer/services/${provider.id}`}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface text-xs font-semibold transition-colors border border-surface-container-highest/80 shadow-sm"
          >
            <span>View Details</span>
            <Icon name="arrow_forward" className="text-[14px]" />
          </Link>

          {!isAvailable ? (
            <button
              type="button"
              disabled={true}
              title="This provider is unavailable on your event date."
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold bg-surface-container text-on-surface-variant/50 border border-surface-container-highest/60 cursor-not-allowed shadow-none"
            >
              <Icon name="block" className="text-[14px]" />
              <span>Unavailable</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onAddToEvent(provider)}
              disabled={isAdded}
              className={`w-full inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isAdded
                  ? 'bg-secondary-container/50 text-secondary border border-secondary-container/60 cursor-default shadow-sm'
                  : 'bg-primary hover:bg-tertiary text-on-primary shadow-[0_0_15px_rgba(242,202,80,0.2)] hover:shadow-[0_0_22px_rgba(242,202,80,0.35)] active:scale-[0.98]'
              }`}
            >
              {isAdded ? (
                <>
                  <Icon name="check" className="text-[15px]" />
                  <span>Added ✓</span>
                </>
              ) : (
                <>
                  <Icon name="add" className="text-[15px]" />
                  <span>Add to Event</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProviderCard;
