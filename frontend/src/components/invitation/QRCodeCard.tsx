import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Icon from '../common/Icon';

interface QRCodeCardProps {
  url: string;
  title?: string;
  subtitle?: string;
  className?: string;
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({
  url,
  title = 'Guest Invitation Pass',
  subtitle = 'Scan with any smartphone camera to open the invitation and RSVP',
  className = '',
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [shared, setShared] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;

    let isMounted = true;
    QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: {
        dark: '#121317',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    })
      .then((dataUrl) => {
        if (isMounted) {
          setQrDataUrl(dataUrl);
          setError(null);
        }
      })
      .catch((err) => {
        console.error('Failed to generate QR Code:', err);
        if (isMounted) {
          setError('Could not generate QR code');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [url]);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      console.warn('Copy link failed:', e);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Wedding & Event Invitation',
          text: `You're invited to celebrate with us! View your digital invitation and RSVP online:`,
          url: url,
        });
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `eva-ai-invitation-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className={`rounded-3xl bg-surface-container-high/70 backdrop-blur-2xl p-6 sm:p-8 border border-surface-container-highest shadow-2xl flex flex-col items-center text-center space-y-6 ${className}`}
    >
      <div className="space-y-1 max-w-sm">
        <span className="font-label-sm uppercase tracking-widest text-primary font-bold text-xs flex items-center justify-center gap-1.5">
          <Icon name="qr_code_2" className="text-[18px]" />
          <span>Digital Guest Pass</span>
        </span>
        <h3 className="font-title-lg text-lg text-on-surface font-semibold">{title}</h3>
        <p className="font-body-sm text-xs text-on-surface-variant leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* QR Display Card */}
      <div className="relative p-4 sm:p-5 rounded-2xl bg-white shadow-[0_10px_40px_rgba(0,0,0,0.3)] border-2 border-primary/40 group transition-transform hover:scale-[1.02]">
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="Public Invitation QR Code"
            className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-lg"
          />
        ) : error ? (
          <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center text-error text-xs p-4">
            {error}
          </div>
        ) : (
          <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-surface-container-lowest text-primary text-[10px] font-bold tracking-wider uppercase border border-primary/40 shadow-sm flex items-center gap-1 whitespace-nowrap">
          <Icon name="auto_awesome" className="text-[12px]" />
          <span>Scan to RSVP</span>
        </div>
      </div>

      {/* URL Display Pill */}
      <div className="w-full max-w-md flex items-center gap-2 p-2 pl-3.5 rounded-xl bg-surface-container border border-surface-container-highest text-left">
        <Icon name="link" className="text-primary text-[18px] shrink-0" />
        <span className="text-xs text-on-surface-variant font-mono truncate flex-1 select-all">
          {url}
        </span>
        <button
          type="button"
          onClick={handleCopyLink}
          className="px-3 py-1.5 rounded-lg bg-surface-container-high hover:bg-surface-bright text-primary text-xs font-semibold transition-colors border border-surface-container-highest shrink-0"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        <button
          type="button"
          onClick={handleShare}
          className="w-full py-3 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md text-sm font-bold transition-all shadow-[0_0_20px_rgba(242,202,80,0.25)] flex items-center justify-center gap-2"
        >
          <Icon name="share" className="text-[18px]" />
          <span>{shared ? 'Shared!' : 'Share Invitation'}</span>
        </button>

        <button
          type="button"
          onClick={handleDownloadQr}
          className="w-full py-3 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface font-title-md text-sm font-semibold transition-colors border border-surface-container-highest flex items-center justify-center gap-2"
        >
          <Icon name="download" className="text-[18px] text-primary" />
          <span>Download QR</span>
        </button>
      </div>
    </div>
  );
};

export default QRCodeCard;
