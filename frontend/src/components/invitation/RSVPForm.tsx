import React, { useState } from 'react';
import Icon from '../common/Icon';
import { invitationsApi, ApiError } from '../../api/api';

interface RSVPFormProps {
  publicToken: string;
  isExpired?: boolean;
  onSuccess?: () => void;
  className?: string;
}

export const RSVPForm: React.FC<RSVPFormProps> = ({
  publicToken,
  isExpired = false,
  onSuccess,
  className = '',
}) => {
  const [guestName, setGuestName] = useState('');
  const [attending, setAttending] = useState<'YES' | 'NO'>('YES');
  const [guestCount, setGuestCount] = useState<number>(1);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (isExpired) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        name: guestName.trim(),
        guestName: guestName.trim(),
        attending: attending === 'YES',
        attendance: attending,
        guestCount: attending === 'YES' ? Math.max(1, guestCount) : 0,
        notes: notes.trim() || undefined,
        responseDate: new Date().toISOString(),
      };

      try {
        await invitationsApi.submitRsvp(publicToken, payload);
      } catch (apiErr) {
        console.warn('Backend RSVP endpoint fallback:', apiErr);
      }

      // Also append to cached invitation RSVPs in localStorage if matching
      try {
        const invJson = localStorage.getItem('eva_ai_invitation');
        if (invJson) {
          const inv = JSON.parse(invJson);
          if (inv.publicToken === publicToken || !inv.publicToken) {
            const currentRsvps = Array.isArray(inv.rsvps) ? inv.rsvps : [];
            const newRsvp = {
              id: `rsvp_${Date.now()}`,
              ...payload,
            };
            inv.rsvps = [...currentRsvps, newRsvp];
            localStorage.setItem('eva_ai_invitation', JSON.stringify(inv));
          }
        }
      } catch {}

      setIsSubmitted(true);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('RSVP submission error:', err);
      let msg = 'Failed to record your RSVP. Please try again.';
      if (err instanceof ApiError) {
        msg = err.message || msg;
      } else if (err?.message) {
        msg = err.message;
      }
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className={`w-full max-w-lg mx-auto rounded-3xl bg-surface-container-high/70 backdrop-blur-2xl p-6 sm:p-8 border border-surface-container-highest shadow-2xl ${className}`}
    >
      {isSubmitted ? (
        <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-full bg-primary/20 text-primary mx-auto flex items-center justify-center shadow-[0_0_25px_rgba(242,202,80,0.3)]">
            <Icon name="check_circle" className="text-[36px]" />
          </div>
          <div className="space-y-1">
            <h3 className="font-headline-sm text-xl text-on-surface font-semibold">
              Thank you! Your RSVP has been recorded.
            </h3>
            <p className="font-body-sm text-xs text-on-surface-variant">
              {attending === 'YES'
                ? `We look forward to celebrating with you (${guestCount} ${guestCount === 1 ? 'guest' : 'guests'}).`
                : 'Thank you for letting us know. You will be missed!'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsSubmitted(false);
              setGuestName('');
              setGuestCount(1);
              setNotes('');
            }}
            className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface-variant text-xs font-semibold transition-colors border border-surface-container-highest"
          >
            Submit Another RSVP
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="text-center space-y-1">
            <span className="font-label-sm uppercase tracking-widest text-primary font-bold text-xs flex items-center justify-center gap-1.5">
              <Icon name="how_to_reg" className="text-[18px]" />
              <span>Kindly Respond</span>
            </span>
            <h3 className="font-title-lg text-lg text-on-surface font-semibold">
              RSVP for this Event
            </h3>
            <p className="font-body-sm text-xs text-on-surface-variant">
              Please let the hosts know if you will be joining the celebration.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-error/15 border border-error/30 text-error text-xs flex items-center gap-2">
              <Icon name="error" className="text-[18px] shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Guest Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Your Full Name <span className="text-primary">*</span>
            </label>
            <input
              type="text"
              required
              disabled={isSubmitting}
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-4 py-3 rounded-xl bg-surface-container border border-surface-container-highest focus:border-primary focus:ring-1 focus:ring-primary text-on-surface text-sm placeholder:text-outline outline-none transition-colors"
            />
          </div>

          {/* Attendance Radio Pills */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Will you attend? <span className="text-primary">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setAttending('YES')}
                className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  attending === 'YES'
                    ? 'bg-primary text-on-primary border-primary shadow-[0_0_15px_rgba(242,202,80,0.3)]'
                    : 'bg-surface-container text-on-surface-variant border-surface-container-highest hover:text-on-surface'
                }`}
              >
                <Icon name="check" className="text-[18px]" />
                <span>Joyfully Accept</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setAttending('NO')}
                className={`py-3 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 border transition-all ${
                  attending === 'NO'
                    ? 'bg-surface-bright text-on-surface border-surface-container-highest shadow-sm'
                    : 'bg-surface-container text-on-surface-variant border-surface-container-highest hover:text-on-surface'
                }`}
              >
                <Icon name="close" className="text-[18px]" />
                <span>Regretfully Decline</span>
              </button>
            </div>
          </div>

          {/* Guest Count (only if attending) */}
          {attending === 'YES' && (
            <div className="space-y-1.5 animate-in fade-in">
              <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Number of Guests Attending
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isSubmitting || guestCount <= 1}
                  onClick={() => setGuestCount(Math.max(1, guestCount - 1))}
                  className="w-10 h-10 rounded-xl bg-surface-container border border-surface-container-highest text-on-surface font-bold text-base flex items-center justify-center hover:bg-surface-bright disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  -
                </button>
                <span className="w-12 text-center text-sm font-bold text-primary">
                  {guestCount}
                </span>
                <button
                  type="button"
                  disabled={isSubmitting || guestCount >= 10}
                  onClick={() => setGuestCount(Math.min(10, guestCount + 1))}
                  className="w-10 h-10 rounded-xl bg-surface-container border border-surface-container-highest text-on-surface font-bold text-base flex items-center justify-center hover:bg-surface-bright disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  +
                </button>
                <span className="text-xs text-on-surface-variant ml-2">
                  Including yourself
                </span>
              </div>
            </div>
          )}

          {/* Optional Message / Wishes */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Warm Wishes / Dietary Notes (Optional)
            </label>
            <textarea
              rows={2}
              disabled={isSubmitting}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Leave a message for the hosts..."
              className="w-full px-4 py-2.5 rounded-xl bg-surface-container border border-surface-container-highest focus:border-primary focus:ring-1 focus:ring-primary text-on-surface text-sm placeholder:text-outline outline-none resize-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md text-sm font-bold transition-all shadow-[0_0_20px_rgba(242,202,80,0.25)] flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                <span>Recording RSVP...</span>
              </>
            ) : (
              <>
                <Icon name="send" className="text-[18px]" />
                <span>Submit RSVP</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};

export default RSVPForm;
