import React from 'react';
import { FilterStatus } from './BookingSummary';

interface BookingFiltersProps {
  activeFilter: FilterStatus;
  counts: Record<FilterStatus, number>;
  onFilterChange: (status: FilterStatus) => void;
}

const TABS: { key: FilterStatus; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: 'COMPLETED', label: 'Completed' },
];

export const BookingFilters: React.FC<BookingFiltersProps> = ({
  activeFilter,
  counts,
  onFilterChange,
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
      {TABS.map((tab) => {
        const isActive = activeFilter === tab.key;
        const count = counts[tab.key] || 0;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onFilterChange(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap flex items-center gap-2 flex-shrink-0 ${
              isActive
                ? 'bg-primary text-on-primary shadow-[0_0_15px_rgba(242,202,80,0.25)] font-bold'
                : 'bg-surface-container-high hover:bg-surface-bright text-on-surface-variant hover:text-on-surface border border-surface-container-highest/60'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                isActive
                  ? 'bg-on-primary/20 text-on-primary'
                  : 'bg-surface-container text-on-surface-variant'
              }`}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default BookingFilters;
