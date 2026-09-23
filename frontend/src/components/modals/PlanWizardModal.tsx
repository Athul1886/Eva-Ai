import React, { useState } from 'react';
import Icon from '../common/Icon';

interface PlanWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSynthesize: (guests: string, budget: string) => void;
}

export const PlanWizardModal: React.FC<PlanWizardModalProps> = ({
  isOpen,
  onClose,
  onSynthesize,
}) => {
  const [occasion, setOccasion] = useState('Royal Wedding & Reception');
  const [city, setCity] = useState('Palakkad, Kerala');
  const [guests, setGuests] = useState('250');
  const [budget, setBudget] = useState('2,00,000');
  const [selectedServices, setSelectedServices] = useState<string[]>([
    'Venue / Hall',
    'Cinematography',
    'Royal Catering',
    'Floral Mandap',
  ]);

  if (!isOpen) return null;

  const toggleService = (srv: string) => {
    setSelectedServices((prev) =>
      prev.includes(srv) ? prev.filter((s) => s !== srv) : [...prev, srv]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSynthesize(guests, budget);
  };

  const availableServices = [
    'Venue / Hall',
    'Cinematography',
    'Royal Catering',
    'Floral Mandap',
    'Bridal Styling',
    'DJ & Acoustics',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-surface-container-lowest/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl rounded-3xl bg-surface-container p-6 sm:p-10 shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          aria-label="Close modal"
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
          onClick={onClose}
        >
          <Icon name="close" className="text-[20px]" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <Icon name="magic_button" className="text-primary text-[18px]" />
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary">
            EVENTORA AI Generator
          </span>
        </div>

        <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mb-2">
          Design Your Bespoke Celebration
        </h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant mb-6">
          Our neural matching engine tailors verified venues, caterers, and artists to your budget.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-label-md text-label-md text-outline uppercase mb-2">
              Event Occasion
            </label>
            <select
              className="w-full h-12 px-4 rounded-xl bg-surface-container-high text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-primary"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
            >
              <option>Royal Wedding &amp; Reception</option>
              <option>Intimate Engagement Ceremony</option>
              <option>Flagship Corporate Gala / Summit</option>
              <option>Private Luxury Birthday / Anniversary</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-label-md text-label-md text-outline uppercase mb-2">
                Target Location / City
              </label>
              <input
                className="w-full h-12 px-4 rounded-xl bg-surface-container-high text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-primary"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-outline uppercase mb-2">
                Estimated Guest Count
              </label>
              <input
                className="w-full h-12 px-4 rounded-xl bg-surface-container-high text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-primary"
                type="number"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block font-label-md text-label-md text-outline uppercase mb-2">
              Budget Limit (₹ INR)
            </label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-primary font-bold">₹</span>
              <input
                className="w-full h-12 pl-8 pr-4 rounded-xl bg-surface-container-high text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-primary"
                type="text"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block font-label-md text-label-md text-outline uppercase mb-2">
              Required Services
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[13px]">
              {availableServices.map((srv) => (
                <label
                  key={srv}
                  className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-container-high cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(srv)}
                    onChange={() => toggleService(srv)}
                    className="accent-primary"
                  />
                  <span>{srv}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full py-4 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md text-title-md font-bold transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <Icon name="psychology" className="text-[20px]" />
              <span>Synthesize My Custom Match</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlanWizardModal;
