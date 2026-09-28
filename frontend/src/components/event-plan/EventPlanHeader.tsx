import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';

interface EventPlanHeaderProps {
  selectedCount: number;
}

export const EventPlanHeader: React.FC<EventPlanHeaderProps> = ({ selectedCount }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-surface-container-highest/60">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-bold uppercase tracking-wider">
          <Icon name="event_note" className="text-[15px]" />
          <span>Customer Portal &bull; Event Blueprint</span>
          {selectedCount > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-semibold border border-primary/30">
              {selectedCount} {selectedCount === 1 ? 'Service Selected' : 'Services Selected'}
            </span>
          )}
        </div>

        <h1 className="font-headline-lg text-3xl sm:text-4xl md:text-5xl font-semibold text-on-surface tracking-tight">
          My Event Plan
        </h1>

        <p className="font-body-lg text-sm sm:text-base text-on-surface-variant max-w-2xl leading-relaxed">
          Everything you&apos;ve selected for your event, in one place. Review your chosen professionals, analyze budget allocation, and submit booking requests when you&apos;re ready.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Link
          to="/customer/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface text-xs sm:text-sm font-semibold transition-colors border border-surface-container-highest/60"
        >
          <Icon name="dashboard" className="text-[18px] text-on-surface-variant" />
          <span>Back to Dashboard</span>
        </Link>

        <Link
          to="/customer/bookings"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface text-xs sm:text-sm font-semibold transition-colors border border-surface-container-highest/60 hover:border-primary/40"
        >
          <Icon name="receipt_long" className="text-[18px] text-primary" />
          <span>My Bookings</span>
        </Link>

        <Link
          to="/customer/services"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/15 hover:bg-primary/25 text-primary text-xs sm:text-sm font-semibold transition-all border border-primary/30"
        >
          <Icon name="explore" className="text-[18px]" />
          <span>Continue Exploring</span>
        </Link>
      </div>
    </div>
  );
};

export default EventPlanHeader;
