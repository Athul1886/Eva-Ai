import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { EventPlanData, formatIndianRupees } from '../../types/event';

interface EventSummaryCardProps {
  eventPlan: EventPlanData | null;
}

export const EventSummaryCard: React.FC<EventSummaryCardProps> = ({ eventPlan }) => {
  // Graceful fallback values if not set
  const eventType = eventPlan?.eventType || 'Celebration';
  const location = eventPlan?.location || 'Palakkad, Kerala';
  const guestCount = eventPlan?.guestCount ? `${eventPlan.guestCount} Guests` : '250 Guests';
  const budgetFormatted = eventPlan?.budget
    ? formatIndianRupees(eventPlan.budget)
    : '₹3,00,000';

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return '25 December 2026';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formattedDate = formatDateDisplay(eventPlan?.eventDate);

  if (!eventPlan) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface-container-high/80 via-surface-container/70 to-surface-container-high/80 backdrop-blur-xl border border-surface-container-highest/70 p-5 md:p-6 shadow-xl">
        <div className="absolute -top-16 -right-16 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center shrink-0 border border-primary/30">
              <Icon name="event_note" className="text-[24px]" />
            </div>
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">
                No Event Blueprint Configured
              </span>
              <h3 className="font-title-md text-base sm:text-lg font-bold text-on-surface">
                Create an event plan to personalize your discovery
              </h3>
              <p className="text-xs text-on-surface-variant max-w-xl leading-relaxed">
                Setting your event date and location enables real-time provider availability checks and budget tracking.
              </p>
            </div>
          </div>

          <Link
            to="/onboarding/event"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-tertiary text-on-primary text-xs font-bold transition-all shadow-[0_0_15px_rgba(242,202,80,0.25)] shrink-0 self-start sm:self-auto"
          >
            <Icon name="add" className="text-[16px]" />
            <span>Create Event Plan</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface-container-high/80 via-surface-container/70 to-surface-container-high/80 backdrop-blur-xl border border-surface-container-highest/70 p-5 md:p-6 shadow-xl">
      {/* Decorative ambient radial light */}
      <div className="absolute -top-16 -right-16 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-60 h-60 bg-secondary-container/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        {/* Left Side: Event Details */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary text-xs font-bold uppercase tracking-wider">
              <Icon name="event" className="text-[14px]" />
              <span>{eventType} Blueprint</span>
            </span>

            {eventPlan?.createdAt && (
              <span className="text-[11px] text-on-surface-variant/80">
                Created {new Date(eventPlan.createdAt).toLocaleDateString()}
              </span>
            )}

            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container/30 border border-secondary-container/60 text-secondary text-[11px] font-semibold">
              <Icon name="auto_awesome" className="text-[12px]" />
              <span>Personalized Feed</span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm md:text-base text-on-surface font-medium pt-1">
            <div className="flex items-center gap-2 text-on-surface">
              <Icon name="calendar_today" className="text-primary text-[18px]" />
              <span>{formattedDate}</span>
            </div>

            <span className="hidden sm:inline text-surface-container-highest">&bull;</span>

            <div className="flex items-center gap-2 text-on-surface">
              <Icon name="location_on" className="text-primary text-[18px]" />
              <span>{location}</span>
            </div>

            <span className="hidden sm:inline text-surface-container-highest">&bull;</span>

            <div className="flex items-center gap-2 text-on-surface">
              <Icon name="groups" className="text-primary text-[18px]" />
              <span>{guestCount}</span>
            </div>

            <span className="hidden sm:inline text-surface-container-highest">&bull;</span>

            <div className="flex items-center gap-2 text-primary font-bold">
              <Icon name="payments" className="text-primary text-[18px]" />
              <span>Budget: {budgetFormatted}</span>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Action to Dashboard or Edit */}
        <div className="flex items-center gap-3 self-start lg:self-center">
          <Link
            to="/customer/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface hover:text-primary text-xs md:text-sm font-semibold transition-colors border border-surface-container-highest/80 shadow-sm"
          >
            <Icon name="dashboard" className="text-[16px]" />
            <span>Dashboard</span>
          </Link>

          <Link
            to="/onboarding/event"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs md:text-sm font-semibold transition-colors border border-primary/25"
            title="Edit event details in wizard"
          >
            <Icon name="edit" className="text-[15px]" />
            <span>Edit Plan</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EventSummaryCard;
