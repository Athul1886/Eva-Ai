import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';

export const CtaBannerSection: React.FC = () => {
  return (
    <section className="w-full py-28 relative overflow-hidden bg-surface">
      {/* Ambient background illumination */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-primary/10 rounded-full blur-[140px] pointer-events-none"></div>

      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin relative z-10">
        <div className="max-w-3xl mx-auto text-center flex flex-col items-center gap-6">
          <div className="w-14 h-14 rounded-2xl bg-surface-container-high flex items-center justify-center shadow-lg border border-surface-container-highest/60">
            <Icon name="auto_awesome" className="text-primary text-[30px]" />
          </div>

          <h2 className="font-headline-lg text-display-hero-mobile md:text-headline-lg font-medium text-on-surface leading-tight">
            Ready to plan your event?
          </h2>

          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl">
            Experience the effortless way to harmonize venues, artists, and catering tailored to your vision and budget.
          </p>

          <div className="pt-2">
            <Link
              className="px-9 py-4 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md text-title-md font-bold transition-all shadow-[0_0_30px_rgba(242,202,80,0.4)] hover:shadow-[0_0_45px_rgba(242,202,80,0.6)] hover:scale-105 inline-flex items-center gap-2"
              to="/signup"
            >
              <span>Get Started</span>
              <Icon name="arrow_forward" className="text-[18px]" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CtaBannerSection;
