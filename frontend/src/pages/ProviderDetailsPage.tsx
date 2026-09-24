import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import Icon from '../components/common/Icon';
import { MOCK_PROVIDERS } from '../data/mockProviders';
import { Provider, SelectedServiceItem } from '../types/service';
import { EventPlanData, formatIndianRupees } from '../types/event';
import { Booking } from '../types/booking';

export const ProviderDetailsPage: React.FC = () => {
  const { providerId } = useParams<{ providerId: string }>();
  const navigate = useNavigate();

  const [provider, setProvider] = useState<Provider | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [selectedServices, setSelectedServices] = useState<SelectedServiceItem[]>([]);
  const [eventPlan, setEventPlan] = useState<EventPlanData | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isContactUnlocked, setIsContactUnlocked] = useState<boolean>(false);

  // Load provider & local storage data
  useEffect(() => {
    const found = MOCK_PROVIDERS.find((p) => p.id === providerId);
    setProvider(found || null);

    try {
      const selectedJson = localStorage.getItem('eva_ai_selected_services');
      if (selectedJson) {
        setSelectedServices(JSON.parse(selectedJson));
      }
    } catch (e) {
      console.warn('Failed to parse eva_ai_selected_services:', e);
    }

    try {
      const eventJson = localStorage.getItem('eva_ai_event');
      if (eventJson) {
        setEventPlan(JSON.parse(eventJson));
      }
    } catch (e) {
      console.warn('Failed to parse eva_ai_event:', e);
    }

    // Check if an accepted booking exists for this provider in localStorage: eva_ai_bookings
    try {
      const bookingsJson = localStorage.getItem('eva_ai_bookings');
      if (bookingsJson) {
        const parsed = JSON.parse(bookingsJson);
        if (Array.isArray(parsed)) {
          const hasAccepted = parsed.some(
            (b: Booking) => b.providerId === providerId && b.status === 'ACCEPTED'
          );
          setIsContactUnlocked(hasAccepted);
        } else {
          setIsContactUnlocked(false);
        }
      } else {
        setIsContactUnlocked(false);
      }
    } catch (e) {
      console.warn('Failed to parse eva_ai_bookings:', e);
      setIsContactUnlocked(false);
    }
  }, [providerId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const isAdded = selectedServices.some((s) => s.providerId === provider?.id);

  const handleAddToEvent = () => {
    if (!provider) return;

    if (isAdded) {
      showToast(`${provider.name} is already in your event plan.`);
      return;
    }

    const newItem: SelectedServiceItem = {
      providerId: provider.id,
      providerName: provider.name,
      category: provider.category,
      location: provider.location,
      startingPrice: provider.startingPrice,
      selectedAt: new Date().toISOString(),
      imageUrl: provider.images[0],
    };

    const updated = [...selectedServices, newItem];
    setSelectedServices(updated);

    try {
      localStorage.setItem('eva_ai_selected_services', JSON.stringify(updated));
      showToast(`Added ${provider.name} to your event plan ✓`);
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
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

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-24 right-5 z-50 flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-surface-container-high/95 backdrop-blur-xl border border-primary/40 text-on-surface text-sm font-semibold shadow-[0_10px_30px_rgba(0,0,0,0.6)] animate-bounce-short">
          <Icon name="check_circle" className="text-primary text-[20px]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header / Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-surface/80 backdrop-blur-2xl transition-all border-b border-surface-container/60 shadow-lg">
        <div className="h-20 max-w-[1440px] mx-auto px-margin-mobile md:px-margin flex items-center justify-between">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link className="flex items-center gap-space-sm group" to="/">
              <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center shadow-[inset_0_1px_1px_rgba(242,202,80,0.3)] transition-transform group-hover:scale-105">
                <Icon name="auto_awesome" className="text-primary text-[20px]" />
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-headline-sm font-semibold tracking-wider text-primary uppercase">
                  EVA-AI
                </span>
                <span className="font-label-sm text-label-sm uppercase text-on-surface-variant -mt-1 tracking-widest">
                  Marketplace
                </span>
              </div>
            </Link>

            <span className="text-surface-container-highest">/</span>

            {/* Back to Services link */}
            <Link
              to="/customer/services"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-on-surface-variant hover:text-primary transition-colors py-1.5 px-3 rounded-xl bg-surface-container/60 hover:bg-surface-container border border-surface-container-highest/60"
            >
              <Icon name="arrow_back" className="text-[16px]" />
              <span>Back to Services</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/customer/bookings"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-on-surface hover:text-primary px-3 py-1.5 rounded-xl bg-surface-container/70 border border-surface-container-highest/60 transition-colors"
            >
              <Icon name="receipt_long" className="text-[16px] text-primary" />
              <span>My Bookings</span>
            </Link>

            <Link
              to="/customer/dashboard"
              className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-on-surface hover:text-primary px-3 py-1.5 rounded-xl bg-surface-container/70 border border-surface-container-highest/60 transition-colors"
            >
              <Icon name="dashboard" className="text-[16px]" />
              <span className="hidden sm:inline">Customer Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

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
              <div className="relative h-[340px] sm:h-[460px] w-full rounded-3xl overflow-hidden bg-surface-container border border-surface-container-highest/60 shadow-2xl">
                <img
                  src={provider.images[activeImageIndex] || provider.images[0]}
                  alt={`${provider.name} portfolio preview`}
                  className="w-full h-full object-cover object-center transition-all duration-500"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-surface-container-high/90 via-transparent to-transparent pointer-events-none" />

                {/* Category & Location Badges */}
                <div className="absolute top-4 left-4 flex flex-wrap items-center gap-2">
                  <span className="px-3.5 py-1.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-primary font-bold text-xs uppercase tracking-wider border border-primary/30 shadow-lg">
                    {provider.category}
                  </span>
                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-on-surface font-semibold text-xs border border-surface-container-highest/60 shadow-lg">
                    <Icon name="location_on" className="text-primary text-[14px]" />
                    <span>{provider.location}, Kerala</span>
                  </span>
                </div>

                {/* Experience Badge */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-surface-container-lowest/90 backdrop-blur-md text-xs font-semibold text-on-surface border border-surface-container-highest/60">
                    {provider.yearsExperience} Years Industry Experience
                  </span>
                  <span className="px-3 py-1 rounded-xl bg-primary/20 backdrop-blur-md text-xs font-bold text-primary border border-primary/30">
                    Verified Partner (Demo)
                  </span>
                </div>
              </div>

              {/* Thumbnail Selector */}
              {provider.images.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {provider.images.map((img, idx) => (
                    <button
                      key={img}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-24 h-18 sm:w-28 sm:h-20 rounded-xl overflow-hidden flex-shrink-0 transition-all border-2 ${
                        activeImageIndex === idx
                          ? 'border-primary ring-2 ring-primary/40 scale-105'
                          : 'border-surface-container-highest/70 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
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

                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/30">
                      {provider.available ? 'Ready for Booking' : 'Limited Dates'}
                    </span>
                  </div>

                  <h1 className="font-headline-sm text-2xl sm:text-3xl font-bold text-on-surface mt-2">
                    {provider.name}
                  </h1>

                  <p className="text-xs sm:text-sm text-on-surface-variant mt-2 leading-relaxed">
                    {provider.description}
                  </p>
                </div>

                {/* Pricing Highlight Box */}
                <div className="p-4 rounded-2xl bg-surface-container-low border border-primary/25 space-y-1">
                  <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium block">
                    Starting Package Price
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-headline-sm text-3xl font-bold text-primary">
                      {formatIndianRupees(provider.startingPrice)}
                    </span>
                    <span className="text-xs text-on-surface-variant">base package</span>
                  </div>
                  <div className="text-xs text-on-surface-variant/80 pt-1">
                    Price Range: <span className="text-on-surface font-semibold">{provider.priceRange}</span>
                  </div>
                </div>

                {/* Primary CTA: Add to Event Plan */}
                <div className="space-y-3 pt-1">
                  <button
                    type="button"
                    onClick={handleAddToEvent}
                    disabled={isAdded}
                    className={`w-full py-4 rounded-2xl font-title-md text-sm sm:text-base font-bold transition-all flex items-center justify-center gap-2 ${
                      isAdded
                        ? 'bg-secondary-container/60 text-secondary border border-secondary-container cursor-default shadow-md'
                        : 'bg-primary hover:bg-tertiary text-on-primary shadow-[0_0_25px_rgba(242,202,80,0.3)] hover:shadow-[0_0_35px_rgba(242,202,80,0.5)] active:scale-[0.98]'
                    }`}
                  >
                    {isAdded ? (
                      <>
                        <Icon name="check_circle" className="text-[20px]" />
                        <span>Added to Your Event Plan ✓</span>
                      </>
                    ) : (
                      <>
                        <Icon name="add_circle" className="text-[20px]" />
                        <span>Add to Event Plan</span>
                      </>
                    )}
                  </button>

                  <p className="text-[11px] text-center text-on-surface-variant/70 italic">
                    Adding to your event plan preserves this provider for your budget estimate without immediate commitment.
                  </p>
                </div>

                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-surface-container-highest/60 text-xs">
                  <div className="p-3 rounded-xl bg-surface-container border border-surface-container-highest/40">
                    <span className="text-on-surface-variant block text-[10px] uppercase">Service Area</span>
                    <span className="text-on-surface font-semibold">{provider.location} & Region</span>
                  </div>
                  <div className="p-3 rounded-xl bg-surface-container border border-surface-container-highest/40">
                    <span className="text-on-surface-variant block text-[10px] uppercase">Experience</span>
                    <span className="text-on-surface font-semibold">{provider.yearsExperience}+ Years Verified</span>
                  </div>
                </div>
              </div>

              {/* Availability Section (Demo / UI only) */}
              <div className="rounded-3xl bg-surface-container-high/50 backdrop-blur-xl border border-surface-container-highest/60 p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-title-md text-sm font-semibold text-on-surface flex items-center gap-2">
                    <Icon name="event_available" className="text-primary text-[18px]" />
                    <span>Availability Status (Demo)</span>
                  </h3>
                  <span className="text-[10px] uppercase font-bold text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/25">
                    Live Check
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-container-low border border-surface-container-highest/50 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                    <Icon name="check" className="text-[18px]" />
                  </div>
                  <div className="text-xs">
                    <span className="text-on-surface font-semibold block">
                      Confirmed Available for Your Target Date
                    </span>
                    <span className="text-on-surface-variant">
                      {formatEventDate(eventPlan?.eventDate)} &bull; {eventPlan?.eventType || 'Celebration'}
                    </span>
                  </div>
                </div>

                <p className="text-[11px] text-on-surface-variant/70 leading-relaxed italic">
                  Availability status is simulated based on your event blueprint date. Official reservation locking occurs during the upcoming booking release.
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

              {/* Pricing Packages */}
              <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 p-6 sm:p-8 space-y-6">
                <div>
                  <h2 className="font-headline-sm text-xl font-bold text-on-surface flex items-center gap-2.5">
                    <Icon name="sell" className="text-primary text-[22px]" />
                    <span>Curated Service Packages</span>
                  </h2>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Transparent package breakdowns with itemized inclusions
                  </p>
                </div>

                <div className="space-y-4">
                  {provider.packages.map((pkg) => (
                    <div
                      key={pkg.name}
                      className="p-5 rounded-2xl bg-surface-container-low/90 border border-primary/20 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-container-highest/50 pb-3">
                        <div>
                          <h3 className="font-title-lg text-base font-bold text-on-surface">
                            {pkg.name}
                          </h3>
                          <p className="text-xs text-on-surface-variant mt-0.5">
                            {pkg.description}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <span className="font-headline-sm text-xl font-bold text-primary">
                            {formatIndianRupees(pkg.price)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-on-surface pt-1">
                        {pkg.features.map((feat) => (
                          <div key={feat} className="flex items-center gap-2">
                            <Icon name="check_circle" className="text-primary text-[14px] flex-shrink-0" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
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

                <p className="text-[11px] text-on-surface-variant/70 leading-relaxed italic border-t border-surface-container-highest/50 pt-2">
                  Notice: All provider names, contacts, and addresses presented are mock demonstrations for the Eva-Ai prototype.
                </p>
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
