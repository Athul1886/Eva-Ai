import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';

export const ProviderSection: React.FC = () => {
  return (
    <section className="w-full py-24 bg-surface-container-lowest relative" id="for-providers">
      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin">
        <div className="rounded-3xl bg-gradient-to-br from-surface-container-high via-surface-container to-surface-container-low p-8 sm:p-12 relative overflow-hidden shadow-2xl border border-surface-container-high/60">
          <div className="absolute -right-24 -bottom-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
            {/* Left Content */}
            <div className="lg:col-span-7 space-y-6">
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary px-3.5 py-1.5 rounded-full bg-primary/10">
                Partner Atelier Network
              </span>

              <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-medium text-on-surface">
                Grow Your Event Business.{' '}
                <span className="text-primary italic">High-Caliber Bookings.</span>
              </h2>

              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl leading-relaxed">
                Are you an established venue, photographer, caterer, decorator, event manager, makeup artist, or DJ? Join the Eva-Ai partner network to receive qualified briefs and connect directly with event hosts ready to book.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-surface-container-lowest/60 border border-surface-container text-center">
                  <span className="font-title-md text-title-md text-primary font-bold block">Venues</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Halls &amp; Palaces</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-lowest/60 border border-surface-container text-center">
                  <span className="font-title-md text-title-md text-primary font-bold block">Photographers</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Cinema &amp; Aerial</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-lowest/60 border border-surface-container text-center">
                  <span className="font-title-md text-title-md text-primary font-bold block">Caterers</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Royal Feasts</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-lowest/60 border border-surface-container text-center">
                  <span className="font-title-md text-title-md text-primary font-bold block">Decorators</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Florals &amp; Stages</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-lowest/60 border border-surface-container text-center">
                  <span className="font-title-md text-title-md text-primary font-bold block">Stylists</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Bridal Makeup</span>
                </div>
                <div className="p-3 rounded-xl bg-surface-container-lowest/60 border border-surface-container text-center">
                  <span className="font-title-md text-title-md text-primary font-bold block">DJs &amp; Sound</span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Acoustics &amp; Lights</span>
                </div>
              </div>

              <div className="pt-2">
                <Link
                  className="px-8 py-4 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md text-title-md font-semibold transition-all shadow-lg hover:scale-[1.02] inline-flex items-center gap-2"
                  to="/signup/provider"
                >
                  <Icon name="handshake" className="text-[20px]" />
                  <span>Join as Provider</span>
                </Link>
              </div>
            </div>

            {/* Right Image Feature */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-surface-container">
                <img
                  alt="Cinematographer calibrating camera at an evening gala"
                  className="w-full h-80 object-cover"
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuC2Pb1ifT6x0IcLjaWkzL2P4V8jz7Dl9SuVMG8W8v4zQHaWfy5UNKuN5aQ95XaY6W6FjovveWpgIU5tF3NMtV0URxolb5fGDxttdPSclOWsQIojAmWcMqK2kYYX5PBqE68LqvG2SYzwbZCaRFpjJzNk1yfMcvrKUjlOZ0OHt5Rw20HTDQLgjbBEI_jLUTa5Zw1ldrCSYgIGmMOIK47aB0ujJ5_paWbLD9JTljFygwXFSS1nnlly6bb4"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent"></div>
                <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-xl bg-surface-container-high/90 backdrop-blur-md">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-primary uppercase font-bold">
                      Verified Partner Guild
                    </span>
                    <span className="font-body-sm text-body-sm text-on-surface">
                      Zero Upfront Commitment
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProviderSection;
