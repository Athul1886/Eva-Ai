import React from 'react';
import Icon from '../common/Icon';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-surface-container-lowest border-t border-surface-container/60">
      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 mb-12">
          {/* Brand Info */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="flex items-center gap-space-sm">
              <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center">
                <Icon name="auto_awesome" className="text-primary text-[18px]" />
              </div>
              <span className="font-headline-sm text-headline-sm tracking-wider text-primary uppercase">
                EVA-AI
              </span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
              The premier AI event platform connecting hosts with curated venues, photographers, caterers, and decorators.
            </p>
          </div>

          {/* Platform Links */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <span className="font-label-md text-label-md uppercase tracking-wider text-primary">
              Navigation
            </span>
            <a className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors" href="#">
              Home
            </a>
            <a className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors" href="#how-it-works">
              How It Works
            </a>
            <a className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors" href="#services">
              Services
            </a>
            <a className="font-body-md text-body-md text-on-surface-variant hover:text-on-surface transition-colors" href="#for-providers">
              For Providers
            </a>
          </div>

          {/* Services Links */}
          <div className="lg:col-span-2 flex flex-col gap-3">
            <span className="font-label-md text-label-md uppercase tracking-wider text-primary">
              Disciplines
            </span>
            <span className="font-body-md text-body-md text-on-surface-variant">Venues</span>
            <span className="font-body-md text-body-md text-on-surface-variant">Photography</span>
            <span className="font-body-md text-body-md text-on-surface-variant">Royal Catering</span>
            <span className="font-body-md text-body-md text-on-surface-variant">Floral Décor</span>
          </div>

          {/* Legal / Trust */}
          <div className="lg:col-span-3 flex flex-col gap-3">
            <span className="font-label-md text-label-md uppercase tracking-wider text-primary">
              Standards
            </span>
            <span className="font-body-md text-body-md text-on-surface-variant">
              100% Verified Guild Auditing
            </span>
            <span className="font-body-md text-body-md text-on-surface-variant">
              Smart Budget Optimization
            </span>
            <span className="font-body-md text-body-md text-on-surface-variant">
              Privacy Charter &amp; Security
            </span>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            © 2025 Eva-Ai Technologies. All rights reserved.
          </p>
          <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary">
            Intelligent Event Infrastructure
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
