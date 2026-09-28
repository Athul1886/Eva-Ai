import React from 'react';
import Icon from '../common/Icon';
import { AVAILABLE_SERVICES } from '../../types/event';

interface ServicesStepProps {
  selectedServices: string[];
  onToggleService: (serviceLabel: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
  onBack: () => void;
  onContinue: () => void;
  error?: string;
}

export const ServicesStep: React.FC<ServicesStepProps> = ({
  selectedServices,
  onToggleService,
  onSelectAll,
  onClearAll,
  onBack,
  onContinue,
  error,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onContinue();
  };

  const isAllSelected = selectedServices.length === AVAILABLE_SERVICES.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fadeIn">
      {/* Step Header */}
      <div className="text-center space-y-2">
        <span className="font-label-sm uppercase tracking-widest text-primary font-bold">
          Step 04 &bull; Service Requirements
        </span>
        <h2 className="font-headline-lg text-2xl sm:text-3xl text-on-surface font-semibold tracking-tight">
          What services do you need?
        </h2>
        <p className="font-body-md text-on-surface-variant max-w-md mx-auto text-sm sm:text-base">
          Select one or multiple vendor categories required for your event. You can refine specific packages later.
        </p>
      </div>

      {/* Error notification if triggered */}
      {error && (
        <div className="p-3.5 rounded-xl bg-error-container/40 border border-error/50 text-error flex items-center gap-2.5 text-sm animate-shake max-w-2xl mx-auto">
          <Icon name="error" className="text-[20px] text-error flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Select All / Clear Quick Actions */}
      <div className="flex items-center justify-between max-w-3xl mx-auto px-1">
        <span className="text-xs text-on-surface-variant">
          Selected: <strong className="text-primary">{selectedServices.length}</strong> of {AVAILABLE_SERVICES.length}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={isAllSelected ? onClearAll : onSelectAll}
            className="text-xs font-semibold text-primary hover:underline transition-colors"
          >
            {isAllSelected ? 'Deselect All' : 'Select All'}
          </button>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-w-3xl mx-auto">
        {AVAILABLE_SERVICES.map((srv) => {
          const isChecked = selectedServices.includes(srv.label);

          return (
            <button
              key={srv.id}
              type="button"
              onClick={() => onToggleService(srv.label)}
              className={`group text-left p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between relative overflow-hidden ${
                isChecked
                  ? 'bg-surface-container-high/90 border-primary ring-2 ring-primary/30 shadow-[0_0_24px_rgba(242,202,80,0.18)]'
                  : 'bg-surface-container/60 hover:bg-surface-container-high/70 border-surface-container-highest/60 hover:border-outline-variant/80'
              }`}
            >
              {/* Highlight top bar when selected */}
              {isChecked && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-tertiary" />
              )}

              <div className="flex items-start justify-between mb-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                    isChecked
                      ? 'bg-primary text-on-primary shadow-[0_0_15px_rgba(242,202,80,0.35)]'
                      : 'bg-surface-container-highest/70 text-on-surface-variant group-hover:text-primary group-hover:bg-primary/10'
                  }`}
                >
                  <Icon name={srv.icon} className="text-[22px]" />
                </div>

                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                    isChecked
                      ? 'border-primary bg-primary text-on-primary'
                      : 'border-surface-container-highest bg-surface-container-low'
                  }`}
                >
                  {isChecked && <Icon name="check" className="text-[14px]" />}
                </div>
              </div>

              <div>
                <h3
                  className={`font-title-md text-base font-semibold mb-1 transition-colors ${
                    isChecked ? 'text-primary' : 'text-on-surface group-hover:text-primary'
                  }`}
                >
                  {srv.label}
                </h3>
                <p className="font-body-sm text-xs text-on-surface-variant line-clamp-2">
                  {srv.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="pt-4 flex items-center justify-between gap-4 max-w-3xl mx-auto">
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

export default ServicesStep;
