import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';

export const HeroSection: React.FC = () => {
  return (
    <section className="relative w-full overflow-hidden -mt-20 pt-32 pb-24 md:pt-40 md:pb-32">
      {/* Atmospheric Background Layers */}
      <div className="absolute inset-0 z-0">
        <img
          alt="Opulent conservatory greenhouse gala with twinkling fairy lights and crystal chandeliers"
          className="w-full h-full object-cover object-center scale-105 filter brightness-[0.4] contrast-[1.15]"
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuACS42Z2y5KOCi57cYQ4tWBXCnew5NBZ-JvxnyAhT8avFIQ3XADK6TRC3m8F4FrP9DFtzTJNxC3iPiC2L-czf2Lg9U3dVazyWE-xMJyApJbMFGgJhdt3aCKnMCkLqronIWF0N_a2NnfcfjDFwERNOgIxGIF7C_1eT5bJKlfD63oY3p1U6IkB2MPxOm5x5FjNNo1aPqyowgdXIb7Wcj1nXc97U3-MODqY_5w949gQRszX12XXHjhmuB9"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/75 to-surface/40"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-surface/90 via-surface/60 to-transparent"></div>
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
        <div className="absolute top-1/2 right-0 w-[500px] h-[500px] rounded-full bg-secondary-container/20 blur-[120px] pointer-events-none"></div>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 max-w-[1440px] mx-auto px-margin-mobile md:px-margin">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Core Message & Actions */}
          <div className="lg:col-span-7 flex flex-col items-start gap-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-container/80 backdrop-blur-md shadow-[0_0_20px_rgba(242,202,80,0.15)]">
              <Icon name="auto_awesome" className="text-primary text-[16px] animate-pulse" />
              <span className="font-label-sm text-label-sm text-primary uppercase tracking-widest">
                AI-Powered Event Platform
              </span>
            </div>

            <h1 className="font-display-hero text-display-hero-mobile md:text-display-hero font-normal text-on-surface leading-tight tracking-tight">
              Plan Your Perfect Event <br />
              <span className="font-headline-lg italic font-medium text-transparent bg-clip-text bg-gradient-to-r from-[#FDE89C] via-primary to-tertiary">
                with AI.
              </span>
            </h1>

            <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl leading-relaxed">
              Eva-Ai helps you discover and organize top-tier event services based on your unique celebration, preferred location, and budget — all in one seamless place.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-gradient-to-r from-primary via-tertiary to-primary-fixed text-on-primary font-title-md text-title-md font-semibold transition-all duration-300 shadow-[0_0_30px_rgba(242,202,80,0.35)] hover:shadow-[0_0_45px_rgba(242,202,80,0.55)] hover:scale-[1.02]"
                to="/signup"
              >
                <Icon name="magic_button" className="text-[20px] text-on-primary" />
                <span>Plan My Event</span>
                <Icon
                  name="arrow_forward"
                  className="text-[18px] transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>

              <a
                className="inline-flex items-center gap-2.5 px-6 py-4 rounded-xl bg-surface-container/70 hover:bg-surface-container-high text-on-surface font-title-md text-title-md transition-all duration-200 backdrop-blur-md hover:text-primary"
                href="#services"
              >
                <Icon name="explore" className="text-[20px] text-primary" />
                <span>Explore Services</span>
              </a>
            </div>

            {/* Trust Points */}
            <div className="flex items-center gap-6 pt-3 text-on-surface-variant">
              <div className="flex items-center gap-2">
                <Icon name="verified" className="text-primary text-[18px]" />
                <span className="font-body-sm text-body-sm">Verified Providers</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-outline-variant"></div>
              <div className="flex items-center gap-2">
                <Icon name="savings" className="text-primary text-[18px]" />
                <span className="font-body-sm text-body-sm">Smart Budget Optimization</span>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Hero Glass Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-2xl bg-surface-container-high/60 backdrop-blur-xl p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] border border-surface-container-highest/50">
              <div className="flex items-center justify-between pb-4 border-b border-surface-container">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary animate-ping"></div>
                  <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
                    Intelligent Event Synthesis
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] bg-primary/10 text-primary font-semibold">
                  Live Preview
                </span>
              </div>

              <div className="my-5 space-y-3">
                <div className="p-3.5 rounded-xl bg-surface-container-low flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                      <Icon name="event" className="text-[18px]" />
                    </div>
                    <div>
                      <span className="font-label-sm text-label-sm text-outline uppercase block">Event</span>
                      <span className="font-title-md text-title-md text-on-surface font-semibold">Wedding &amp; Reception</span>
                    </div>
                  </div>
                  <Icon name="check_circle" className="text-primary text-[18px]" />
                </div>

                <div className="p-3.5 rounded-xl bg-surface-container-low flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                      <Icon name="location_on" className="text-[18px]" />
                    </div>
                    <div>
                      <span className="font-label-sm text-label-sm text-outline uppercase block">Location</span>
                      <span className="font-title-md text-title-md text-on-surface font-semibold">Palakkad, Kerala</span>
                    </div>
                  </div>
                  <Icon name="check_circle" className="text-primary text-[18px]" />
                </div>

                <div className="p-3.5 rounded-xl bg-surface-container-low flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary">
                      <Icon name="account_balance_wallet" className="text-[18px]" />
                    </div>
                    <div>
                      <span className="font-label-sm text-label-sm text-outline uppercase block">Budget Cap</span>
                      <span className="font-title-md text-title-md text-primary font-semibold">₹2,00,000 (Optimized)</span>
                    </div>
                  </div>
                  <Icon name="check_circle" className="text-primary text-[18px]" />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between text-body-sm text-on-surface-variant">
                <span>Tailored Providers Matched</span>
                <span className="text-primary font-semibold">4 Categories Harmonized</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
