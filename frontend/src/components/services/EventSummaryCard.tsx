import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { EventPlanData, formatIndianRupees } from '../../types/event';

interface EventSummaryCardProps {
  eventPlan: EventPlanData | null;
  onBuildEventPlan?: () => void;
}

export const EventSummaryCard: React.FC<EventSummaryCardProps> = ({ eventPlan, onBuildEventPlan }) => {
  // If no active event or event has no valid ID/type, render clean empty state
  if (!eventPlan || (!eventPlan.id && !eventPlan.eventType)) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface-container-high/80 via-surface-container/70 to-surface-container-high/80 backdrop-blur-xl border border-surface-container-highest/70 p-5 md:p-6 shadow-xl">
        <div className="absolute -top-16 -right-16 w-60 h-60 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-60 h-60 bg-secondary-container/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container border border-surface-container-highest text-on-surface-variant text-xs font-bold uppercase tracking-wider">
                <Icon name="event_busy" className="text-[14px]" />
                <span>No Active Event Plan</span>
              </span>
            </div>
            <h3 className="font-headline-sm text-lg sm:text-xl font-bold text-on-surface">
              Start Planning Your Next Celebration
            </h3>
            <p className="font-body-md text-xs sm:text-sm text-on-surface-variant leading-relaxed">
              Create an event plan to get personalized service recommendations and build your event blueprint with verified providers.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center shrink-0">
            <Link
              to="/onboarding/event"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-tertiary text-on-primary text-xs sm:text-sm font-bold transition-all shadow-[0_0_20px_rgba(242,202,80,0.25)]"
            >
              <Icon name="add_circle" className="text-[18px]" />
              <span>Plan Your Event</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Real backend event data formatting (no fake fallback values)
  const eventType = eventPlan.eventType
    ? eventPlan.eventType.charAt(0).toUpperCase() + eventPlan.eventType.slice(1)
    : 'Event';
  const location = eventPlan.location ? eventPlan.location : 'Location not set';
  const guestCount =
    eventPlan.guestCount !== undefined &&
    eventPlan.guestCount !== null &&
    eventPlan.guestCount !== '' &&
    Number(eventPlan.guestCount) > 0
      ? `${eventPlan.guestCount} Guests`
      : 'Guests not set';
  const budgetFormatted =
    eventPlan.budget !== undefined &&
    eventPlan.budget !== null &&
    eventPlan.budget !== '' &&
    Number(eventPlan.budget) > 0
      ? formatIndianRupees(eventPlan.budget)
      : 'Budget not set';

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr || dateStr.trim() === '') return 'Date not set';
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

  const formattedDate = formatDateDisplay(eventPlan.eventDate);

  const handleBuildPlanClick = () => {
    console.log('[EventSummaryCard] handleBuildPlanClick triggered');
    if (onBuildEventPlan) {
      onBuildEventPlan();
    } else {
      window.dispatchEvent(new CustomEvent('eva_ai_trigger_build_plan'));
    }
  };

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

            {eventPlan.createdAt && (
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

        {/* Right Side: Quick Action to Build Plan, Edit or Dashboard */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
          <button
            type="button"
            onClick={handleBuildPlanClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-primary via-tertiary to-primary hover:brightness-110 text-on-primary text-xs md:text-sm font-bold transition-all shadow-[0_0_20px_rgba(242,202,80,0.35)] hover:scale-105 active:scale-95 cursor-pointer"
            title="Automatically generate recommended service plan from complete Event Blueprint"
          >
            <Icon name="auto_awesome" className="text-[16px]" />
            <span>✨ Build My Event Plan</span>
          </button>

          <Link
            to="/onboarding/event"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs md:text-sm font-semibold transition-colors border border-primary/25"
            title="Edit event details in wizard"
          >
            <Icon name="edit" className="text-[15px]" />
            <span>Edit Plan</span>
          </Link>

          <Link
            to="/customer/dashboard"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface hover:text-primary text-xs md:text-sm font-semibold transition-colors border border-surface-container-highest/80 shadow-sm"
          >
            <Icon name="dashboard" className="text-[16px]" />
            <span>Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EventSummaryCard;
