import React from 'react';
import Icon from '../common/Icon';
import { InvitationData, InvitationTheme, normalizeInvitationTheme } from '../../types/invitation';

interface InvitationCardProps {
  invitation: Partial<InvitationData>;
  isPreview?: boolean;
  className?: string;
}

export const InvitationCard: React.FC<InvitationCardProps> = ({
  invitation,
  isPreview = false,
  className = '',
}) => {
  const theme: InvitationTheme = normalizeInvitationTheme(
    invitation.theme ||
    invitation.template ||
    invitation.designTheme ||
    invitation.templateName ||
    invitation.invitationTheme
  );

  const getThemeConfig = () => {
    switch (theme) {
      case 'velvet-burgundy':
        return {
          cardBg: 'bg-gradient-to-b from-[#2A0E15] via-[#170C0F] to-[#121317]',
          glowBg: 'bg-[#ff5277]/15',
          borderClass: 'border-[#ff5277]/30',
          cornerBorder: 'border-[#ff5277]/50',
          taglineColor: 'text-[#ffb3c0]',
          accentColor: 'text-[#f2ca50]',
          crestClass: 'bg-[#ff5277]/15 border-[#ff5277]/40 text-[#ffb3c0] shadow-[0_0_25px_rgba(255,82,119,0.25)]',
          dividerGradient: 'from-transparent via-[#ff5277] to-transparent',
          chipBg: 'bg-white/[0.07] border-white/15',
          icon: 'diamond',
        };
      case 'botanical-glass':
        return {
          cardBg: 'bg-gradient-to-b from-[#0F1E19] via-[#121715] to-[#121317]',
          glowBg: 'bg-emerald-500/15',
          borderClass: 'border-emerald-500/30',
          cornerBorder: 'border-emerald-500/50',
          taglineColor: 'text-emerald-400',
          accentColor: 'text-[#f2ca50]',
          crestClass: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_25px_rgba(52,211,153,0.25)]',
          dividerGradient: 'from-transparent via-emerald-400 to-transparent',
          chipBg: 'bg-white/[0.07] border-white/15',
          icon: 'local_florist',
        };
      case 'minimal-noir':
        return {
          cardBg: 'bg-[#18191E]',
          glowBg: 'bg-white/10',
          borderClass: 'border-white/20',
          cornerBorder: 'border-white/30',
          taglineColor: 'text-white/80',
          accentColor: 'text-white',
          crestClass: 'bg-white/10 border-white/30 text-white shadow-[0_0_25px_rgba(255,255,255,0.15)]',
          dividerGradient: 'from-transparent via-white/40 to-transparent',
          chipBg: 'bg-white/[0.06] border-white/15',
          icon: 'all_inclusive',
        };
      case 'royal-gold':
      default:
        return {
          cardBg: 'bg-gradient-to-b from-[#1E1A11] via-[#121317] to-[#121317]',
          glowBg: 'bg-[#f2ca50]/20',
          borderClass: 'border-[#f2ca50]/40',
          cornerBorder: 'border-[#f2ca50]/50',
          taglineColor: 'text-[#f2ca50]',
          accentColor: 'text-[#f2ca50]',
          crestClass: 'bg-[#f2ca50]/15 border-[#f2ca50]/40 text-[#f2ca50] shadow-[0_0_25px_rgba(242,202,80,0.25)]',
          dividerGradient: 'from-transparent via-[#f2ca50] to-transparent',
          chipBg: 'bg-white/[0.07] border-white/15',
          icon: 'auto_awesome',
        };
    }
  };

  const config = getThemeConfig();

  const names =
    invitation.coupleNames ||
    invitation.hostNames ||
    'Couple / Host Names';

  const title =
    invitation.title ||
    (invitation.eventType
      ? `${invitation.eventType.toUpperCase()} CELEBRATION`
      : 'WEDDING CELEBRATION');

  const message =
    invitation.message ||
    'Together with our families, we invite you to share in our joy as we celebrate our special day.';

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Date to be announced';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const isExpired =
    invitation.status === 'EXPIRED' ||
    invitation.status === 'expired';

  const venueDisplayName = invitation.venueName || invitation.location || 'Venue details to follow';
  const venueAddress = invitation.venueAddress || (invitation.venueName ? invitation.location : '');

  // Google Maps link
  const mapsSearchQuery = encodeURIComponent(
    [invitation.venueName, invitation.venueAddress || invitation.location].filter(Boolean).join(', ')
  );
  const mapsUrl = mapsSearchQuery
    ? `https://www.google.com/maps/search/?api=1&query=${mapsSearchQuery}`
    : '#';

  return (
    <div
      className={`relative w-full max-w-lg mx-auto rounded-3xl p-8 sm:p-12 shadow-[0_20px_60px_rgba(0,0,0,0.6)] border ${config.borderClass} transition-all duration-500 overflow-hidden text-center select-none ${config.cardBg} ${className}`}
    >
      {/* Ambient background glow */}
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 w-80 h-44 blur-3xl pointer-events-none transition-all ${config.glowBg}`}
      />

      {/* Luxury Ornamental Frame Corners */}
      <div className={`absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 ${config.cornerBorder} rounded-tl-lg pointer-events-none`} />
      <div className={`absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 ${config.cornerBorder} rounded-tr-lg pointer-events-none`} />
      <div className={`absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 ${config.cornerBorder} rounded-bl-lg pointer-events-none`} />
      <div className={`absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 ${config.cornerBorder} rounded-br-lg pointer-events-none`} />

      <div className="relative z-10 space-y-7">
        {/* Top Crest / Monogram */}
        <div className={`w-16 h-16 mx-auto rounded-full border flex items-center justify-center ${config.crestClass}`}>
          <Icon name={config.icon} className="text-[30px]" />
        </div>

        {/* Header Tagline & Event Type */}
        <div className="space-y-1.5">
          <span
            className={`font-label-sm uppercase tracking-[0.25em] text-xs font-bold block ${config.taglineColor}`}
          >
            {title}
          </span>
          <p className="font-body-xs text-xs text-white/75 tracking-wider uppercase">
            Cordially request the pleasure of your company
          </p>
        </div>

        {/* Main Names */}
        <div className="py-2 space-y-3">
          <h2 className="font-headline-lg text-2xl sm:text-3xl lg:text-4xl text-white font-normal tracking-wide leading-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            {names}
          </h2>
          <div className={`w-24 h-0.5 bg-gradient-to-r ${config.dividerGradient} mx-auto`} />
        </div>

        {/* Message */}
        {message && (
          <p className="font-body-md text-sm text-white/85 max-w-md mx-auto italic leading-relaxed px-2">
            &ldquo;{message}&rdquo;
          </p>
        )}

        {/* Date & Time Highlight */}
        <div className={`py-3 px-4 rounded-2xl ${config.chipBg} backdrop-blur-md border space-y-2`}>
          <div className={`flex items-center justify-center gap-2 ${config.accentColor} font-bold text-sm sm:text-base uppercase tracking-widest`}>
            <Icon name="calendar_today" className="text-[18px]" />
            <span>{formatDate(invitation.eventDate)}</span>
          </div>

          {invitation.eventTime && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-white/80 font-medium">
              <Icon name="schedule" className={`text-[16px] ${config.accentColor}`} />
              <span>{invitation.eventTime}</span>
            </div>
          )}
        </div>

        {/* Venue & Location */}
        <div className="space-y-1">
          <div className="flex items-center justify-center gap-1.5 font-title-md text-sm font-semibold text-white">
            <Icon name="location_on" className={`${config.accentColor} text-[18px]`} />
            <span>{venueDisplayName}</span>
          </div>
          {venueAddress && venueAddress !== venueDisplayName && (
            <p className="font-body-xs text-xs text-white/75 max-w-xs mx-auto">
              {venueAddress}
            </p>
          )}
        </div>

        {/* Status or Expired Banner */}
        {isExpired ? (
          <div className="p-4 rounded-2xl bg-error/20 border border-error/40 text-[#ffb4ab] space-y-1 text-center animate-in fade-in">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#ffb4ab]">
              <Icon name="event_busy" className="text-[16px]" />
              <span>This invitation has expired</span>
            </div>
            <p className="text-xs text-white/80">
              This event took place on {formatDate(invitation.eventDate)}.
            </p>
            <p className="text-xs text-white/90 font-medium">
              Thank you for being part of the celebration. ❤️
            </p>
          </div>
        ) : isPreview ? (
          <div className="px-4 py-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm">
            <Icon name="visibility" className={`text-[14px] ${config.accentColor}`} />
            <span>Live Guest Preview</span>
          </div>
        ) : null}

        {/* Navigation & Maps helper links */}
        {!isPreview && (
          <div className="flex items-center justify-center gap-4 text-white/75 text-xs pt-1">
            {mapsSearchQuery && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-white/80 hover:text-white transition-colors"
              >
                <Icon name="directions" className={`text-[14px] ${config.accentColor}`} />
                <span>Google Maps GPS</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvitationCard;
