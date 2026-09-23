import React from 'react';
import Icon from '../common/Icon';

interface EventDetailsStepProps {
  eventDate: string;
  location: string;
  onChangeDate: (date: string) => void;
  onChangeLocation: (location: string) => void;
  onBack: () => void;
  onContinue: () => void;
  errors: {
    eventDate?: string;
    location?: string;
  };
}

const POPULAR_LOCATIONS = [
  'Palakkad, Kerala',
  'Kochi, Kerala',
  'Bengaluru, Karnataka',
  'Kozhikode, Kerala',
  'Trivandrum, Kerala',
  'Coimbatore, Tamil Nadu',
];

export const EventDetailsStep: React.FC<EventDetailsStepProps> = ({
  eventDate,
  location,
  onChangeDate,
  onChangeLocation,
  onBack,
  onContinue,
  errors,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onContinue();
  };

  // Get tomorrow's date formatted as YYYY-MM-DD for min date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-8 animate-fadeIn">
      {/* Step Header */}
      <div className="text-center space-y-2">
        <span className="font-label-sm uppercase tracking-widest text-primary font-bold">
          Step 02 &bull; Timeline & Location
        </span>
        <h2 className="font-headline-lg text-2xl sm:text-3xl text-on-surface font-semibold tracking-tight">
          When and where is your event?
        </h2>
        <p className="font-body-md text-on-surface-variant max-w-md mx-auto text-sm sm:text-base">
          Lock in your preferred date and regional destination so we can coordinate availability.
        </p>
      </div>

      <div className="space-y-6 max-w-lg mx-auto">
        {/* Event Date Input */}
        <div>
          <label
            htmlFor="eventDate"
            className="block font-label-md text-label-md text-outline uppercase mb-2"
          >
            Event Date <span className="text-primary">*</span>
          </label>
          <div className="relative">
            <input
              id="eventDate"
              type="date"
              name="eventDate"
              min={minDate}
              value={eventDate}
              onChange={(e) => onChangeDate(e.target.value)}
              className={`w-full h-13 px-4 rounded-xl bg-surface-container text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-primary border transition-colors ${
                errors.eventDate ? 'border-error ring-1 ring-error/50' : 'border-surface-container-highest/60 focus:border-primary'
              } [color-scheme:dark]`}
            />
          </div>
          {errors.eventDate ? (
            <span className="text-error font-body-sm text-xs mt-1.5 flex items-center gap-1">
              <Icon name="error" className="text-[14px]" />
              {errors.eventDate}
            </span>
          ) : (
            <span className="text-on-surface-variant/70 font-body-sm text-xs mt-1 block">
              Choose your expected primary event date.
            </span>
          )}
        </div>

        {/* Event Location Input */}
        <div>
          <label
            htmlFor="location"
            className="block font-label-md text-label-md text-outline uppercase mb-2"
          >
            Event Location <span className="text-primary">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
              <Icon name="location_on" className="text-[20px]" />
            </div>
            <input
              id="location"
              type="text"
              name="location"
              value={location}
              onChange={(e) => onChangeLocation(e.target.value)}
              placeholder="e.g. Kochi, Kerala or Bangalore"
              className={`w-full h-13 pl-11 pr-4 rounded-xl bg-surface-container text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-primary border transition-colors ${
                errors.location ? 'border-error ring-1 ring-error/50' : 'border-surface-container-highest/60 focus:border-primary'
              }`}
            />
          </div>
          {errors.location && (
            <span className="text-error font-body-sm text-xs mt-1.5 flex items-center gap-1">
              <Icon name="error" className="text-[14px]" />
              {errors.location}
            </span>
          )}

          {/* Quick pick popular locations */}
          <div className="mt-3">
            <span className="text-xs text-on-surface-variant/80 block mb-2 font-medium">
              Popular regions:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {POPULAR_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => onChangeLocation(loc)}
                  className="px-2.5 py-1 rounded-lg bg-surface-container-high/80 hover:bg-surface-bright text-xs text-on-surface-variant hover:text-primary border border-surface-container-highest/50 transition-colors"
                >
                  {loc}
                </button>
              ))}
            </div>
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

export default EventDetailsStep;
