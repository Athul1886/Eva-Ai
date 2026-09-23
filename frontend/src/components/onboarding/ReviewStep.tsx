import React from 'react';
import Icon from '../common/Icon';
import { EventPlanData, formatIndianRupees } from '../../types/event';

interface ReviewStepProps {
  eventData: EventPlanData;
  onEditStep: (stepNumber: number) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export const ReviewStep: React.FC<ReviewStepProps> = ({
  eventData,
  onEditStep,
  onBack,
  onSubmit,
  isSubmitting = false,
}) => {
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return 'Not set';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Step Header */}
      <div className="text-center space-y-2">
        <span className="font-label-sm uppercase tracking-widest text-primary font-bold">
          Step 06 &bull; Final Verification
        </span>
        <h2 className="font-headline-lg text-2xl sm:text-3xl text-on-surface font-semibold tracking-tight">
          Review your event plan
        </h2>
        <p className="font-body-md text-on-surface-variant max-w-md mx-auto text-sm sm:text-base">
          Please confirm your event blueprint below. You can jump directly into any section to make updates.
        </p>
      </div>

      <div className="space-y-4 max-w-2xl mx-auto">
        {/* Card 1: Event Type & Timeline */}
        <div className="p-5 sm:p-6 rounded-2xl bg-surface-container-high/70 border border-surface-container-highest/80 backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-surface-container-highest/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <Icon name="event" className="text-[18px]" />
              </div>
              <h3 className="font-title-md text-base font-semibold text-on-surface">
                Event & Timeline
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onEditStep(1)}
              className="text-xs font-semibold text-primary hover:text-tertiary flex items-center gap-1 transition-colors"
            >
              <Icon name="edit" className="text-[14px]" />
              <span>Edit</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-on-surface-variant text-xs uppercase tracking-wider block">
                Event Type
              </span>
              <span className="text-on-surface font-semibold text-base mt-0.5 block">
                {eventData.eventType || 'Not selected'}
              </span>
            </div>
            <div>
              <span className="text-on-surface-variant text-xs uppercase tracking-wider block">
                Event Date
              </span>
              <span className="text-on-surface font-semibold mt-0.5 block">
                {formatDateDisplay(eventData.eventDate)}
              </span>
            </div>
            <div className="sm:col-span-2">
              <span className="text-on-surface-variant text-xs uppercase tracking-wider block">
                Location
              </span>
              <span className="text-on-surface font-semibold mt-0.5 flex items-center gap-1.5">
                <Icon name="location_on" className="text-[16px] text-primary" />
                {eventData.location || 'Not specified'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Scale & Budget */}
        <div className="p-5 sm:p-6 rounded-2xl bg-surface-container-high/70 border border-surface-container-highest/80 backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-surface-container-highest/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <Icon name="payments" className="text-[18px]" />
              </div>
              <h3 className="font-title-md text-base font-semibold text-on-surface">
                Scale & Financials
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onEditStep(3)}
              className="text-xs font-semibold text-primary hover:text-tertiary flex items-center gap-1 transition-colors"
            >
              <Icon name="edit" className="text-[14px]" />
              <span>Edit</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-on-surface-variant text-xs uppercase tracking-wider block">
                Expected Guests
              </span>
              <span className="text-on-surface font-semibold text-base mt-0.5 flex items-center gap-1.5">
                <Icon name="groups" className="text-[18px] text-primary" />
                {eventData.guestCount ? `${eventData.guestCount} guests` : 'Not specified'}
              </span>
            </div>
            <div>
              <span className="text-on-surface-variant text-xs uppercase tracking-wider block">
                Estimated Budget
              </span>
              <span className="text-primary font-bold text-lg mt-0.5 block">
                {eventData.budget ? formatIndianRupees(eventData.budget) : 'Not specified'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Required Services */}
        <div className="p-5 sm:p-6 rounded-2xl bg-surface-container-high/70 border border-surface-container-highest/80 backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-surface-container-highest/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <Icon name="design_services" className="text-[18px]" />
              </div>
              <h3 className="font-title-md text-base font-semibold text-on-surface">
                Requested Services ({eventData.services.length})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onEditStep(4)}
              className="text-xs font-semibold text-primary hover:text-tertiary flex items-center gap-1 transition-colors"
            >
              <Icon name="edit" className="text-[14px]" />
              <span>Edit</span>
            </button>
          </div>

          {eventData.services.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {eventData.services.map((srv) => (
                <span
                  key={srv}
                  className="px-3 py-1.5 rounded-xl bg-surface-container text-on-surface text-xs font-medium border border-surface-container-highest/60 flex items-center gap-1.5"
                >
                  <Icon name="check_circle" className="text-[14px] text-primary" />
                  {srv}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-error text-sm font-medium">No services selected.</span>
          )}
        </div>

        {/* Card 4: Aesthetic & Notes */}
        <div className="p-5 sm:p-6 rounded-2xl bg-surface-container-high/70 border border-surface-container-highest/80 backdrop-blur-md">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-surface-container-highest/60">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
                <Icon name="auto_awesome" className="text-[18px]" />
              </div>
              <h3 className="font-title-md text-base font-semibold text-on-surface">
                Aesthetics & Additional Notes
              </h3>
            </div>
            <button
              type="button"
              onClick={() => onEditStep(5)}
              className="text-xs font-semibold text-primary hover:text-tertiary flex items-center gap-1 transition-colors"
            >
              <Icon name="edit" className="text-[14px]" />
              <span>Edit</span>
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <span className="text-on-surface-variant text-xs uppercase tracking-wider block mb-1.5">
                Style Preferences
              </span>
              {eventData.preferences.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {eventData.preferences.map((p) => (
                    <span
                      key={p}
                      className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold border border-primary/30"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-on-surface-variant/70 text-xs italic">
                  No specific style preference chosen
                </span>
              )}
            </div>

            {eventData.additionalNotes && (
              <div className="pt-2 border-t border-surface-container-highest/40">
                <span className="text-on-surface-variant text-xs uppercase tracking-wider block mb-1">
                  Additional Notes
                </span>
                <p className="text-on-surface bg-surface-container-low p-3 rounded-xl text-xs sm:text-sm whitespace-pre-wrap leading-relaxed border border-surface-container-highest/50">
                  {eventData.additionalNotes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 flex items-center justify-between gap-4 max-w-2xl mx-auto">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3.5 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface font-title-md font-medium transition-colors border border-surface-container-highest/60 flex items-center gap-2"
        >
          <Icon name="arrow_back" className="text-[18px]" />
          <span>Back</span>
        </button>

        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="px-9 py-4 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md font-bold transition-all shadow-[0_0_24px_rgba(242,202,80,0.3)] hover:shadow-[0_0_34px_rgba(242,202,80,0.5)] flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Create Event Plan</span>
          <Icon name="sparkles" className="text-[20px]" />
        </button>
      </div>
    </div>
  );
};

export default ReviewStep;
