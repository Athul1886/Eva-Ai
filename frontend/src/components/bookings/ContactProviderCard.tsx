import React, { useState } from 'react';
import Icon from '../common/Icon';

interface ContactProviderCardProps {
  contactDemo: {
    manager: string;
    phone: string;
    email: string;
    address?: string;
    hours?: string;
  };
  providerName: string;
}

export const ContactProviderCard: React.FC<ContactProviderCardProps> = ({
  contactDemo,
  providerName,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopyPhone = () => {
    if (contactDemo.phone) {
      navigator.clipboard.writeText(contactDemo.phone).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  const cleanPhone = contactDemo.phone.replace(/[^0-9+]/g, '');

  return (
    <div className="rounded-2xl bg-surface-container-low/90 border border-primary/30 p-4 sm:p-5 space-y-3 shadow-lg">
      <div className="flex items-center justify-between pb-2 border-b border-surface-container-highest/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
            <Icon name="phone_in_talk" className="text-[16px]" />
          </div>
          <div>
            <h4 className="font-title-md text-xs sm:text-sm font-bold text-on-surface">
              Contact Provider
            </h4>
            <span className="text-[10px] text-emerald-400 font-medium">
              Direct Access &bull; Verified Host
            </span>
          </div>
        </div>

        <span className="text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">
          {contactDemo.manager}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        {/* Phone */}
        <div className="p-3 rounded-xl bg-surface-container/70 border border-surface-container-highest/60 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] uppercase text-on-surface-variant font-medium block">
              📞 Phone Number
            </span>
            <div className="text-primary font-bold text-xs sm:text-sm truncate">
              {contactDemo.phone}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <a
              href={`tel:${cleanPhone}`}
              className="p-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary hover:text-on-primary transition-colors text-[11px] font-semibold flex items-center gap-1"
              title={`Call ${providerName}`}
            >
              <Icon name="call" className="text-[14px]" />
              <span className="hidden sm:inline">Call</span>
            </a>

            <button
              type="button"
              onClick={handleCopyPhone}
              className={`p-1.5 rounded-lg transition-colors text-[11px] font-semibold flex items-center gap-1 ${
                copied
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-surface-container-high hover:bg-surface-bright text-on-surface-variant hover:text-on-surface'
              }`}
              title="Copy phone number"
            >
              <Icon name={copied ? 'done' : 'content_copy'} className="text-[14px]" />
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Email */}
        <div className="p-3 rounded-xl bg-surface-container/70 border border-surface-container-highest/60 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] uppercase text-on-surface-variant font-medium block">
              ✉️ Official Email
            </span>
            <div className="text-on-surface font-semibold text-xs truncate">
              {contactDemo.email}
            </div>
          </div>

          <a
            href={`mailto:${contactDemo.email}`}
            className="p-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface-variant hover:text-on-surface transition-colors text-[11px] font-semibold flex items-center gap-1 flex-shrink-0"
            title={`Email ${providerName}`}
          >
            <Icon name="mail" className="text-[14px]" />
            <span className="hidden sm:inline">Email</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default ContactProviderCard;
