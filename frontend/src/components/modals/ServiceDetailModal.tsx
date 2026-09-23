import React, { useState } from 'react';
import Icon from '../common/Icon';

interface ServiceDetailModalProps {
  isOpen: boolean;
  service: {
    category: string;
    title: string;
    price: string;
    description: string;
  } | null;
  onClose: () => void;
  onIncludeInPlan?: () => void;
}

export const ServiceDetailModal: React.FC<ServiceDetailModalProps> = ({
  isOpen,
  service,
  onClose,
  onIncludeInPlan,
}) => {
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen || !service) return null;

  const handleInclude = () => {
    setFeedback('Item reserved into your package selection!');
    if (onIncludeInPlan) onIncludeInPlan();
    setTimeout(() => {
      setFeedback(null);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-surface-container-lowest/80 backdrop-blur-xl flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg rounded-3xl bg-surface-container p-8 shadow-2xl">
        <button
          type="button"
          aria-label="Close modal"
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
          onClick={onClose}
        >
          <Icon name="close" className="text-[20px]" />
        </button>

        <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary">
          {service.category}
        </span>
        <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold mt-1">
          {service.title}
        </h3>
        <div className="text-primary font-title-lg text-title-lg font-bold my-2">
          {service.price}
        </div>
        <p className="font-body-md text-body-md text-on-surface-variant my-4">
          {service.description}
        </p>

        {feedback && (
          <div className="mb-4 p-3 rounded-xl bg-primary/20 border border-primary/30 text-primary text-sm text-center">
            {feedback}
          </div>
        )}

        <div className="pt-4 flex gap-3">
          <button
            type="button"
            className="flex-1 py-3.5 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md text-title-md font-bold transition-all"
            onClick={handleInclude}
          >
            Include In My Plan
          </button>
          <button
            type="button"
            className="px-5 py-3.5 rounded-xl bg-surface-container-high text-on-surface font-title-md text-title-md"
            onClick={onClose}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetailModal;
