import React from 'react';
import Icon from '../common/Icon';

interface StepMeta {
  number: string;
  label: string;
}

const STEPS: StepMeta[] = [
  { number: '01', label: 'Event' },
  { number: '02', label: 'Details' },
  { number: '03', label: 'Scale' },
  { number: '04', label: 'Services' },
  { number: '05', label: 'Preferences' },
  { number: '06', label: 'Review' },
];

interface OnboardingProgressProps {
  currentStep: number; // 1 to 6
  onStepClick?: (stepNumber: number) => void;
  maxVisitedStep: number;
}

export const OnboardingProgress: React.FC<OnboardingProgressProps> = ({
  currentStep,
  onStepClick,
  maxVisitedStep,
}) => {
  return (
    <nav aria-label="Onboarding Progress" className="w-full">
      {/* Desktop & Tablet Progress Bar */}
      <div className="hidden sm:flex items-center justify-between relative">
        {/* Connecting Background Line */}
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-[2px] bg-surface-container-highest/60 -z-0" />
        
        {/* Active Progress Colored Line */}
        <div
          className="absolute top-1/2 left-0 -translate-y-1/2 h-[2px] bg-gradient-to-r from-primary to-tertiary transition-all duration-500 ease-out -z-0"
          style={{ width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%` }}
        />

        {STEPS.map((step, idx) => {
          const stepNum = idx + 1;
          const isCompleted = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          const isClickable = onStepClick && (stepNum <= maxVisitedStep || isCompleted);

          return (
            <button
              key={step.number}
              type="button"
              disabled={!isClickable}
              onClick={() => isClickable && onStepClick(stepNum)}
              className={`group relative z-10 flex flex-col items-center focus:outline-none transition-all ${
                isClickable ? 'cursor-pointer' : 'cursor-default'
              }`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {/* Step indicator circle / badge */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                  isCurrent
                    ? 'bg-primary text-on-primary ring-4 ring-primary/20 shadow-[0_0_20px_rgba(242,202,80,0.5)] scale-110'
                    : isCompleted
                    ? 'bg-surface-container-high text-primary border border-primary/50 group-hover:border-primary'
                    : 'bg-surface-container text-outline border border-surface-container-highest/50'
                }`}
              >
                {isCompleted ? (
                  <Icon name="check" className="text-[18px] text-primary" />
                ) : (
                  <span>{step.number}</span>
                )}
              </div>

              {/* Step label */}
              <span
                className={`mt-2 font-label-md text-xs tracking-wider uppercase transition-colors duration-200 ${
                  isCurrent
                    ? 'text-primary font-bold'
                    : isCompleted
                    ? 'text-on-surface group-hover:text-primary font-medium'
                    : 'text-outline/70'
                }`}
              >
                {step.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile Compact Progress Bar */}
      <div className="sm:hidden flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-primary font-bold text-sm tracking-wider">
              {STEPS[currentStep - 1].number}
            </span>
            <span className="text-on-surface font-semibold uppercase tracking-wider text-xs">
              {STEPS[currentStep - 1].label}
            </span>
          </div>
          <span className="text-on-surface-variant font-label-md text-[11px]">
            Step {currentStep} of {STEPS.length}
          </span>
        </div>

        {/* Multi-segment bar for mobile */}
        <div className="grid grid-cols-6 gap-1.5 w-full">
          {STEPS.map((_, idx) => {
            const stepNum = idx + 1;
            const isCompleted = stepNum < currentStep;
            const isCurrent = stepNum === currentStep;

            return (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isCurrent
                    ? 'bg-primary shadow-[0_0_10px_rgba(242,202,80,0.5)]'
                    : isCompleted
                    ? 'bg-primary/50'
                    : 'bg-surface-container-highest/60'
                }`}
              />
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default OnboardingProgress;
