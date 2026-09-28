import React from 'react';
import Icon from '../common/Icon';
import { STYLE_PREFERENCES } from '../../types/event';

interface PreferencesStepProps {
  preferences: string[];
  additionalNotes: string;
  onTogglePreference: (prefLabel: string) => void;
  onChangeNotes: (notes: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export const PreferencesStep: React.FC<PreferencesStepProps> = ({
  preferences,
  additionalNotes,
  onTogglePreference,
  onChangeNotes,
  onBack,
  onContinue,
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
          Step 05 &bull; Aesthetic & Special Notes
        </span>
        <h2 className="font-headline-lg text-2xl sm:text-3xl text-on-surface font-semibold tracking-tight">
          What style are you looking for?
        </h2>
        <p className="font-body-md text-on-surface-variant max-w-md mx-auto text-sm sm:text-base">
          Choose the design language that best matches your vision, and tell us any special requests.
        </p>
      </div>

      <div className="space-y-8 max-w-2xl mx-auto">
        {/* Style Preferences Section */}
        <div>
          <label className="block font-label-md text-label-md text-outline uppercase mb-3">
            Atmosphere & Style (Choose one or multiple)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {STYLE_PREFERENCES.map((pref) => {
              const isSelected = preferences.includes(pref.label);

              return (
                <button
                  key={pref.id}
                  type="button"
                  onClick={() => onTogglePreference(pref.label)}
                  className={`p-3.5 sm:p-4 rounded-xl border text-left flex flex-col justify-between transition-all duration-200 relative ${
                    isSelected
                      ? 'bg-surface-container-high border-primary ring-1 ring-primary/40 shadow-[0_0_20px_rgba(242,202,80,0.18)]'
                      : 'bg-surface-container/60 hover:bg-surface-container-high/60 border-surface-container-highest/60 hover:border-outline-variant/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container-highest text-on-surface-variant'
                      }`}
                    >
                      <Icon name={pref.icon} className="text-[18px]" />
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center text-[12px]">
                        <Icon name="check" className="text-[12px]" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h4
                      className={`font-title-md text-sm font-semibold transition-colors ${
                        isSelected ? 'text-primary' : 'text-on-surface'
                      }`}
                    >
                      {pref.label}
                    </h4>
                    <p className="font-body-sm text-[11px] text-on-surface-variant mt-0.5 line-clamp-2">
                      {pref.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Additional Notes Field */}
        <div>
          <label
            htmlFor="additionalNotes"
            className="block font-label-md text-label-md text-outline uppercase mb-2"
          >
            Anything else you'd like us to know?
          </label>
          <textarea
            id="additionalNotes"
            rows={4}
            value={additionalNotes}
            onChange={(e) => onChangeNotes(e.target.value)}
            placeholder="Tell us about specific themes, cultural traditions, dietary restrictions, preferred colors, or musical choices..."
            className="w-full p-4 rounded-xl bg-surface-container text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-primary border border-surface-container-highest/60 focus:border-primary transition-colors resize-none placeholder:text-on-surface-variant/50"
          />
          <span className="text-on-surface-variant/70 font-body-sm text-xs mt-1 block">
            Optional &bull; Add any unique preferences to guide provider proposals.
          </span>
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

export default PreferencesStep;
