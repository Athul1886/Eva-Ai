import React from 'react';
import Icon from '../common/Icon';
import { MOCK_LOCATIONS, PRICE_RANGES, SERVICE_CATEGORIES } from '../../data/mockProviders';
import { ServiceFilterState } from '../../types/service';

interface ProviderFiltersProps {
  filters: ServiceFilterState;
  onFilterChange: (newFilters: Partial<ServiceFilterState>) => void;
  onResetFilters: () => void;
  totalResults: number;
}

export const ProviderFilters: React.FC<ProviderFiltersProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  totalResults,
}) => {
  const isFiltered =
    filters.category !== 'all' ||
    filters.location !== 'All Locations' ||
    filters.priceRange !== 'all' ||
    filters.minRating > 0 ||
    filters.searchQuery.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* Search Input Bar */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-primary">
          <Icon name="search" className="text-[20px]" />
        </div>
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
          placeholder="Search services or providers by name, category, location, or keyword..."
          className="w-full pl-11 pr-10 py-3.5 rounded-xl bg-surface-container-high/70 border border-surface-container-highest/80 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-sm sm:text-base backdrop-blur-md shadow-inner transition-all"
        />
        {filters.searchQuery && (
          <button
            type="button"
            onClick={() => onFilterChange({ searchQuery: '' })}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-on-surface-variant hover:text-on-surface"
            title="Clear search"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        )}
      </div>

      {/* Filter & Sort Controls Row */}
      <div className="p-4 rounded-2xl bg-surface-container-high/40 backdrop-blur-md border border-surface-container-highest/50 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-surface-container/80 border border-surface-container-highest/80 rounded-xl px-3 py-2 text-xs sm:text-sm">
            <Icon name="category" className="text-primary text-[16px]" />
            <select
              value={filters.category}
              onChange={(e) => onFilterChange({ category: e.target.value })}
              className="bg-transparent text-on-surface focus:outline-none cursor-pointer pr-1"
              aria-label="Filter by Category"
            >
              {SERVICE_CATEGORIES.map((cat) => (
                <option
                  key={cat.id}
                  value={cat.filterKey}
                  className="bg-surface-container text-on-surface"
                >
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div className="flex items-center gap-1.5 bg-surface-container/80 border border-surface-container-highest/80 rounded-xl px-3 py-2 text-xs sm:text-sm">
            <Icon name="location_on" className="text-primary text-[16px]" />
            <select
              value={filters.location}
              onChange={(e) => onFilterChange({ location: e.target.value })}
              className="bg-transparent text-on-surface focus:outline-none cursor-pointer pr-1"
              aria-label="Filter by Location"
            >
              {MOCK_LOCATIONS.map((loc) => (
                <option key={loc} value={loc} className="bg-surface-container text-on-surface">
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Price Range Filter */}
          <div className="flex items-center gap-1.5 bg-surface-container/80 border border-surface-container-highest/80 rounded-xl px-3 py-2 text-xs sm:text-sm">
            <Icon name="payments" className="text-primary text-[16px]" />
            <select
              value={filters.priceRange}
              onChange={(e) => onFilterChange({ priceRange: e.target.value })}
              className="bg-transparent text-on-surface focus:outline-none cursor-pointer pr-1"
              aria-label="Filter by Price Range"
            >
              {PRICE_RANGES.map((rng) => (
                <option key={rng.id} value={rng.id} className="bg-surface-container text-on-surface">
                  {rng.label}
                </option>
              ))}
            </select>
          </div>

          {/* Rating Filter */}
          <div className="flex items-center gap-1.5 bg-surface-container/80 border border-surface-container-highest/80 rounded-xl px-3 py-2 text-xs sm:text-sm">
            <Icon name="star" className="text-primary text-[16px]" />
            <select
              value={filters.minRating}
              onChange={(e) => onFilterChange({ minRating: Number(e.target.value) })}
              className="bg-transparent text-on-surface focus:outline-none cursor-pointer pr-1"
              aria-label="Filter by Minimum Rating"
            >
              <option value={0} className="bg-surface-container text-on-surface">
                All Ratings
              </option>
              <option value={4.5} className="bg-surface-container text-on-surface">
                4.5+ Stars
              </option>
              <option value={4.8} className="bg-surface-container text-on-surface">
                4.8+ Stars
              </option>
              <option value={4.9} className="bg-surface-container text-on-surface">
                4.9+ Stars (Top Rated)
              </option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {isFiltered && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-surface-container hover:bg-surface-bright text-xs text-secondary hover:text-on-surface transition-colors border border-surface-container-highest/80"
              title="Reset all filters"
            >
              <Icon name="restart_alt" className="text-[14px]" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Right: Sort By & Results Count */}
        <div className="flex items-center gap-4 self-end sm:self-center">
          <div className="text-xs text-on-surface-variant font-medium hidden md:inline">
            <span className="text-primary font-bold">{totalResults}</span> providers available
          </div>

          <div className="flex items-center gap-1.5 bg-surface-container/80 border border-surface-container-highest/80 rounded-xl px-3 py-2 text-xs sm:text-sm">
            <Icon name="sort" className="text-primary text-[16px]" />
            <span className="text-on-surface-variant text-xs hidden sm:inline">Sort:</span>
            <select
              value={filters.sortBy}
              onChange={(e) =>
                onFilterChange({
                  sortBy: e.target.value as ServiceFilterState['sortBy'],
                })
              }
              className="bg-transparent text-on-surface focus:outline-none cursor-pointer font-medium"
              aria-label="Sort options"
            >
              <option value="recommended" className="bg-surface-container text-on-surface">
                Recommended
              </option>
              <option value="price-asc" className="bg-surface-container text-on-surface">
                Price: Low to High
              </option>
              <option value="price-desc" className="bg-surface-container text-on-surface">
                Price: High to Low
              </option>
              <option value="rating" className="bg-surface-container text-on-surface">
                Highest Rating
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProviderFilters;
