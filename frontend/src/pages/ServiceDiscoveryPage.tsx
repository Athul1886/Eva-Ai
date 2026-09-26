import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/common/Icon';
import EventSummaryCard from '../components/services/EventSummaryCard';
import ServiceCategoryCard from '../components/services/ServiceCategoryCard';
import ProviderFilters from '../components/services/ProviderFilters';
import ProviderCard from '../components/services/ProviderCard';
import EventPlanSummary from '../components/services/EventPlanSummary';
import EvaAiAssistant from '../components/services/EvaAiAssistant';
import { PRICE_RANGES, SERVICE_CATEGORIES } from '../data/mockProviders';
import { EventPlanData } from '../types/event';
import { CustomerProfileData } from './CustomerSignupPage';
import { Provider, SelectedServiceItem, ServiceFilterState } from '../types/service';
import { isProviderAvailable, getAllDisplayProviders, fetchAndCacheAllProviders } from '../utils/providerAuth';
import { eventsApi, getStoredAccessToken } from '../api/api';

export const ServiceDiscoveryPage: React.FC = () => {
  // 1. Providers state (merging mock and live registered providers)
  const [allProviders, setAllProviders] = useState<Provider[]>(() => getAllDisplayProviders());

  // 2. Stored event & customer state from localStorage
  const [eventPlan, setEventPlan] = useState<EventPlanData | null>(null);
  const [customer, setCustomer] = useState<CustomerProfileData | null>(null);

  // 3. Selected services state from localStorage key: eva_ai_selected_services
  const [selectedServices, setSelectedServices] = useState<SelectedServiceItem[]>([]);
  const [isProcessingId, setIsProcessingId] = useState<string | null>(null);

  // 4. Toast feedback state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 5. Filtering and sorting state
  const [filters, setFilters] = useState<ServiceFilterState>({
    searchQuery: '',
    category: 'all',
    location: 'All Locations',
    priceRange: 'all',
    minRating: 0,
    sortBy: 'recommended',
  });

  // Load localStorage on mount and sync from backend
  useEffect(() => {
    try {
      const eventJson = localStorage.getItem('eva_ai_event');
      if (eventJson) {
        setEventPlan(JSON.parse(eventJson));
      }
    } catch (e) {
      console.warn('Failed to parse eva_ai_event from localStorage:', e);
    }

    try {
      const customerJson = localStorage.getItem('eva_ai_customer');
      if (customerJson) {
        setCustomer(JSON.parse(customerJson));
      }
    } catch (e) {
      console.warn('Failed to parse eva_ai_customer from localStorage:', e);
    }

    try {
      const selectedJson = localStorage.getItem('eva_ai_selected_services');
      if (selectedJson) {
        setSelectedServices(JSON.parse(selectedJson));
      }
    } catch (e) {
      console.warn('Failed to parse eva_ai_selected_services from localStorage:', e);
    }

    // Authoritative backend fetch on mount
    fetchAndCacheAllProviders().then((list) => {
      if (list && list.length > 0) {
        setAllProviders(list);
      }
    });

    // Listen for live availability changes, provider profile changes, or storage
    const handleUpdate = () => {
      try {
        const selectedJson = localStorage.getItem('eva_ai_selected_services');
        if (selectedJson) {
          setSelectedServices(JSON.parse(selectedJson));
        }
      } catch {}
      setAllProviders(getAllDisplayProviders());
      fetchAndCacheAllProviders().then((list) => {
        if (list && list.length > 0) {
          setAllProviders(list);
        }
      });
    };

    window.addEventListener('eva_ai_availability_updated', handleUpdate);
    window.addEventListener('eva_ai_provider_availability_updated', handleUpdate);
    window.addEventListener('eva_ai_provider_profile_updated', handleUpdate);
    window.addEventListener('eva_ai_selected_services_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('eva_ai_availability_updated', handleUpdate);
      window.removeEventListener('eva_ai_provider_availability_updated', handleUpdate);
      window.removeEventListener('eva_ai_provider_profile_updated', handleUpdate);
      window.removeEventListener('eva_ai_selected_services_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Save selected services back to localStorage whenever changed
  const saveSelectedServices = (items: SelectedServiceItem[]) => {
    setSelectedServices(items);
    try {
      localStorage.setItem('eva_ai_selected_services', JSON.stringify(items));
      window.dispatchEvent(new Event('eva_ai_selected_services_updated'));
    } catch (e) {
      console.warn('Failed to save eva_ai_selected_services to localStorage:', e);
    }
  };

  // Toast notification helper
  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Handle adding service to event plan (POST /events/:id/services)
  const handleAddToEvent = async (provider: Provider) => {
    // Availability check against customer's event date
    if (!isProviderAvailable(provider.id, eventPlan?.eventDate)) {
      showToast(`This provider is unavailable on your event date.`);
      return;
    }

    const isAlreadyAdded = selectedServices.some((s) => s.providerId === provider.id);
    if (isAlreadyAdded) {
      showToast(`${provider.name} is already in your event plan.`);
      return;
    }

    if (isProcessingId === provider.id) return;
    setIsProcessingId(provider.id);

    try {
      let backendCartItemId: string | undefined = undefined;
      const token = getStoredAccessToken();

      if (token && eventPlan?.id) {
        try {
          const res = await eventsApi.addService(eventPlan.id, {
            providerId: provider.id,
            providerName: provider.name,
            category: provider.category,
            location: provider.location,
            startingPrice: provider.startingPrice,
            imageUrl: provider.images[0],
          });
          backendCartItemId =
            res?.data?.cartItemId ||
            res?.data?.id ||
            res?.data?.serviceId ||
            (res as any)?.cartItemId ||
            (res as any)?.id;
        } catch (apiErr: any) {
          console.warn('Backend addService warning:', apiErr);
        }
      }

      const newItem: SelectedServiceItem = {
        cartItemId: backendCartItemId,
        providerId: provider.id,
        providerName: provider.name,
        category: provider.category,
        location: provider.location,
        startingPrice: provider.startingPrice,
        selectedAt: new Date().toISOString(),
        imageUrl: provider.images[0],
      };

      const updated = [...selectedServices, newItem];
      saveSelectedServices(updated);
      showToast(`Added ${provider.name} to your event plan ✓`);
    } finally {
      setIsProcessingId(null);
    }
  };

  // Handle removing service from event plan (DELETE /events/:id/services/:serviceId)
  const handleRemoveService = async (providerId: string) => {
    const itemToRemove = selectedServices.find((s) => s.providerId === providerId);
    const token = getStoredAccessToken();

    if (token && eventPlan?.id && itemToRemove) {
      const serviceIdentifier =
        itemToRemove.serviceId || itemToRemove.id || itemToRemove.cartItemId || providerId;
      try {
        await eventsApi.removeService(eventPlan.id, serviceIdentifier);
      } catch (apiErr: any) {
        console.warn('Backend removeService warning:', apiErr);
      }
    }

    const updated = selectedServices.filter((s) => s.providerId !== providerId);
    saveSelectedServices(updated);
    showToast('Removed service from your event plan.');
  };

  // Clear all services
  const handleClearAllServices = () => {
    saveSelectedServices([]);
    showToast('Event plan cleared.');
  };

  // Helper to update filter state
  const handleFilterChange = (newFilters: Partial<ServiceFilterState>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  // Reset all filters
  const handleResetFilters = () => {
    setFilters({
      searchQuery: '',
      category: 'all',
      location: 'All Locations',
      priceRange: 'all',
      minRating: 0,
      sortBy: 'recommended',
    });
  };

  // Calculate provider counts for each category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: allProviders.length,
    };
    SERVICE_CATEGORIES.forEach((cat) => {
      if (cat.filterKey !== 'all') {
        counts[cat.filterKey] = allProviders.filter(
          (p) => p.category.toLowerCase() === cat.filterKey.toLowerCase()
        ).length;
      }
    });
    return counts;
  }, [allProviders]);

  // Filter and sort providers
  const filteredProviders = useMemo(() => {
    return allProviders.filter((provider) => {
      // 1. Search Query Filter
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase();
        const matchesName = provider.name.toLowerCase().includes(query);
        const matchesCategory = provider.category.toLowerCase().includes(query);
        const matchesLocation = provider.location.toLowerCase().includes(query);
        const matchesDescription = provider.description.toLowerCase().includes(query);
        const matchesTag = provider.tags.some((t) => t.toLowerCase().includes(query));

        if (!matchesName && !matchesCategory && !matchesLocation && !matchesDescription && !matchesTag) {
          return false;
        }
      }

      // 2. Category Filter
      if (filters.category !== 'all') {
        if (provider.category.toLowerCase() !== filters.category.toLowerCase()) {
          return false;
        }
      }

      // 3. Location Filter
      if (filters.location !== 'All Locations') {
        if (provider.location.toLowerCase() !== filters.location.toLowerCase()) {
          return false;
        }
      }

      // 4. Price Range Filter
      if (filters.priceRange !== 'all') {
        const activeRange = PRICE_RANGES.find((r) => r.id === filters.priceRange);
        if (activeRange) {
          if (
            provider.startingPrice < activeRange.min ||
            provider.startingPrice > activeRange.max
          ) {
            return false;
          }
        }
      }

      // 5. Rating Filter
      if (filters.minRating > 0) {
        if (provider.rating < filters.minRating) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      // Sort handling
      if (filters.sortBy === 'price-asc') {
        return a.startingPrice - b.startingPrice;
      }
      if (filters.sortBy === 'price-desc') {
        return b.startingPrice - a.startingPrice;
      }
      if (filters.sortBy === 'rating') {
        return b.rating - a.rating;
      }
      // 'recommended' default: featured first, then rating
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return b.rating - a.rating;
    });
  }, [filters]);

  const selectedIdsSet = useMemo(() => {
    return new Set(selectedServices.map((s) => s.providerId));
  }, [selectedServices]);

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-5 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-surface-container-high/95 backdrop-blur-xl border border-primary/40 text-on-surface text-sm font-semibold shadow-[0_10px_30px_rgba(0,0,0,0.6)] animate-bounce-short">
          <Icon name="check_circle" className="text-primary text-[20px]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 pt-28 pb-32 relative overflow-hidden">
        {/* Subtle background glow spots */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[850px] h-[350px] bg-primary/8 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/2 right-[-100px] w-96 h-96 bg-secondary-container/10 rounded-full blur-[130px] pointer-events-none" />

        <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin relative z-10 space-y-10">
          {/* B. Page Heading */}
          <div className="space-y-3 pt-2">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary text-xs font-bold uppercase tracking-wider">
              <Icon name="explore" className="text-[15px]" />
              <span>Service Discovery</span>
            </div>

            <h1 className="font-headline-lg text-3xl sm:text-4xl md:text-5xl font-semibold text-on-surface tracking-tight">
              Find the Right Services for Your Event
            </h1>

            <p className="font-body-lg text-sm sm:text-base text-on-surface-variant max-w-2xl leading-relaxed">
              Explore trusted event professionals and build your perfect event plan. Compare verified credentials, transparent pricing, and add services directly to your event blueprint.
            </p>
          </div>

          {/* C. Event Summary Card (Reads localStorage: eva_ai_event) */}
          <EventSummaryCard eventPlan={eventPlan} />

          {/* E. Service Category Navigation Cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-xl sm:text-2xl font-semibold text-on-surface flex items-center gap-2">
                <Icon name="category" className="text-primary text-[22px]" />
                <span>Browse by Category</span>
              </h2>

              {filters.category !== 'all' && (
                <button
                  type="button"
                  onClick={() => handleFilterChange({ category: 'all' })}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <span>Show All Categories</span>
                  <Icon name="close" className="text-[14px]" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {SERVICE_CATEGORIES.map((cat) => (
                <ServiceCategoryCard
                  key={cat.id}
                  category={cat}
                  isSelected={filters.category.toLowerCase() === cat.filterKey.toLowerCase()}
                  providerCount={categoryCounts[cat.filterKey] || 0}
                  onSelect={(filterKey) => handleFilterChange({ category: filterKey })}
                />
              ))}
            </div>
          </div>

          {/* D & F. Search and Filter Controls */}
          <div className="space-y-6 pt-2">
            <ProviderFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onResetFilters={handleResetFilters}
              totalResults={filteredProviders.length}
            />

            {/* G. Provider Listing Grid */}
            {filteredProviders.length === 0 ? (
              <div className="p-12 rounded-3xl bg-surface-container-high/50 border border-surface-container-highest/60 text-center space-y-4 max-w-xl mx-auto my-8">
                <div className="w-16 h-16 rounded-2xl bg-surface-container-highest text-on-surface-variant mx-auto flex items-center justify-center">
                  <Icon name="search_off" className="text-[32px]" />
                </div>
                <h3 className="font-headline-sm text-xl font-bold text-on-surface">
                  No providers match your criteria
                </h3>
                <p className="text-sm text-on-surface-variant">
                  We couldn&apos;t find any service professionals matching your current search or filter combination.
                </p>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-bold text-sm transition-all shadow-[0_0_20px_rgba(242,202,80,0.25)]"
                  >
                    <Icon name="restart_alt" className="text-[18px]" />
                    <span>Clear All Filters</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 sm:gap-8">
                {filteredProviders.map((provider) => (
                  <ProviderCard
                    key={provider.id}
                    provider={provider}
                    isAdded={selectedIdsSet.has(provider.id)}
                    isAvailable={isProviderAvailable(provider.id, eventPlan?.eventDate)}
                    eventDate={eventPlan?.eventDate}
                    onAddToEvent={handleAddToEvent}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 4. Event Plan Summary Floating Widget (Bottom-Left) */}
      <EventPlanSummary
        selectedServices={selectedServices}
        eventBudget={eventPlan?.budget || 300000}
        onRemoveService={handleRemoveService}
        onClearAllServices={handleClearAllServices}
      />

      {/* 5. Floating Eva-Ai Chat Assistant (Bottom-Right) */}
      <EvaAiAssistant
        eventPlan={eventPlan}
        selectedServices={selectedServices}
        onSelectCategory={(cat) => handleFilterChange({ category: cat })}
      />
    </div>
  );
};

export default ServiceDiscoveryPage;
