import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Icon from '../components/common/Icon';
import { Provider, ProviderPackage, SelectedServiceItem } from '../types/service';
import { ProviderAccount } from '../types/provider';
import { EventPlanData, extractEventData, formatIndianRupees } from '../types/event';
import { Booking } from '../types/booking';
import {
  isProviderAvailable,
  getDisplayProvider,
  fetchAndCacheProviderAvailability,
  fetchAndCacheProviderDetails,
  normalizeProviderCategory,
} from '../utils/providerAuth';
import { eventsApi, getStoredAccessToken } from '../api/api';

export const ProviderDetailsPage: React.FC = () => {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();

  const [provider, setProvider] = useState<Provider | null>(null);
  const [account, setAccount] = useState<ProviderAccount | null>(null);
  const [selectedPackage, setSelectedPackage] = useState<ProviderPackage | null>(null);
  const [selectedGalleryImageUrl, setSelectedGalleryImageUrl] = useState<string | null>(null);
  const [selectedServices, setSelectedServices] = useState<SelectedServiceItem[]>([]);
  const [eventPlan, setEventPlan] = useState<EventPlanData | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isContactUnlocked, setIsContactUnlocked] = useState<boolean>(false);
  const [, setAvailabilityVersion] = useState<number>(0);

  // Reset selected gallery image and package when navigating between different providers
  useEffect(() => {
    setSelectedGalleryImageUrl(null);
    setSelectedPackage(null);
  }, [providerId]);

  // Synchronize package selection when provider packages load
  useEffect(() => {
    if (provider?.packages && provider.packages.length === 1) {
      setSelectedPackage(provider.packages[0]);
    } else if (provider?.packages && provider.packages.length > 1) {
      setSelectedPackage((prev) => {
        if (!prev) return null;
        const exists = provider.packages.find((p) => p.name === prev.name);
        return exists || null;
      });
    } else {
      setSelectedPackage(null);
    }
  }, [provider]);

  // Load provider & local storage data
  useEffect(() => {
    let isMounted = true;

    const reloadProvider = () => {
      if (providerId) {
        const disp = getDisplayProvider(providerId);
        if (disp && isMounted) {
          setProvider(disp.provider);
          setAccount(disp.account);
        } else if (isMounted) {
          setProvider(null);
          setAccount(null);
        }

        // Authoritative backend fetch
        fetchAndCacheProviderDetails(providerId).then((fresh) => {
          if (fresh && isMounted) {
            setProvider(fresh.provider);
            setAccount(fresh.account);
          }
        });
      }
    };

    reloadProvider();

    // 1. Load selected services from localStorage
    const loadSelectedServices = () => {
      try {
        const selectedJson = localStorage.getItem('eva_ai_selected_services');
        if (selectedJson && isMounted) {
          const parsed = JSON.parse(selectedJson);
          if (Array.isArray(parsed)) {
            setSelectedServices(parsed);
          }
        }
      } catch (e) {
        console.warn('Failed to parse eva_ai_selected_services:', e);
      }
    };

    loadSelectedServices();

    // 2. Authoritative Event Plan Resolution
    const syncActiveEvent = async () => {
      let resolvedEvent: EventPlanData | null = null;
      try {
        const eventJson = localStorage.getItem('eva_ai_event');
        if (eventJson) {
          resolvedEvent = extractEventData(JSON.parse(eventJson));
          if (resolvedEvent && isMounted) {
            setEventPlan(resolvedEvent);
          }
        }
      } catch (e) {
        console.warn('Failed to parse eva_ai_event:', e);
      }

      // If no valid event ID found in localStorage and customer has auth token, rehydrate from backend
      const token = getStoredAccessToken();
      if ((!resolvedEvent || !resolvedEvent.id) && token) {
        try {
          const listRes = await eventsApi.getAll();
          const rawData: any = listRes?.data;
          const rawList =
            rawData?.events ||
            (Array.isArray(rawData) ? rawData : null) ||
            (listRes as any)?.events ||
            (Array.isArray(listRes) ? listRes : []);
          const eventsList = Array.isArray(rawList) ? rawList : [];

          if (eventsList.length > 0) {
            const latest = eventsList[eventsList.length - 1];
            const backendEvent = extractEventData({ data: latest });
            if (backendEvent?.id && isMounted) {
              setEventPlan(backendEvent);
              localStorage.setItem('eva_ai_event', JSON.stringify(backendEvent));
            }
          }
        } catch (apiErr) {
          console.warn('Failed to rehydrate active customer event in provider details:', apiErr);
        }
      }
    };

    syncActiveEvent();

    // Check if an accepted booking exists for this provider in localStorage: eva_ai_bookings
    const checkContactUnlocked = () => {
      try {
        const bookingsJson = localStorage.getItem('eva_ai_bookings');
        if (bookingsJson && isMounted) {
          const parsed = JSON.parse(bookingsJson);
          if (Array.isArray(parsed)) {
            const hasAccepted = parsed.some(
              (b: Booking) =>
                b.providerId === providerId &&
                (b.status === 'ACCEPTED' || b.status === 'COMPLETED')
            );
            setIsContactUnlocked(hasAccepted);
          } else {
            setIsContactUnlocked(false);
          }
        } else if (isMounted) {
          setIsContactUnlocked(false);
        }
      } catch (e) {
        console.warn('Failed to parse eva_ai_bookings:', e);
      }
    };

    checkContactUnlocked();

    // Listen for live availability, profile updates, and booking updates
    const handleAvailabilityUpdate = () => {
      try {
        const eventJson = localStorage.getItem('eva_ai_event');
        if (eventJson) {
          const parsed = extractEventData(JSON.parse(eventJson));
          if (parsed && isMounted) {
            setEventPlan(parsed);
          }
        }
      } catch (e) {
        console.warn('Failed to parse eva_ai_event:', e);
      }
      if (isMounted) {
        setAvailabilityVersion((v) => v + 1);
      }
      reloadProvider();
      if (providerId) {
        fetchAndCacheProviderAvailability(providerId)
          .then(() => {
            if (isMounted) {
              setAvailabilityVersion((v) => v + 1);
            }
          })
          .catch(() => {});
      }
    };

    const handleServicesUpdated = () => {
      loadSelectedServices();
    };

    if (providerId) {
      fetchAndCacheProviderAvailability(providerId)
        .then(() => {
          if (isMounted) {
            setAvailabilityVersion((v) => v + 1);
          }
        })
        .catch(() => {});
    }

    window.addEventListener('eva_ai_availability_updated', handleAvailabilityUpdate);
    window.addEventListener('eva_ai_provider_availability_updated', handleAvailabilityUpdate);
    window.addEventListener('eva_ai_provider_profile_updated', reloadProvider);
    window.addEventListener('eva_ai_bookings_updated', checkContactUnlocked);
    window.addEventListener('eva_ai_selected_services_updated', handleServicesUpdated);
    window.addEventListener('storage', handleAvailabilityUpdate);

    return () => {
      isMounted = false;
      window.removeEventListener('eva_ai_availability_updated', handleAvailabilityUpdate);
      window.removeEventListener('eva_ai_provider_availability_updated', handleAvailabilityUpdate);
      window.removeEventListener('eva_ai_provider_profile_updated', reloadProvider);
      window.removeEventListener('eva_ai_bookings_updated', checkContactUnlocked);
      window.removeEventListener('eva_ai_selected_services_updated', handleServicesUpdated);
      window.removeEventListener('storage', handleAvailabilityUpdate);
    };
  }, [providerId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const isAdded = selectedServices.some((s) => s.providerId === provider?.id);
  const isAvailable = isProviderAvailable(provider?.id || '', eventPlan?.eventDate);
  const [isAdding, setIsAdding] = useState<boolean>(false);

  const handleAddToEvent = async () => {
    if (!provider) return;

    if (!isAvailable) {
      showToast(`This provider is unavailable on your event date.`);
      return;
    }

    if (isAdded) {
      showToast(`${provider.name} is already in your event plan.`);
      return;
    }

    // If provider offers package tiers, require selecting one
    if (provider.packages && provider.packages.length > 0 && !selectedPackage) {
      showToast('Please select a service package to continue.');
      return;
    }

    if (isAdding) return;
    setIsAdding(true);

    try {
      const token = getStoredAccessToken();
      if (!token) {
        showToast('Please log in to add services to your event plan.');
        return;
      }

      // Ensure we have a valid real backend event UUID
      let activeEventId = eventPlan?.id;
      if (!activeEventId) {
        try {
          const listRes = await eventsApi.getAll();
          const rawData: any = listRes?.data;
          const rawList =
            rawData?.events ||
            (Array.isArray(rawData) ? rawData : null) ||
            (listRes as any)?.events ||
            (Array.isArray(listRes) ? listRes : []);
          const eventsList = Array.isArray(rawList) ? rawList : [];

          if (eventsList.length > 0) {
            const latest = eventsList[eventsList.length - 1];
            const backendEvent = extractEventData({ data: latest });
            if (backendEvent?.id) {
              setEventPlan(backendEvent);
              localStorage.setItem('eva_ai_event', JSON.stringify(backendEvent));
              activeEventId = backendEvent.id;
            }
          }
        } catch (err) {
          console.warn('Failed to resolve active event ID on add:', err);
        }
      }

      if (!activeEventId) {
        showToast('Please open your event plan and try again.');
        return;
      }

      const chosenPrice = selectedPackage ? selectedPackage.price : provider.startingPrice;
      const chosenName = selectedPackage ? selectedPackage.name : undefined;

      const isValidUuid = (val?: any): boolean => {
        if (!val || typeof val !== 'string') return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
      };

      const addPayload: Record<string, any> = {
        providerId: provider.id,
        providerName: provider.name,
        category: provider.category,
        location: provider.location,
        startingPrice: chosenPrice,
        price: chosenPrice,
        imageUrl: provider.images[0],
      };

      // Only include candidate serviceId if it is a strictly valid UUID
      const candidateServiceId =
        (selectedPackage && isValidUuid((selectedPackage as any).serviceId) ? (selectedPackage as any).serviceId : undefined) ||
        (selectedPackage && isValidUuid(selectedPackage.id) ? selectedPackage.id : undefined) ||
        ((provider as any)?.serviceId && isValidUuid((provider as any).serviceId) ? (provider as any).serviceId : undefined);

      if (candidateServiceId) {
        addPayload.serviceId = candidateServiceId;
      }

      if (selectedPackage) {
        addPayload.packageDetails = selectedPackage;
        addPayload.notes = `Package: ${selectedPackage.name}`;
        if (selectedPackage.name) {
          addPayload.packageName = selectedPackage.name;
        }
      }

      let backendCartItemId: string | undefined = undefined;
      let backendResolvedServiceId: string | undefined = candidateServiceId;

      try {
        const res = await eventsApi.addService(activeEventId, addPayload);
        backendCartItemId =
          res?.data?.id ||
          res?.service?.id ||
          res?.data?.cartItemId ||
          (res as any)?.cartItemId ||
          (res as any)?.id;

        const resolvedIdFromBackend =
          res?.data?.serviceId ||
          res?.service?.serviceId ||
          res?.data?.service_id ||
          res?.service?.service_id;

        if (isValidUuid(resolvedIdFromBackend)) {
          backendResolvedServiceId = resolvedIdFromBackend;
        }
      } catch (apiErr: any) {
        console.error('Backend addService error in provider details:', apiErr);
        const errMessage =
          apiErr?.message ||
          apiErr?.responseBody?.message ||
          'Failed to add service to your event plan. Please try again.';
        showToast(errMessage);
        return;
      }

      const newItem: SelectedServiceItem = {
        cartItemId: backendCartItemId,
        serviceId: backendResolvedServiceId,
        providerId: provider.id,
        providerName: provider.name,
        packageName: chosenName,
        category: provider.category,
        location: provider.location,
        startingPrice: chosenPrice,
        price: chosenPrice,
        selectedAt: new Date().toISOString(),
        imageUrl: provider.images[0],
        packageDetails: selectedPackage || undefined,
        notes: selectedPackage ? `Package: ${selectedPackage.name}` : undefined,
      };

      const updated = [...selectedServices, newItem];
      setSelectedServices(updated);

      try {
        localStorage.setItem('eva_ai_selected_services', JSON.stringify(updated));
        window.dispatchEvent(new Event('eva_ai_selected_services_updated'));
        showToast(
          selectedPackage
            ? `Added ${provider.name} (${selectedPackage.name}) to your event plan ✓`
            : `Added ${provider.name} to your event plan ✓`
        );
      } catch (e) {
        console.warn('Failed to save to localStorage:', e);
      }
    } finally {
      setIsAdding(false);
    }
  };

  const formatEventDate = (dateStr?: string) => {
    if (!dateStr) return 'Target Date';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Graceful "Provider Not Found" state
  if (!provider) {
    return (
      <div className="bg-surface min-h-screen text-on-surface flex flex-col items-center justify-center p-6 text-center space-y-5">
        <div className="w-20 h-20 rounded-3xl bg-surface-container-high border border-surface-container-highest flex items-center justify-center text-primary shadow-[0_0_30px_rgba(242,202,80,0.15)]">
          <Icon name="person_off" className="text-[36px]" />
        </div>
        <div className="space-y-2 max-w-md">
          <h1 className="font-headline-sm text-2xl font-bold text-on-surface">
            Provider Not Found
          </h1>
          <p className="text-sm text-on-surface-variant">
            The service provider you are looking for does not exist or may have been updated.
          </p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/customer/services')}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-bold text-sm transition-all shadow-[0_0_20px_rgba(242,202,80,0.25)]"
          >
            <Icon name="arrow_back" className="text-[18px]" />
            <span>Back to Services</span>
          </button>
          <Link
            to="/customer/dashboard"
            className="px-5 py-3 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface text-sm font-semibold border border-surface-container-highest transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const galleryImages = Array.isArray(provider.images)
    ? provider.images.filter((img): img is string => typeof img === 'string' && img.trim().length > 0)
    : [];
  const activeImageUrl =
    selectedGalleryImageUrl && galleryImages.includes(selectedGalleryImageUrl)
      ? selectedGalleryImageUrl
      : (galleryImages[0] || '');

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-5 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-surface-container-high/95 backdrop-blur-xl border border-primary/40 text-on-surface text-sm font-semibold shadow-[0_10px_30px_rgba(0,0,0,0.6)] animate-bounce-short">
          <Icon name="check_circle" className="text-primary text-[20px]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 pt-28 pb-28 relative overflow-hidden">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-20 right-10 w-[600px] h-[400px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[500px] h-[400px] bg-secondary-container/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin relative z-10 space-y-10">
          {/* Breadcrumb row */}
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Link to="/customer/dashboard" className="hover:text-primary transition-colors">
              Dashboard
            </Link>
            <span>&bull;</span>
            <Link to="/customer/services" className="hover:text-primary transition-colors">
              Services
            </Link>
            <span>&bull;</span>
            <span className="text-primary font-semibold">{provider.name}</span>
          </div>

          {/* Hero Section: Gallery & Provider Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Image Gallery (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
                  {/* Main Feature Image */}
                  <div className="relative h-[340px] sm:h-[460px] w-full rounded-3xl overflow-hidden bg-surface-container border border-surface-container-highest/60 shadow-2xl flex items-center justify-center">
                    {activeImageUrl ? (
                      <img
                        key={activeImageUrl}
                        src={activeImageUrl}
                        alt={`${provider.name} profile preview`}
                        className="w-full h-full object-cover object-center transition-all duration-300"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-on-surface-variant/40 space-y-2 p-6 text-center">
                        <Icon name="storefront" className="text-5xl" />
                        <span className="text-xs font-medium">No Image Uploaded</span>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high/90 via-transparent to-transparent pointer-events-none" />

                    {/* Category & Location Badges */}
                    <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                      <span className="px-3.5 py-1.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-primary font-bold text-xs uppercase tracking-wider border border-primary/30 shadow-lg">
                        {provider.category}
                      </span>
                      {provider.location && (
                        <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-on-surface font-semibold text-xs border border-surface-container-highest/60 shadow-lg">
                          <Icon name="location_on" className="text-primary text-[14px]" />
                          <span>{provider.location}</span>
                        </span>
                      )}
                    </div>

                    {/* Experience Badge */}
                    <div className="absolute bottom-4 left-4 flex items-center gap-2">
                      <span className="px-3 py-1 rounded-xl bg-surface-container-lowest/90 backdrop-blur-md text-xs font-semibold text-on-surface border border-surface-container-highest/60">
                        {provider.yearsExperience} {provider.yearsExperience === 1 ? 'Year' : 'Years'} Experience
                      </span>
                      {account?.approvalStatus === 'APPROVED' && (
                        <span className="px-3 py-1 rounded-xl bg-emerald-500/20 backdrop-blur-md text-xs font-bold text-emerald-400 border border-emerald-500/30">
                          Verified Partner
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Thumbnail Selector */}
                  {galleryImages.length > 1 && (
                    <div className="flex items-center gap-3 overflow-x-auto pb-2">
                      {galleryImages.map((img, idx) => {
                        const isSelected = img === activeImageUrl;
                        return (
                          <button
                            key={img || idx}
                            type="button"
                            onClick={() => setSelectedGalleryImageUrl(img)}
                            className={`relative w-24 h-18 sm:w-28 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 transition-all border-2 ${
                              isSelected
                                ? 'border-primary ring-2 ring-primary/40 scale-105'
                                : 'border-surface-container-highest/70 opacity-60 hover:opacity-100'
                            }`}
                            aria-label={`Select photo ${idx + 1}`}
                          >
                            <img
                              src={img}
                              alt={`Thumbnail ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right Column: Key Details & Booking Card (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
              {/* Core Profile Card */}
              <div className="rounded-3xl bg-surface-container-high/70 backdrop-blur-xl border border-surface-container-highest/70 p-6 sm:p-8 shadow-2xl space-y-6">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-primary">
                      <Icon name="star" className="text-[20px] text-primary fill-current" />
                      <span className="font-bold text-lg text-on-surface">
                        {provider.rating.toFixed(2)}
                      </span>
                      <span className="text-on-surface-variant text-xs">
                        ({provider.reviewCount} verified reviews)
                      </span>
                    </div>

                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                      !isAvailable
                        ? 'bg-error-container/50 text-error border-error/50'
                        : provider.available
                        ? 'text-primary bg-primary/10 border-primary/30'
                        : 'text-on-surface-variant bg-surface-container border-surface-container-highest/60'
                    }`}>
                      {!isAvailable ? 'Unavailable for Date' : provider.available ? 'Ready for Booking' : 'Limited Dates'}
                    </span>
                  </div>

                  <div className="space-y-1 mt-2">
                    <h1 className="font-headline-sm text-2xl sm:text-3xl font-bold text-on-surface">
                      {provider.name}
                    </h1>
                    {account?.fullName && account.businessName && account.fullName.trim().toLowerCase() !== account.businessName.trim().toLowerCase() && (
                      <p className="text-xs text-on-surface-variant flex items-center gap-1.5 pt-0.5 font-medium">
                        <Icon name="badge" className="text-[14px] text-primary" />
                        <span>Managed by <strong className="text-on-surface font-semibold">{account.fullName}</strong></span>
                      </p>
                    )}
                  </div>

                  <p className="text-xs sm:text-sm text-on-surface-variant mt-2 leading-relaxed">
                    {provider.description}
                  </p>
                </div>

                {/* Pricing Highlight Box */}
                <div className="p-4 rounded-2xl bg-surface-container-low border border-primary/25 space-y-1.5">
                  {selectedPackage ? (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] uppercase tracking-wider text-primary font-bold flex items-center gap-1">
                          <Icon name="sell" className="text-[14px]" />
                          <span>Selected: {selectedPackage.name}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold text-[10px] uppercase tracking-wider">
                          Package
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="font-headline-sm text-3xl font-bold text-primary">
                          {formatIndianRupees(selectedPackage.price)}
                        </span>
                        <span className="text-xs text-on-surface-variant">selected tier</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium block">
                        Starting Package Price
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="font-headline-sm text-3xl font-bold text-primary">
                          {provider.startingPrice > 0 ? formatIndianRupees(provider.startingPrice) : 'Contact for pricing'}
                        </span>
                        {provider.startingPrice > 0 && (
                          <span className="text-xs text-on-surface-variant">
                            {provider.packages && provider.packages.length > 0 ? 'from' : 'base package'}
                          </span>
                        )}
                      </div>
                      {provider.packages && provider.packages.length > 1 && (
                        <p className="text-[11px] text-primary/90 font-medium pt-0.5">
                          Select a package tier below to continue
                        </p>
                      )}
                    </>
                  )}
                  {provider.priceRange && (
                    <div className="text-xs text-on-surface-variant/80 pt-1">
                      Price Range: <span className="text-on-surface font-semibold">{provider.priceRange}</span>
                    </div>
                  )}
                </div>

                {/* Primary CTA: Add to Event Plan */}
                <div className="space-y-3 pt-1">
                  {!isAvailable ? (
                    <button
                      type="button"
                      disabled={true}
                      title="This provider is unavailable on your event date."
                      className="w-full py-4 rounded-2xl font-title-md text-sm sm:text-base font-bold bg-surface-container text-on-surface-variant/50 border border-surface-container-highest/60 cursor-not-allowed flex items-center justify-center gap-2 shadow-none"
                    >
                      <Icon name="block" className="text-[20px]" />
                      <span>Unavailable on Your Event Date</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAddToEvent}
                      disabled={isAdded || (provider.packages && provider.packages.length > 0 && !selectedPackage)}
                      className={`w-full py-4 rounded-2xl font-title-md text-sm sm:text-base font-bold transition-all flex items-center justify-center gap-2 ${
                        isAdded
                          ? 'bg-secondary-container/60 text-secondary border border-secondary-container cursor-default shadow-md'
                          : provider.packages && provider.packages.length > 0 && !selectedPackage
                          ? 'bg-surface-container text-on-surface-variant border border-surface-container-highest/80 hover:border-primary/50 cursor-pointer'
                          : 'bg-primary hover:bg-tertiary text-on-primary shadow-[0_0_25px_rgba(242,202,80,0.3)] hover:shadow-[0_0_35px_rgba(242,202,80,0.5)] active:scale-[0.98]'
                      }`}
                    >
                      {isAdded ? (
                        <>
                          <Icon name="check_circle" className="text-[20px]" />
                          <span>Added to Your Event Plan ✓</span>
                        </>
                      ) : provider.packages && provider.packages.length > 0 && !selectedPackage ? (
                        <>
                          <Icon name="touch_app" className="text-[20px]" />
                          <span>Select a Package to Continue</span>
                        </>
                      ) : (
                        <>
                          <Icon name="add_circle" className="text-[20px]" />
                          <span>
                            {selectedPackage
                              ? `Add ${selectedPackage.name} to Event Plan`
                              : 'Add to Event Plan'}
                          </span>
                        </>
                      )}
                    </button>
                  )}

                  <p className="text-[11px] text-center text-on-surface-variant/70 italic">
                    {!isAvailable
                      ? 'This provider cannot be added because they have marked your event date as unavailable.'
                      : provider.packages && provider.packages.length > 0 && !selectedPackage
                      ? 'Please select one of the curated package tiers below to continue.'
                      : 'Adding to your event plan preserves this provider for your budget estimate without immediate commitment.'}
                  </p>
                </div>

                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-surface-container-highest/60 text-xs">
                  <div className="p-3 rounded-xl bg-surface-container border border-surface-container-highest/40">
                    <span className="text-on-surface-variant block text-[10px] uppercase">Service Area</span>
                    <span className="text-on-surface font-semibold">{provider.location || 'Flexible Area'}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-container border border-surface-container-highest/40">
                    <span className="text-on-surface-variant block text-[10px] uppercase">Experience</span>
                    <span className="text-on-surface font-semibold">
                      {provider.yearsExperience === 0 ? '0 Years Experience' : `${provider.yearsExperience} ${provider.yearsExperience === 1 ? 'Year' : 'Years'} Verified`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Availability Section */}
              <div className="rounded-3xl bg-surface-container-high/50 backdrop-blur-xl border border-surface-container-highest/60 p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-title-md text-sm font-semibold text-on-surface flex items-center gap-2">
                    <Icon name={!isAvailable ? 'event_busy' : 'event_available'} className="text-primary text-[18px]" />
                    <span>Schedule &amp; Availability</span>
                  </h3>
                  {!isAvailable ? (
                    <span className="text-[10px] uppercase font-bold text-error px-2.5 py-0.5 rounded-full bg-error-container/50 border border-error/40 flex items-center gap-1">
                      <Icon name="event_busy" className="text-[12px]" />
                      <span>Unavailable</span>
                    </span>
                  ) : eventPlan?.eventDate ? (
                    <span className="text-[10px] uppercase font-bold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-1">
                      <Icon name="check" className="text-[12px]" />
                      <span>Confirmed Available</span>
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-bold text-on-surface-variant px-2.5 py-0.5 rounded-full bg-surface-container border border-surface-container-highest/60">
                      Date Not Set
                    </span>
                  )}
                </div>

                {!isAvailable ? (
                  <div className="p-3.5 rounded-xl bg-error-container/20 border border-error/40 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-error-container/40 text-error flex items-center justify-center flex-shrink-0">
                      <Icon name="event_busy" className="text-[18px]" />
                    </div>
                    <div className="text-xs">
                      <span className="text-error font-semibold block">
                        Marked Unavailable for Your Target Date
                      </span>
                      <span className="text-on-surface-variant">
                        {formatEventDate(eventPlan?.eventDate)} &bull; {eventPlan?.eventType || 'Celebration'}
                      </span>
                    </div>
                  </div>
                ) : eventPlan?.eventDate ? (
                  <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-highest/50 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                      <Icon name="check" className="text-[18px]" />
                    </div>
                    <div className="text-xs">
                      <span className="text-on-surface font-semibold block">
                        Confirmed Available for Your Target Date
                      </span>
                      <span className="text-on-surface-variant">
                        {formatEventDate(eventPlan.eventDate)} &bull; {eventPlan.eventType || 'Celebration'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-highest/50 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-surface-container text-on-surface-variant flex items-center justify-center flex-shrink-0">
                      <Icon name="calendar_today" className="text-[18px]" />
                    </div>
                    <div className="text-xs">
                      <span className="text-on-surface font-semibold block">
                        Set your event date in the planner
                      </span>
                      <span className="text-on-surface-variant">
                        Timeline date needed to check live date availability.
                      </span>
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-on-surface-variant/70 leading-relaxed italic">
                  {!isAvailable
                    ? 'This provider has blocked this date on their schedule. You can still explore their work, or choose another available partner.'
                    : 'Availability reflects real-time blackout dates managed directly by the provider.'}
                </p>
              </div>
            </div>
          </div>

          {/* Detailed Specifications & Packages Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 8 Columns: About, Services, Packages, Reviews */}
            <div className="lg:col-span-8 space-y-8">
              {/* About Provider */}
              <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 p-6 sm:p-8 space-y-4">
                <h2 className="font-headline-sm text-xl font-bold text-on-surface flex items-center gap-2.5">
                  <Icon name="storefront" className="text-primary text-[22px]" />
                  <span>About {provider.name}</span>
                </h2>
                <p className="text-sm sm:text-base text-on-surface leading-relaxed whitespace-pre-line">
                  {provider.about}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {provider.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-xl bg-surface-container text-xs font-semibold text-on-surface border border-surface-container-highest/60"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Services Offered */}
              <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 p-6 sm:p-8 space-y-4">
                <h2 className="font-headline-sm text-xl font-bold text-on-surface flex items-center gap-2.5">
                  <Icon name="checklist" className="text-primary text-[22px]" />
                  <span>Services & Capabilities</span>
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {provider.services.map((srv) => (
                    <div
                      key={srv}
                      className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-highest/50 flex items-center gap-3"
                    >
                      <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary flex items-center justify-center flex-shrink-0">
                        <Icon name="check" className="text-[16px]" />
                      </div>
                      <span className="text-xs sm:text-sm text-on-surface font-medium">{srv}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category-Specific Craft Specializations */}
              {(() => {
                const normCat = normalizeProviderCategory(provider.category);
                const catLower = (provider.category || '').toLowerCase();
                const categoryData = account?.categoryData || {};
                const isPhoto = normCat === 'Photographer' || catLower.includes('photo');
                const isVenue = normCat === 'Venue / Auditorium' || catLower.includes('venue') || catLower.includes('auditorium');
                const isCaterer = normCat === 'Caterer' || catLower.includes('cater');
                const isMakeup = normCat === 'Makeup Artist' || catLower.includes('makeup');
                const isDecor = normCat === 'Decorator' || catLower.includes('decor');
                const isDJ = normCat === 'DJ / Entertainment' || catLower.includes('dj') || catLower.includes('entertain') || catLower.includes('music');
                const isEventManager = normCat === 'Event Manager' || (catLower.includes('event') && catLower.includes('manage'));

                const hasContent =
                  (isPhoto && ((categoryData.photographyStyles && categoryData.photographyStyles.length > 0) || categoryData.equipment?.trim())) ||
                  (isVenue && (categoryData.capacity || categoryData.roomsCount || categoryData.hasAC !== undefined || categoryData.hasParking !== undefined || categoryData.hasStage !== undefined || categoryData.hasDining !== undefined || categoryData.otherFacilities?.trim())) ||
                  (isCaterer && ((categoryData.cuisineTypes && categoryData.cuisineTypes.length > 0) || categoryData.pricePerPerson || categoryData.minGuests || categoryData.maxGuests)) ||
                  (isMakeup && categoryData.makeupTypes && categoryData.makeupTypes.length > 0) ||
                  (isDecor && ((categoryData.decorStyles && categoryData.decorStyles.length > 0) || categoryData.previousExperience?.trim())) ||
                  (isDJ && ((categoryData.entertainmentTypes && categoryData.entertainmentTypes.length > 0) || categoryData.djEquipment?.trim() || categoryData.equipment?.trim())) ||
                  (isEventManager && ((categoryData.eventTypesHandled && categoryData.eventTypesHandled.length > 0) || categoryData.previousExperience?.trim()));

                if (!hasContent) return null;

                return (
                  <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 p-6 sm:p-8 space-y-5">
                    <div className="flex items-center justify-between border-b border-surface-container pb-3">
                      <h2 className="font-headline-sm text-xl font-bold text-on-surface flex items-center gap-2.5">
                        <Icon name="tune" className="text-primary text-[22px]" />
                        <span>Craft Specializations ({provider.category})</span>
                      </h2>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-primary px-3 py-1 rounded-full bg-primary/10 border border-primary/30">
                        Category Specifications
                      </span>
                    </div>

                    {/* 1. Photographer Specifics */}
                    {isPhoto && (
                      <div className="space-y-4 text-xs">
                        {categoryData.photographyStyles && categoryData.photographyStyles.length > 0 && (
                          <div>
                            <span className="text-on-surface-variant font-semibold block mb-2 uppercase tracking-wider text-[11px]">
                              Photography Styles &amp; Aesthetic:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {categoryData.photographyStyles.map((style, i) => (
                                <span
                                  key={i}
                                  className="px-3 py-1.5 rounded-xl bg-surface-container-low text-primary border border-primary/20 font-medium"
                                >
                                  {style}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {categoryData.equipment && categoryData.equipment.trim() && (
                          <div>
                            <span className="text-on-surface-variant font-semibold block mb-1 uppercase tracking-wider text-[11px]">
                              Equipment Rigs &amp; Cinema Cameras:
                            </span>
                            <p className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-highest/50 text-on-surface leading-relaxed">
                              {categoryData.equipment}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 2. Venue / Auditorium Specifics */}
                    {isVenue && (
                      <div className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {categoryData.capacity && (
                            <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-highest/50">
                              <span className="text-on-surface-variant block text-[10px] uppercase">Seating Capacity</span>
                              <span className="font-bold text-on-surface text-sm">{categoryData.capacity} Guests</span>
                            </div>
                          )}
                          {categoryData.roomsCount && (
                            <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-highest/50">
                              <span className="text-on-surface-variant block text-[10px] uppercase">Bridal / Guest Rooms</span>
                              <span className="font-bold text-on-surface text-sm">{categoryData.roomsCount} Rooms</span>
                            </div>
                          )}
                          {categoryData.hasAC !== undefined && (
                            <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-highest/50">
                              <span className="text-on-surface-variant block text-[10px] uppercase">Air Conditioning</span>
                              <span className={`font-bold ${categoryData.hasAC ? 'text-emerald-400' : 'text-on-surface-variant'}`}>
                                {categoryData.hasAC ? 'Fully Air Conditioned' : 'Natural Ventilation'}
                              </span>
                            </div>
                          )}
                          {categoryData.hasParking !== undefined && (
                            <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-highest/50">
                              <span className="text-on-surface-variant block text-[10px] uppercase">Dedicated Parking</span>
                              <span className={`font-bold ${categoryData.hasParking ? 'text-emerald-400' : 'text-on-surface-variant'}`}>
                                {categoryData.hasParking ? 'Valet & Parking Available' : 'Street Parking'}
                              </span>
                            </div>
                          )}
                          {categoryData.hasStage !== undefined && (
                            <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-highest/50">
                              <span className="text-on-surface-variant block text-[10px] uppercase">Event Stage</span>
                              <span className={`font-bold ${categoryData.hasStage ? 'text-emerald-400' : 'text-on-surface-variant'}`}>
                                {categoryData.hasStage ? 'Raised Ceremonial Stage' : 'No Stage'}
                              </span>
                            </div>
                          )}
                          {categoryData.hasDining !== undefined && (
                            <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-highest/50">
                              <span className="text-on-surface-variant block text-[10px] uppercase">Banquet Dining</span>
                              <span className={`font-bold ${categoryData.hasDining ? 'text-emerald-400' : 'text-on-surface-variant'}`}>
                                {categoryData.hasDining ? 'Dining Hall Included' : 'No Dining Hall'}
                              </span>
                            </div>
                          )}
                        </div>
                        {categoryData.otherFacilities && categoryData.otherFacilities.trim() && (
                          <div>
                            <span className="text-on-surface-variant font-semibold block mb-1 uppercase tracking-wider text-[11px]">
                              Additional Amenities:
                            </span>
                            <p className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-highest/50 text-on-surface leading-relaxed">
                              {categoryData.otherFacilities}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 3. Caterer Specifics */}
                    {isCaterer && (
                      <div className="space-y-4 text-xs">
                        {categoryData.cuisineTypes && categoryData.cuisineTypes.length > 0 && (
                          <div>
                            <span className="text-on-surface-variant font-semibold block mb-2 uppercase tracking-wider text-[11px]">
                              Cuisines &amp; Menus Offered:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {categoryData.cuisineTypes.map((c, i) => (
                                <span
                                  key={i}
                                  className="px-3 py-1.5 rounded-xl bg-surface-container-low text-primary border border-primary/20 font-medium"
                                >
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {categoryData.pricePerPerson && (
                            <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-highest/50">
                              <span className="text-on-surface-variant block text-[10px] uppercase">Price / Plate</span>
                              <span className="font-bold text-primary text-sm">₹{categoryData.pricePerPerson}</span>
                            </div>
                          )}
                          {categoryData.minGuests && (
                            <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-highest/50">
                              <span className="text-on-surface-variant block text-[10px] uppercase">Min Guests</span>
                              <span className="font-bold text-on-surface text-sm">{categoryData.minGuests}</span>
                            </div>
                          )}
                          {categoryData.maxGuests && (
                            <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-highest/50">
                              <span className="text-on-surface-variant block text-[10px] uppercase">Max Guests</span>
                              <span className="font-bold text-on-surface text-sm">{categoryData.maxGuests}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 4. Makeup Artist Specifics */}
                    {isMakeup && categoryData.makeupTypes && categoryData.makeupTypes.length > 0 && (
                      <div className="space-y-2 text-xs">
                        <span className="text-on-surface-variant font-semibold block uppercase tracking-wider text-[11px]">
                          Makeup &amp; Bespoke Styling Types:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {categoryData.makeupTypes.map((m, i) => (
                            <span
                              key={i}
                              className="px-3 py-1.5 rounded-xl bg-surface-container-low text-primary border border-primary/20 font-medium"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 5. Decorator Specifics */}
                    {isDecor && (
                      <div className="space-y-4 text-xs">
                        {categoryData.decorStyles && categoryData.decorStyles.length > 0 && (
                          <div>
                            <span className="text-on-surface-variant font-semibold block mb-2 uppercase tracking-wider text-[11px]">
                              Scenography &amp; Decor Themes:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {categoryData.decorStyles.map((d, i) => (
                                <span
                                  key={i}
                                  className="px-3 py-1.5 rounded-xl bg-surface-container-low text-primary border border-primary/20 font-medium"
                                >
                                  {d}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {categoryData.previousExperience && categoryData.previousExperience.trim() && (
                          <div>
                            <span className="text-on-surface-variant font-semibold block mb-1 uppercase tracking-wider text-[11px]">
                              Theme Portfolios &amp; Materials:
                            </span>
                            <p className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-highest/50 text-on-surface leading-relaxed">
                              {categoryData.previousExperience}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 6. DJ & Entertainment Specifics */}
                    {isDJ && (
                      <div className="space-y-4 text-xs">
                        {categoryData.entertainmentTypes && categoryData.entertainmentTypes.length > 0 && (
                          <div>
                            <span className="text-on-surface-variant font-semibold block mb-2 uppercase tracking-wider text-[11px]">
                              Entertainment Acts &amp; Ensembles:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {categoryData.entertainmentTypes.map((e, i) => (
                                <span
                                  key={i}
                                  className="px-3 py-1.5 rounded-xl bg-surface-container-low text-primary border border-primary/20 font-medium"
                                >
                                  {e}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {(categoryData.djEquipment || categoryData.equipment) && (
                          <div>
                            <span className="text-on-surface-variant font-semibold block mb-1 uppercase tracking-wider text-[11px]">
                              Acoustic &amp; Lighting Gear:
                            </span>
                            <p className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-highest/50 text-on-surface leading-relaxed">
                              {categoryData.djEquipment || categoryData.equipment}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 7. Event Manager Specifics */}
                    {isEventManager && (
                      <div className="space-y-4 text-xs">
                        {categoryData.eventTypesHandled && categoryData.eventTypesHandled.length > 0 && (
                          <div>
                            <span className="text-on-surface-variant font-semibold block mb-2 uppercase tracking-wider text-[11px]">
                              Event Types Managed:
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {categoryData.eventTypesHandled.map((et, i) => (
                                <span
                                  key={i}
                                  className="px-3 py-1.5 rounded-xl bg-surface-container-low text-primary border border-primary/20 font-medium"
                                >
                                  {et}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {categoryData.previousExperience && categoryData.previousExperience.trim() && (
                          <div>
                            <span className="text-on-surface-variant font-semibold block mb-1 uppercase tracking-wider text-[11px]">
                              Experience &amp; Coordination Scope:
                            </span>
                            <p className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-highest/50 text-on-surface leading-relaxed">
                              {categoryData.previousExperience}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Pricing Packages */}
              <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 p-6 sm:p-8 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="font-headline-sm text-xl font-bold text-on-surface flex items-center gap-2.5">
                      <Icon name="sell" className="text-primary text-[22px]" />
                      <span>Curated Service Packages</span>
                    </h2>
                    <p className="text-xs text-on-surface-variant mt-1">
                      Transparent package breakdowns with itemized inclusions
                    </p>
                  </div>
                  {provider.packages && provider.packages.length > 1 && (
                    <span className="text-[11px] text-primary bg-primary/10 px-3 py-1 rounded-full font-medium border border-primary/25 self-start sm:self-auto">
                      Select 1 package to proceed
                    </span>
                  )}
                </div>

                {provider.packages && provider.packages.length > 0 ? (
                  <div className="space-y-4">
                    {provider.packages.map((pkg) => {
                      const isPkgSelected = selectedPackage?.name === pkg.name;
                      return (
                        <div
                          key={pkg.name}
                          onClick={() => setSelectedPackage(pkg)}
                          className={`p-5 rounded-2xl transition-all cursor-pointer space-y-3 border-2 ${
                            isPkgSelected
                              ? 'bg-surface-container-low border-primary ring-2 ring-primary/30 shadow-lg'
                              : 'bg-surface-container-low/70 border-surface-container-highest/60 hover:border-primary/50'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-surface-container-highest/50 pb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-title-lg text-base font-bold text-on-surface">
                                  {pkg.name}
                                </h3>
                                {isPkgSelected && (
                                  <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold text-[10px] uppercase tracking-wider border border-primary/40">
                                    Selected
                                  </span>
                                )}
                              </div>
                              {pkg.description && (
                                <p className="text-xs text-on-surface-variant mt-0.5">
                                  {pkg.description}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2">
                              <span className="font-headline-sm text-xl font-bold text-primary">
                                {formatIndianRupees(pkg.price)}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPackage(pkg);
                                }}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                                  isPkgSelected
                                    ? 'bg-primary text-on-primary shadow-sm'
                                    : 'bg-surface-container hover:bg-surface-bright text-on-surface border border-surface-container-highest/70'
                                }`}
                              >
                                <Icon name={isPkgSelected ? 'check_circle' : 'radio_button_unchecked'} className="text-[14px]" />
                                <span>{isPkgSelected ? 'Selected ✓' : 'Select Package'}</span>
                              </button>
                            </div>
                          </div>

                          {pkg.features && pkg.features.length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-on-surface pt-1">
                              {pkg.features.map((feat) => (
                                <div key={feat} className="flex items-center gap-2">
                                  <Icon name="check_circle" className="text-primary text-[14px] flex-shrink-0" />
                                  <span>{feat}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl bg-surface-container-low/50 border border-surface-container-highest/40 text-center space-y-2">
                    <p className="text-sm font-semibold text-on-surface">Custom Quotation &amp; Packages</p>
                    <p className="text-xs text-on-surface-variant">
                      {provider.startingPrice > 0
                        ? `Base services starting from ${formatIndianRupees(provider.startingPrice)}. Custom package tier details available upon consultation.`
                        : 'Tailored event packages and quotes available directly upon consultation.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Customer Reviews Section */}
              {provider.reviews && provider.reviews.length > 0 && (
                <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 p-6 sm:p-8 space-y-5">
                  <h2 className="font-headline-sm text-xl font-bold text-on-surface flex items-center gap-2.5">
                    <Icon name="rate_review" className="text-primary text-[22px]" />
                    <span>Client Testimonials</span>
                  </h2>

                  <div className="space-y-4">
                    {provider.reviews.map((rev) => (
                      <div
                        key={rev.author}
                        className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-highest/40 space-y-2"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-on-surface">{rev.author}</span>
                          <span className="text-on-surface-variant text-[11px]">{rev.date}</span>
                        </div>
                        <div className="flex items-center gap-1 text-primary">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Icon
                              key={i}
                              name="star"
                              className="text-[14px] text-primary fill-current"
                            />
                          ))}
                        </div>
                        <p className="text-xs sm:text-sm text-on-surface-variant italic">
                          &quot;{rev.comment}&quot;
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right 4 Columns: Demo Contact & Security Guarantee */}
            <div className="lg:col-span-4 space-y-6">
              {/* Contact Information (Controlled by booking acceptance status) */}
              <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-title-md text-base font-semibold text-on-surface flex items-center gap-2">
                    <Icon name="contact_phone" className="text-primary text-[18px]" />
                    <span>Contact Provider</span>
                  </h3>
                  {isContactUnlocked ? (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                      Booking Accepted
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant px-2.5 py-0.5 rounded-full bg-surface-container border border-surface-container-highest/60 flex items-center gap-1">
                      <Icon name="lock" className="text-[12px]" />
                      <span>Protected</span>
                    </span>
                  )}
                </div>

                <div className="space-y-3 text-xs">
                  {isContactUnlocked ? (
                    <>
                      {/* Unlocked Contact Details */}
                      <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-highest/50 space-y-1">
                        <span className="text-[10px] uppercase text-on-surface-variant font-medium">
                          Representative
                        </span>
                        <div className="text-on-surface font-semibold">{provider.contactDemo.manager}</div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-surface-container-low border border-primary/40 space-y-1 shadow-[0_0_12px_rgba(242,202,80,0.1)]">
                        <span className="text-[10px] uppercase text-on-surface-variant font-semibold flex items-center gap-1.5">
                          <span>📞</span>
                          <span>Provider Phone Number</span>
                        </span>
                        <div className="text-primary font-bold text-sm">{provider.contactDemo.phone}</div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-surface-container-low border border-primary/40 space-y-1 shadow-[0_0_12px_rgba(242,202,80,0.1)]">
                        <span className="text-[10px] uppercase text-on-surface-variant font-semibold flex items-center gap-1.5">
                          <span>✉️</span>
                          <span>Provider Email</span>
                        </span>
                        <div className="text-on-surface font-semibold">{provider.contactDemo.email}</div>
                      </div>
                    </>
                  ) : (
                    /* Locked Contact Notice */
                    <div className="p-4 rounded-2xl bg-surface-container-low border border-primary/25 space-y-2 text-center">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
                        <Icon name="lock" className="text-[20px]" />
                      </div>
                      <div className="text-xs sm:text-sm font-semibold text-on-surface">
                        🔒 Contact details available after booking confirmation.
                      </div>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">
                        Once the provider accepts your booking request, their contact details will become available here.
                      </p>
                    </div>
                  )}

                  {/* Public Studio Address */}
                  <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-highest/50 space-y-1">
                    <span className="text-[10px] uppercase text-on-surface-variant font-medium">
                      Studio Address
                    </span>
                    <div className="text-on-surface font-medium">{provider.contactDemo.address}</div>
                  </div>

                  {/* Public Consultation Hours */}
                  <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container-highest/50 space-y-1">
                    <span className="text-[10px] uppercase text-on-surface-variant font-medium">
                      Consultation Hours
                    </span>
                    <div className="text-on-surface font-medium">{provider.contactDemo.hours}</div>
                  </div>
                </div>
              </div>

              {/* Eva-Ai Marketplace Guarantee */}
              <div className="rounded-3xl bg-gradient-to-b from-primary/10 to-surface-container-high/60 backdrop-blur-xl border border-primary/25 p-6 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                  <Icon name="verified_user" className="text-[20px]" />
                </div>
                <h4 className="font-title-md text-sm font-bold text-on-surface">
                  Eva-Ai Verified Standard
                </h4>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Every vendor on Eva-Ai undergoes identity verification, past event portfolio audits, and service level agreements.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProviderDetailsPage;
