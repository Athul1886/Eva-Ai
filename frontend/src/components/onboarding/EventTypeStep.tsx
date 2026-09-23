import React from 'react';
import Icon from '../common/Icon';
import { EVENT_TYPES } from '../../types/event';

interface EventTypeStepProps {
  selectedType: string;
  onSelectType: (type: string) => void;
  onContinue: () => void;
  error?: string;
}

export const EventTypeStep: React.FC<EventTypeStepProps> = ({
  selectedType,
  onSelectType,
  onContinue,
  error,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onContinue();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fadeIn">
      {/* Step Header */}
      <div className="text-center space-y-2">
        <span className="font-label-sm uppercase tracking-widest text-primary font-bold">
          Step 01 &bull; Event Category
        </span>
        <h2 className="font-headline-lg text-2xl sm:text-3xl text-on-surface font-semibold tracking-tight">
          What are you planning?
        </h2>
        <p className="font-body-md text-on-surface-variant max-w-md mx-auto text-sm sm:text-base">
          Select the type of celebration or gathering so we can tailor the ideal planning blueprint.
        </p>
      </div>

      {/* Error notification if triggered */}
      {error && (
        <div className="p-3.5 rounded-xl bg-error-container/40 border border-error/50 text-error flex items-center gap-2.5 text-sm animate-shake">
          <Icon name="error" className="text-[20px] text-error flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid of Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {EVENT_TYPES.map((type) => {
          const isSelected = selectedType === type.label;

          return (
            <button
              key={type.id}
              type="button"
              onClick={() => onSelectType(type.label)}
              className={`group text-left p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between relative overflow-hidden ${
                isSelected
                  ? 'bg-surface-container-high/90 border-primary ring-2 ring-primary/30 shadow-[0_0_24px_rgba(242,202,80,0.2)]'
                  : 'bg-surface-container/60 hover:bg-surface-container-high/70 border-surface-container-highest/60 hover:border-outline-variant/80'
              }`}
            >
              {/* Subtle top indicator highlight */}
              {isSelected && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-tertiary" />
              )}

              <div className="flex items-start justify-between mb-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-primary text-on-primary shadow-[0_0_15px_rgba(242,202,80,0.4)]'
                      : 'bg-surface-container-highest/70 text-on-surface-variant group-hover:text-primary group-hover:bg-primary/10'
                  }`}
                >
                  <Icon name={type.icon} className="text-[22px]" />
                </div>

                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                    isSelected
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-surface-container-highest bg-surface-container-low'
                  }`}
                >
                  {isSelected && <Icon name="check" className="text-[14px]" />}
                </div>
              </div>

              <div>
                <h3
                  className={`font-title-md text-base font-semibold mb-1 transition-colors ${
                    isSelected ? 'text-primary' : 'text-on-surface group-hover:text-primary'
                  }`}
                >
                  {type.label}
                </h3>
                <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2">
                  {type.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="pt-4 flex justify-end">
        <button
          type="submit"
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md font-bold transition-all shadow-[0_0_20px_rgba(242,202,80,0.25)] hover:shadow-[0_0_28px_rgba(242,202,80,0.4)] flex items-center justify-center gap-2"
        >
          <span>Continue</span>
          <Icon name="arrow_forward" className="text-[18px]" />
        </button>
      </div>
    </form>
  );
};

export default EventTypeStep;
