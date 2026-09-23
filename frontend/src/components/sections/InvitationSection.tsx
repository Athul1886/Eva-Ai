import React, { useState } from 'react';
import Icon from '../common/Icon';
import { InvitationTheme } from '../../types';

export const InvitationSection: React.FC = () => {
  const [theme, setTheme] = useState<InvitationTheme>('royal-gold');
  const [notification, setNotification] = useState<string | null>(null);

  const handleOpenStudio = () => {
    setNotification(
      'Opening Invitation Studio. Customize typography, soundtrack, dress code, and RSVP deadline.'
    );
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  const getThemeConfig = () => {
    switch (theme) {
      case 'velvet-burgundy':
        return {
          cardBg: 'bg-gradient-to-b from-[#2A0E15] via-[#170C0F] to-[#121317]',
          glowBg: 'bg-secondary/20',
          tagline: 'CORDIALLY INVITE YOU TO CELEBRATE',
          names: 'Aarav & Meera',
          icon: 'diamond',
          activeBtnClass: 'bg-secondary text-on-secondary-fixed font-semibold',
        };
      case 'botanical-glass':
        return {
          cardBg: 'bg-gradient-to-b from-[#0F1E19] via-[#121715] to-[#121317]',
          glowBg: 'bg-emerald-500/10',
          tagline: 'AN EVENING IN THE GREENHOUSE',
          names: 'Aarav & Meera',
          icon: 'local_florist',
          activeBtnClass: 'bg-primary text-on-primary font-semibold',
        };
      case 'minimal-noir':
        return {
          cardBg: 'bg-[#18191E]',
          glowBg: 'bg-white/5',
          tagline: 'THE WEDDING RECEPTION OF',
          names: 'AARAV + MEERA',
          icon: 'all_inclusive',
          activeBtnClass: 'bg-on-surface text-surface font-semibold',
        };
      case 'royal-gold':
      default:
        return {
          cardBg: 'bg-gradient-to-b from-[#1E1A11] via-[#121317] to-[#121317]',
          glowBg: 'bg-primary/20',
          tagline: 'TOGETHER WITH THEIR FAMILIES',
          names: 'Aarav & Meera',
          icon: 'auto_awesome',
          activeBtnClass: 'bg-primary text-on-primary font-semibold',
        };
    }
  };

  const config = getThemeConfig();

  const themesList: { id: InvitationTheme; label: string }[] = [
    { id: 'royal-gold', label: 'Traditional Royal Gold' },
    { id: 'velvet-burgundy', label: 'Burgundy Imperial' },
    { id: 'botanical-glass', label: 'Botanical Conservatory' },
    { id: 'minimal-noir', label: 'Modern Minimalist Noir' },
  ];

  return (
    <section className="w-full py-28 bg-surface-container-lowest relative">
      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left: Interactive Template Switcher & Details */}
          <div className="lg:col-span-6 flex flex-col items-start">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary px-3 py-1 rounded-full bg-primary/10">
              Bespoke Stationery &amp; Web Suite
            </span>
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-medium text-on-surface mt-3">
              Digital RSVP &amp; Couture Invitations
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant mt-3 mb-8">
              Impress your esteemed guests before the celebration begins. Create responsive, high-aesthetic wedding microsites with instant RSVP tracking, GPS wayfinding, and dress code lookbooks.
            </p>

            {/* 3 Step Quick Banner */}
            <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-surface-container mb-8 w-full">
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-primary font-bold">1</span>
                <span className="font-title-md text-title-md text-on-surface font-semibold mt-0.5">
                  Select Vibe
                </span>
                <span className="font-body-sm text-body-sm text-outline">Haute typography</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-primary font-bold">2</span>
                <span className="font-title-md text-title-md text-on-surface font-semibold mt-0.5">
                  Add Dates
                </span>
                <span className="font-body-sm text-body-sm text-outline">Venue &amp; schedule</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm text-primary font-bold">3</span>
                <span className="font-title-md text-title-md text-on-surface font-semibold mt-0.5">
                  Send Link
                </span>
                <span className="font-body-sm text-body-sm text-outline">Automated RSVPs</span>
              </div>
            </div>

            {/* Template Selection Pills */}
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-outline mb-3">
              Choose Invitation Aesthetic:
            </span>
            <div className="flex flex-wrap gap-3 mb-8">
              {themesList.map((t) => {
                const isSelected = theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`px-5 py-2.5 rounded-xl font-label-md text-label-md transition-all ${
                      isSelected
                        ? config.activeBtnClass
                        : 'bg-surface-container text-on-surface-variant hover:text-on-surface'
                    }`}
                    onClick={() => setTheme(t.id)}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {notification && (
              <div className="mb-4 p-3 rounded-xl bg-primary/20 border border-primary/30 text-primary text-sm">
                {notification}
              </div>
            )}

            <div className="flex items-center gap-4">
              <button
                type="button"
                className="px-7 py-3.5 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md text-title-md font-semibold transition-all shadow-md"
                onClick={handleOpenStudio}
              >
                Create Your Digital Invitation
              </button>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Includes guest list QR pass
              </span>
            </div>
          </div>

          {/* Right: Live Dynamic Invitation Mockup */}
          <div className="lg:col-span-6 flex justify-center">
            <div
              className={`w-full max-w-md rounded-3xl p-8 sm:p-10 shadow-2xl transition-all duration-500 relative overflow-hidden text-center ${config.cardBg}`}
            >
              {/* Ambient Glow Accent */}
              <div
                className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 blur-3xl pointer-events-none transition-all ${config.glowBg}`}
              ></div>
              <div className="relative z-10 space-y-6">
                {/* Top Crest */}
                <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                  <Icon name={config.icon} className="text-[28px]" />
                </div>
                {/* Top Overline */}
                <div className="space-y-1">
                  <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">
                    {config.tagline}
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Request the honor of your presence
                  </p>
                </div>
                {/* Couple Names */}
                <div className="py-2">
                  <h3 className="font-headline-lg text-headline-lg font-normal text-on-surface tracking-wide">
                    {config.names}
                  </h3>
                  <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent mx-auto mt-3"></div>
                </div>
                {/* Date & Location Details */}
                <div className="space-y-2 py-2">
                  <p className="font-title-md text-title-md text-primary font-semibold tracking-wider uppercase">
                    SATURDAY, DECEMBER 14, 2025
                  </p>
                  <p className="font-body-md text-body-md text-on-surface-variant">
                    The Grand Glasshouse Conservatory • Palakkad
                  </p>
                </div>
                {/* RSVP Live Status Mockup */}
                <div className="p-4 rounded-xl bg-surface-container-high/60 backdrop-blur-md space-y-3">
                  <div className="flex items-center justify-between text-[13px]">
                    <span className="text-on-surface-variant">Instant RSVP Response:</span>
                    <span className="text-primary font-semibold">Attending (2 Guests)</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 py-2 rounded-lg bg-primary text-on-primary font-label-md text-label-md font-bold"
                    >
                      Accept with Pleasure
                    </button>
                    <button
                      type="button"
                      className="px-3 py-2 rounded-lg bg-surface-container text-on-surface-variant font-label-md text-label-md"
                    >
                      Decline
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-center gap-4 text-on-surface-variant text-[12px] pt-2">
                  <span className="flex items-center gap-1">
                    <Icon name="map" className="text-[14px]" /> Google Maps GPS
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Icon name="calendar_month" className="text-[14px]" /> Add to Calendar
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default InvitationSection;
