import React from 'react';
import { BookingStatus } from '../../types/booking';

interface BookingStatusBadgeProps {
  status: BookingStatus;
  size?: 'sm' | 'md';
}

export const BookingStatusBadge: React.FC<BookingStatusBadgeProps> = ({ status, size = 'md' }) => {
  const isSm = size === 'sm';
  const paddingClass = isSm ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';

  switch (status) {
    case 'ACCEPTED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-semibold ${paddingClass}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Accepted</span>
        </span>
      );
    case 'REJECTED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-semibold ${paddingClass}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          <span>Rejected</span>
        </span>
      );
    case 'CANCELLED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-surface-container-highest border border-outline/30 text-on-surface-variant font-semibold ${paddingClass}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-on-surface-variant/70" />
          <span>Cancelled</span>
        </span>
      );
    case 'COMPLETED':
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-400 font-semibold ${paddingClass}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          <span>Completed</span>
        </span>
      );
    case 'PENDING':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold ${paddingClass}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>Pending</span>
        </span>
      );
  }
};

export default BookingStatusBadge;
