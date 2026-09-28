import React, { useState } from 'react';
import Icon from '../common/Icon';

interface BookingPreviewModalProps {
  isOpen: boolean;
  totalCost: number;
  itemCount: number;
  onClose: () => void;
}

export const BookingPreviewModal: React.FC<BookingPreviewModalProps> = ({
  isOpen,
  totalCost,
  itemCount,
  onClose,
}) => {
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    setConfirmed(true);
    setTimeout(() => {
      setConfirmed(false);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-surface-container-lowest/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg rounded-3xl bg-surface-container p-8 shadow-2xl text-center">
        <button
          type="button"
          aria-label="Close modal"
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
          onClick={onClose}
        >
          <Icon name="close" className="text-[20px]" />
        </button>

        <div className="w-16 h-16 rounded-full bg-primary/20 text-primary mx-auto flex items-center justify-center mb-4">
          <Icon name="shield" className="text-[36px]" />
        </div>
        <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary">
          Sovereign Booking Preview
        </span>
        <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mt-1">
          Hold Dates with Escrow Security
        </h3>
        <p className="font-body-md text-body-md text-on-surface-variant my-3">
          Your dynamic package allocation has been compiled. Providers are notified in priority order without instant upfront debit.
        </p>

        <div className="p-4 rounded-xl bg-surface-container-high my-5 text-left space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Event City:</span>
            <span className="text-on-surface font-semibold">Palakkad, Kerala</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Estimated Guests:</span>
            <span className="text-on-surface font-semibold">250 Pax</span>
          </div>
          <div className="flex justify-between">
            <span className="text-on-surface-variant">Selected Providers:</span>
            <span className="text-on-surface font-semibold">{itemCount} Verified Teams</span>
          </div>
          <div className="flex justify-between text-primary font-bold pt-2 border-t border-surface-container/60">
            <span className="text-on-surface">Escrow Allocation:</span>
            <span>₹{totalCost.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {confirmed ? (
          <div className="p-4 rounded-xl bg-primary/20 border border-primary/30 text-primary text-sm font-semibold">
            ✨ Congratulations! Your concierge brief has been registered. An event director will confirm provider calendar locks within 2 hours.
          </div>
        ) : (
          <button
            type="button"
            className="w-full py-4 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md text-title-md font-bold transition-all shadow-lg"
            onClick={handleConfirm}
          >
            Confirm Concierge Escrow Brief
          </button>
        )}
      </div>
    </div>
  );
};

export default BookingPreviewModal;
