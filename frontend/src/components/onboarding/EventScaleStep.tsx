import React from 'react';
import Icon from '../common/Icon';
import { formatIndianRupees, parseCleanNumber } from '../../types/event';

interface EventScaleStepProps {
  guestCount: number | '';
  budget: number | '';
  onChangeGuestCount: (count: number | '') => void;
  onChangeBudget: (budget: number | '') => void;
  onBack: () => void;
  onContinue: () => void;
  errors: {
    guestCount?: string;
    budget?: string;
  };
}

const GUEST_PRESETS = [50, 100, 250, 500, 1000];
const BUDGET_PRESETS = [
  { label: '₹2 Lakh', value: 200000 },
  { label: '₹5 Lakh', value: 500000 },
  { label: '₹10 Lakh', value: 1000000 },
  { label: '₹25 Lakh', value: 2500000 },
  { label: '₹50 Lakh', value: 5000000 },
];

export const EventScaleStep: React.FC<EventScaleStepProps> = ({
  guestCount,
  budget,
  onChangeGuestCount,
  onChangeBudget,
  onBack,
  onContinue,
  errors,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onContinue();
  };

  const handleGuestInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseCleanNumber(e.target.value);
    onChangeGuestCount(parsed);
  };

  const handleBudgetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseCleanNumber(e.target.value);
    onChangeBudget(parsed);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fadeIn">
      {/* Step Header */}
      <div className="text-center space-y-2">
        <span className="font-label-sm uppercase tracking-widest text-primary font-bold">
          Step 03 &bull; Scale & Capacity
        </span>
        <h2 className="font-headline-lg text-2xl sm:text-3xl text-on-surface font-semibold tracking-tight">
          Tell us about the scale of your event
        </h2>
        <p className="font-body-md text-on-surface-variant max-w-md mx-auto text-sm sm:text-base">
          Estimating your attendee numbers and financial scope ensures venue fit and accurate service tiers.
        </p>
      </div>

      <div className="space-y-7 max-w-lg mx-auto">
        {/* Expected Guest Count */}
        <div>
          <label
            htmlFor="guestCount"
            className="block font-label-md text-label-md text-outline uppercase mb-2"
          >
            Expected Guest Count <span className="text-primary">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
              <Icon name="groups" className="text-[20px]" />
            </div>
            <input
              id="guestCount"
              type="text"
              inputMode="numeric"
              name="guestCount"
              value={guestCount === '' ? '' : guestCount}
              onChange={handleGuestInputChange}
              placeholder="e.g. 250"
              className={`w-full h-13 pl-11 pr-4 rounded-xl bg-surface-container text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-primary border transition-colors ${
                errors.guestCount ? 'border-error ring-1 ring-error/50' : 'border-surface-container-highest/60 focus:border-primary'
              }`}
            />
          </div>
          {errors.guestCount ? (
            <span className="text-error font-body-sm text-xs mt-1.5 flex items-center gap-1">
              <Icon name="error" className="text-[14px]" />
              {errors.guestCount}
            </span>
          ) : (
            <span className="text-on-surface-variant/70 font-body-sm text-xs mt-1 block">
              Estimated total attendees including hosts & VIPs.
            </span>
          )}

          {/* Quick guest count presets */}
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <span className="text-xs text-on-surface-variant/80 font-medium">Quick select:</span>
            {GUEST_PRESETS.map((count) => (
              <button
                key={count}
                type="button"
                onClick={() => onChangeGuestCount(count)}
                className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                  guestCount === count
                    ? 'bg-primary/20 text-primary border-primary/60 font-semibold'
                    : 'bg-surface-container-high/80 text-on-surface-variant hover:text-on-surface hover:bg-surface-bright border-surface-container-highest/50'
                }`}
              >
                {count} guests
              </button>
            ))}
          </div>
        </div>

        {/* Estimated Budget with Indian Rupee formatting */}
        <div>
          <label
            htmlFor="budget"
            className="block font-label-md text-label-md text-outline uppercase mb-2"
          >
            Estimated Budget (INR) <span className="text-primary">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-primary font-bold text-lg">
              ₹
            </div>
            <input
              id="budget"
              type="text"
              inputMode="numeric"
              name="budget"
              value={budget === '' ? '' : budget}
              onChange={handleBudgetInputChange}
              placeholder="e.g. 500000"
              className={`w-full h-13 pl-10 pr-4 rounded-xl bg-surface-container text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-primary border transition-colors ${
                errors.budget ? 'border-error ring-1 ring-error/50' : 'border-surface-container-highest/60 focus:border-primary'
              }`}
            />
          </div>

          {/* Live formatted currency badge */}
          {budget !== '' && typeof budget === 'number' && budget > 0 && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 border border-primary/30 text-primary text-xs font-semibold">
              <Icon name="payments" className="text-[16px]" />
              <span>Formatted: {formatIndianRupees(budget)}</span>
            </div>
          )}

          {errors.budget ? (
            <span className="text-error font-body-sm text-xs mt-1.5 flex items-center gap-1">
              <Icon name="error" className="text-[14px]" />
              {errors.budget}
            </span>
          ) : (
            <span className="text-on-surface-variant/70 font-body-sm text-xs mt-1 block">
              Enter your targeted aggregate expenditure in Indian Rupees.
            </span>
          )}

          {/* Quick budget presets */}
          <div className="flex flex-wrap items-center gap-2 mt-2.5">
            <span className="text-xs text-on-surface-variant/80 font-medium">Presets:</span>
            {BUDGET_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => onChangeBudget(preset.value)}
                className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                  budget === preset.value
                    ? 'bg-primary/20 text-primary border-primary/60 font-semibold'
                    : 'bg-surface-container-high/80 text-on-surface-variant hover:text-on-surface hover:bg-surface-bright border-surface-container-highest/50'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="pt-4 flex items-center justify-between gap-4 max-w-lg mx-auto">
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-3.5 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface font-title-md font-medium transition-colors border border-surface-container-highest/60 flex items-center gap-2"
        >
          <Icon name="arrow_back" className="text-[18px]" />
          <span>Back</span>
        </button>

        <button
          type="submit"
          className="px-8 py-3.5 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md font-bold transition-all shadow-[0_0_20px_rgba(242,202,80,0.25)] hover:shadow-[0_0_28px_rgba(242,202,80,0.4)] flex items-center justify-center gap-2"
        >
          <span>Continue</span>
          <Icon name="arrow_forward" className="text-[18px]" />
        </button>
      </div>
    </form>
  );
};

export default EventScaleStep;
