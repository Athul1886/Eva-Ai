import React from 'react';
import Icon from '../common/Icon';
import { BookingStatus } from '../../types/booking';

export type FilterStatus = 'ALL' | BookingStatus;

interface BookingSummaryProps {
  counts: Record<FilterStatus, number>;
  activeFilter: FilterStatus;
  onFilterChange: (status: FilterStatus) => void;
}

interface SummaryItemConfig {
  key: FilterStatus;
  label: string;
  icon: string;
  colorClass: string;
  activeClass: string;
}

const ITEMS: SummaryItemConfig[] = [
  {
    key: 'ALL',
    label: 'All Requests',
    icon: 'format_list_bulleted',
    colorClass: 'text-primary',
    activeClass: 'border-primary/60 bg-primary/10 shadow-[0_0_15px_rgba(242,202,80,0.15)]',
  },
  {
    key: 'PENDING',
    label: 'Pending',
    icon: 'hourglass_top',
    colorClass: 'text-amber-400',
    activeClass: 'border-amber-500/50 bg-amber-500/10 shadow-[0_0_15px_rgba(251,191,36,0.15)]',
  },
  {
    key: 'ACCEPTED',
    label: 'Accepted',
    icon: 'check_circle',
    colorClass: 'text-emerald-400',
    activeClass: 'border-emerald-500/50 bg-emerald-500/10 shadow-[0_0_15px_rgba(52,211,153,0.15)]',
  },
  {
    key: 'REJECTED',
    label: 'Rejected',
    icon: 'cancel',
    colorClass: 'text-rose-400',
    activeClass: 'border-rose-500/50 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.15)]',
  },
  {
    key: 'CANCELLED',
    label: 'Cancelled',
    icon: 'block',
    colorClass: 'text-on-surface-variant',
    activeClass: 'border-surface-variant bg-surface-container-high',
  },
  {
    key: 'COMPLETED',
    label: 'Completed',
    icon: 'task_alt',
    colorClass: 'text-sky-400',
    activeClass: 'border-sky-500/50 bg-sky-500/10 shadow-[0_0_15px_rgba(56,189,248,0.15)]',
  },
];

export const BookingSummary: React.FC<BookingSummaryProps> = ({
  counts,
  activeFilter,
  onFilterChange,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {ITEMS.map((item) => {
        const count = counts[item.key] || 0;
        const isActive = activeFilter === item.key;

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => onFilterChange(item.key)}
            className={`p-3.5 rounded-2xl border transition-all text-left flex flex-col justify-between space-y-2 group cursor-pointer ${
              isActive
                ? item.activeClass
                : 'bg-surface-container-high/60 border-surface-container-highest/60 hover:bg-surface-container hover:border-surface-container-highest'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider group-hover:text-on-surface transition-colors">
                {item.label}
              </span>
              <Icon
                name={item.icon}
                className={`text-[16px] ${isActive ? item.colorClass : 'text-on-surface-variant/60 group-hover:text-on-surface-variant'}`}
              />
            </div>

            <div className="flex items-baseline justify-between">
              <span className={`text-2xl font-bold font-headline-sm ${isActive ? item.colorClass : 'text-on-surface'}`}>
                {count}
              </span>
              {isActive && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Active
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default BookingSummary;
