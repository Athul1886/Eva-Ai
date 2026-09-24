import React, { useState } from 'react';
import Icon from '../common/Icon';

interface DualPortalModalProps {
  isOpen: boolean;
  initialTab?: 'user' | 'provider';
  onClose: () => void;
}

export const DualPortalModal: React.FC<DualPortalModalProps> = ({
  isOpen,
  initialTab = 'user',
  onClose,
}) => {
  const [tab, setTab] = useState<'user' | 'provider'>(initialTab);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAlertMsg('Client authenticated. Loading your AI event canvas...');
    setTimeout(() => {
      setAlertMsg(null);
      onClose();
    }, 1500);
  };

  const handleProviderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAlertMsg('Provider profile verified. Welcome back to Provider Suite.');
    setTimeout(() => {
      setAlertMsg(null);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-surface-container-lowest/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl rounded-3xl bg-surface-container p-8 shadow-2xl">
        <button
          type="button"
          aria-label="Close modal"
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
          onClick={onClose}
        >
          <Icon name="close" className="text-[20px]" />
        </button>

        <div className="text-center mb-6">
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary">
            ACCESS THE ATELIER
          </span>
          <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mt-1">
            Welcome to Eva-Ai
          </h3>
          <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
            Select your gateway to proceed
          </p>
        </div>

        {alertMsg && (
          <div className="mb-4 p-3 rounded-xl bg-primary/20 border border-primary/30 text-primary text-sm text-center">
            {alertMsg}
          </div>
        )}

        {/* Portal Switcher Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6">
          <button
            type="button"
            className={`p-5 rounded-2xl text-left transition-all group flex flex-col justify-between h-36 ${
              tab === 'user' ? 'bg-primary/15 border-0' : 'bg-surface-container-high'
            }`}
            onClick={() => setTab('user')}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                tab === 'user' ? 'bg-primary text-on-primary' : 'bg-surface-bright text-on-surface'
              }`}
            >
              <Icon name="celebration" className="text-[20px]" />
            </div>
            <div>
              <div
                className={`font-title-md text-title-md font-semibold ${
                  tab === 'user' ? 'text-primary' : 'text-on-surface'
                }`}
              >
                Client Portal
              </div>
              <div className="font-body-sm text-body-sm text-on-surface-variant">
                Planning a wedding or private gala
              </div>
            </div>
          </button>

          <button
            type="button"
            className={`p-5 rounded-2xl text-left transition-all group flex flex-col justify-between h-36 ${
              tab === 'provider' ? 'bg-primary/15 border-0' : 'bg-surface-container-high'
            }`}
            onClick={() => setTab('provider')}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                tab === 'provider'
                  ? 'bg-primary text-on-primary'
                  : 'bg-surface-bright text-on-surface'
              }`}
            >
              <Icon name="storefront" className="text-[20px]" />
            </div>
            <div>
              <div
                className={`font-title-md text-title-md font-semibold ${
                  tab === 'provider' ? 'text-primary' : 'text-on-surface'
                }`}
              >
                Provider Atelier
              </div>
              <div className="font-body-sm text-body-sm text-on-surface-variant">
                Photographer, venue, caterer, coordinator
              </div>
            </div>
          </button>
        </div>

        {/* User Login Form */}
        {tab === 'user' && (
          <form onSubmit={handleUserSubmit} className="space-y-4">
            <div>
              <label className="block font-label-md text-label-md text-outline uppercase mb-1">
                Email or Mobile
              </label>
              <input
                className="w-full h-12 px-4 rounded-xl bg-surface-container-high text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="meera.aarav@domain.com"
                type="text"
                required
              />
            </div>
            <div>
              <label className="block font-label-md text-label-md text-outline uppercase mb-1">
                Passcode
              </label>
              <input
                className="w-full h-12 px-4 rounded-xl bg-surface-container-high text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="••••••••"
                type="password"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md text-title-md font-bold transition-all shadow-md"
            >
              Enter Client Dashboard
            </button>
          </form>
        )}

        {/* Provider Login Form */}
        {tab === 'provider' && (
          <form onSubmit={handleProviderSubmit} className="space-y-4">
            <div>
              <label className="block font-label-md text-label-md text-outline uppercase mb-1">
                Professional Category
              </label>
              <select className="w-full h-12 px-4 rounded-xl bg-surface-container-high text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-primary">
                <option>Cinematographer / Photographer</option>
                <option>Heritage Venue / Grand Lawn</option>
                <option>Bespoke Royal Caterer</option>
                <option>Scenic Floral Designer</option>
                <option>Sound &amp; Lighting Producer</option>
              </select>
            </div>
            <div>
              <label className="block font-label-md text-label-md text-outline uppercase mb-1">
                Business Identifier
              </label>
              <input
                className="w-full h-12 px-4 rounded-xl bg-surface-container-high text-on-surface font-body-md focus:outline-none focus:ring-1 focus:ring-primary"
                placeholder="studio@atelier-creatives.com"
                type="text"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md text-title-md font-bold transition-all shadow-md"
            >
              Open Partner Suite
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default DualPortalModal;
