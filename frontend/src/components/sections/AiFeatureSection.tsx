import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';

export const AiFeatureSection: React.FC = () => {
  return (
    <section className="w-full py-24 bg-surface relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin relative z-10">
        <div className="rounded-3xl bg-surface-container-high/40 backdrop-blur-xl border border-surface-container-highest/60 p-8 sm:p-14 shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Narrative Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10">
                <Icon name="auto_awesome" className="text-primary text-[16px]" />
                <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
                  Intelligent Event Orchestration
                </span>
              </div>

              <h2 className="font-display-hero text-display-hero-mobile md:text-headline-lg font-normal text-on-surface leading-tight">
                Your event.{' '}
                <span className="italic text-transparent bg-clip-text bg-gradient-to-r dark:from-[#FDE89C] from-primary dark:via-primary via-tertiary dark:to-tertiary to-primary">
                  Your budget.
                </span>{' '}
                Your choices.
              </h2>

              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl leading-relaxed">
                Eva-Ai brings every moving part of event planning together. Instead of juggling dozens of vendor calls, price quotes, and schedule conflicts, Eva-Ai empowers you to discover, compare, and organize verified services harmonized to your exact financial target.
              </p>

              <div className="pt-2">
                <Link
                  className="px-8 py-4 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md text-title-md font-bold transition-all shadow-[0_0_25px_rgba(242,202,80,0.3)] hover:shadow-[0_0_35px_rgba(242,202,80,0.5)] inline-flex items-center gap-2"
                  to="/signup"
                >
                  <Icon name="magic_button" className="text-[20px]" />
                  <span>Try Eva-Ai</span>
                </Link>
              </div>
            </div>

            {/* Right Interactive Highlights Card */}
            <div className="lg:col-span-5">
              <div className="p-6 rounded-2xl bg-surface-container-lowest/80 border border-surface-container-high space-y-4">
                <div className="flex items-center gap-3 pb-3 border-b border-surface-container">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                    <Icon name="insights" className="text-[20px]" />
                  </div>
                  <div>
                    <h3 className="font-title-md text-title-md text-on-surface font-semibold">
                      Budget &amp; Service Harmony
                    </h3>
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      Real-time optimization
                    </span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container/60 text-sm">
                    <span className="text-on-surface">Target Budget:</span>
                    <span className="text-primary font-bold">Allocated Efficiently</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container/60 text-sm">
                    <span className="text-on-surface">Vendor Vetting:</span>
                    <span className="text-on-surface-variant font-medium">100% Quality Audited</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container/60 text-sm">
                    <span className="text-on-surface">Timeline Control:</span>
                    <span className="text-on-surface-variant font-medium">Synchronized in One Place</span>
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

export default AiFeatureSection;
