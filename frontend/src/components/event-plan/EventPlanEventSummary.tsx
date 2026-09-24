import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { EventPlanData, formatIndianRupees } from '../../types/event';

interface EventPlanEventSummaryProps {
  eventPlan: EventPlanData | null;
}

export const EventPlanEventSummary: React.FC<EventPlanEventSummaryProps> = ({ eventPlan }) => {
  // Graceful date formatter
  const formatDate = (dateStr?: string) => {
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

  const dateDisplay = formatDate(eventPlan?.eventDate);

  const locationDisplay = eventPlan?.location && eventPlan.location.trim() !== ''
    ? eventPlan.location
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

  return (
    <div className="rounded-3xl bg-surface-container-high/70 backdrop-blur-xl border border-surface-container-highest/70 p-6 sm:p-7 shadow-xl relative overflow-hidden group">
      {/* Subtle top gold accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 via-primary to-primary/20 opacity-80" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left: Summary Title and Key Meta Grid */}
        <div className="space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider">
              <Icon name="event" className="text-[16px]" />
              <span>Event Details</span>
            </div>

            <Link
              to="/onboarding/event"
              className="inline-flex items-center gap-1 text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors py-1 px-2.5 rounded-lg hover:bg-surface-container"
              title="Edit event specifications"
            >
              <Icon name="edit" className="text-[14px]" />
              <span>Edit Details</span>
            </Link>
          </div>

          {/* Key metrics grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* 1. Event Type */}
            <div className="p-3.5 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 space-y-1">
              <span className="text-[11px] text-on-surface-variant uppercase tracking-wider block font-medium">
                Event Type
              </span>
              <p className="font-title-md text-sm sm:text-base font-bold text-on-surface truncate">
                {eventTypeDisplay}
              </p>
            </div>

            {/* 2. Date */}
            <div className="p-3.5 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 space-y-1">
              <span className="text-[11px] text-on-surface-variant uppercase tracking-wider block font-medium">
                Date
              </span>
              <p className="font-title-md text-sm sm:text-base font-bold text-on-surface truncate">
                {dateDisplay}
              </p>
            </div>

            {/* 3. Location */}
            <div className="p-3.5 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 space-y-1">
              <span className="text-[11px] text-on-surface-variant uppercase tracking-wider block font-medium">
                Location
              </span>
              <p className="font-title-md text-sm sm:text-base font-bold text-on-surface truncate">
                {locationDisplay}
              </p>
            </div>

            {/* 4. Guest Count */}
            <div className="p-3.5 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 space-y-1">
              <span className="text-[11px] text-on-surface-variant uppercase tracking-wider block font-medium">
                Guest Count
              </span>
              <p className="font-title-md text-sm sm:text-base font-bold text-on-surface truncate">
                {guestCountDisplay}
              </p>
            </div>

            {/* 5. Total Budget */}
            <div className="p-3.5 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 space-y-1 col-span-2 sm:col-span-1">
              <span className="text-[11px] text-on-surface-variant uppercase tracking-wider block font-medium">
                Total Budget
              </span>
              <p className="font-title-md text-sm sm:text-base font-bold text-primary truncate">
                {budgetDisplay}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventPlanEventSummary;
