import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import Icon from '../components/common/Icon';
import { EventPlanData, formatIndianRupees } from '../types/event';
import { CustomerProfileData } from './CustomerSignupPage';

export const CustomerDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const [eventPlan, setEventPlan] = useState<EventPlanData | null>(null);
  const [customer, setCustomer] = useState<CustomerProfileData | null>(null);
  const [selectedServicesCount, setSelectedServicesCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Read saved event plan
    try {
      const eventJson = localStorage.getItem('eva_ai_event');
      if (eventJson) {
        setEventPlan(JSON.parse(eventJson));
      }
    } catch (e) {
      console.warn('Failed to parse eva_ai_event from localStorage:', e);
    }

    // Read saved customer profile
    try {
      const customerJson = localStorage.getItem('eva_ai_customer');
      if (customerJson) {
        setCustomer(JSON.parse(customerJson));
      }
    } catch (e) {
      console.warn('Failed to parse eva_ai_customer from localStorage:', e);
    }

    // Read saved selected services count
    try {
      const selectedJson = localStorage.getItem('eva_ai_selected_services');
      if (selectedJson) {
        const parsed = JSON.parse(selectedJson);
        if (Array.isArray(parsed)) {
          setSelectedServicesCount(parsed.length);
        }
      }
    } catch (e) {
      console.warn('Failed to parse eva_ai_selected_services from localStorage:', e);
    }

    setIsLoading(false);
  }, []);

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return 'Not set';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-surface min-h-screen flex items-center justify-center text-on-surface">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-surface font-body-md text-on-surface antialiased min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary">
      <Header />

      <main className="flex-1 pt-28 pb-20 relative overflow-hidden">
        {/* Ambient atmospheric glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute bottom-10 right-0 w-96 h-96 bg-secondary-container/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="max-w-4xl w-full mx-auto px-margin-mobile md:px-margin relative z-10">
          {/* Welcome Banner */}
          <div className="text-center mb-10 space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-primary/20 text-primary mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(242,202,80,0.3)]">
              <Icon name="check_circle" className="text-[36px]" />
            </div>

            <span className="font-label-sm uppercase tracking-widest text-primary font-bold">
              Customer Portal &bull; Planning Overview
            </span>

            <h1 className="font-headline-lg text-3xl sm:text-4xl text-on-surface font-semibold tracking-tight">
              Your event plan is ready.
            </h1>

            <p className="font-body-md text-on-surface-variant max-w-lg mx-auto text-sm sm:text-base">
              Your event blueprint has been generated and saved locally. Verified providers and AI matching will connect with these specifications.
            </p>
          </div>

          {/* If No Event Plan Found */}
          {!eventPlan ? (
            <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-xl p-8 sm:p-12 text-center border border-surface-container-highest/60 max-w-xl mx-auto space-y-4">
              <div className="w-12 h-12 rounded-xl bg-surface-container-highest text-on-surface-variant mx-auto flex items-center justify-center">
                <Icon name="event_busy" className="text-[28px]" />
              </div>
              <h2 className="font-headline-sm text-xl font-semibold text-on-surface">
                No active event plan found
              </h2>
              <p className="text-on-surface-variant text-sm">
                You haven&apos;t completed the event onboarding wizard yet. Let&apos;s get your event configured!
              </p>
              <div className="pt-2">
                <Link
                  to="/onboarding/event"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md font-bold transition-all shadow-[0_0_20px_rgba(242,202,80,0.25)]"
                >
                  <span>Start Event Onboarding</span>
                  <Icon name="arrow_forward" className="text-[18px]" />
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Host Profile Info Card (Preserved from eva_ai_customer) */}
              {customer && (
                <div className="rounded-2xl bg-surface-container-high/50 backdrop-blur-xl p-5 sm:p-6 border border-surface-container-highest/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/20 text-primary font-bold text-lg flex items-center justify-center border border-primary/30">
                      {customer.fullName ? customer.fullName.charAt(0).toUpperCase() : 'H'}
                    </div>
                    <div>
                      <span className="text-xs uppercase tracking-wider text-primary font-bold block">
                        Event Host
                      </span>
                      <h3 className="font-title-lg text-lg text-on-surface font-semibold">
                        {customer.fullName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant mt-0.5">
                        <span>{customer.email}</span>
                        <span>&bull;</span>
                        <span>{customer.phone}</span>
                        {customer.location && (
                          <>
                            <span>&bull;</span>
                            <span>{customer.location}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="self-end sm:self-center">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold">
                      <Icon name="verified_user" className="text-[14px]" />
                      <span>Profile Verified</span>
                    </span>
                  </div>
                </div>
              )}

              {/* Main Event Blueprint Card */}
              <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-xl p-6 sm:p-10 shadow-2xl border border-surface-container-highest/60 space-y-8">
                {/* Header within blueprint */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-surface-container-highest/60 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-bold uppercase tracking-wider">
                        {eventPlan.eventType || 'Custom Event'}
                      </span>
                      {eventPlan.createdAt && (
                        <span className="text-on-surface-variant/70 text-xs">
                          Created {new Date(eventPlan.createdAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <h2 className="font-headline-sm text-2xl text-on-surface font-semibold mt-2">
                      {eventPlan.eventType} Blueprint
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate('/onboarding/event')}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-bright text-primary font-title-md text-sm font-semibold transition-colors border border-surface-container-highest/80 self-start sm:self-auto"
                  >
                    <Icon name="edit" className="text-[16px]" />
                    <span>Edit Event Plan</span>
                  </button>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Date */}
                  <div className="p-4 rounded-2xl bg-surface-container-low/80 border border-surface-container-highest/50">
                    <div className="flex items-center gap-2 text-on-surface-variant text-xs mb-1">
                      <Icon name="calendar_today" className="text-[16px] text-primary" />
                      <span className="uppercase tracking-wider">Target Date</span>
                    </div>
                    <div className="text-on-surface font-semibold text-sm">
                      {formatDateDisplay(eventPlan.eventDate)}
                    </div>
                  </div>

                  {/* Location */}
                  <div className="p-4 rounded-2xl bg-surface-container-low/80 border border-surface-container-highest/50">
                    <div className="flex items-center gap-2 text-on-surface-variant text-xs mb-1">
                      <Icon name="location_on" className="text-[16px] text-primary" />
                      <span className="uppercase tracking-wider">Location</span>
                    </div>
                    <div className="text-on-surface font-semibold text-sm">
                      {eventPlan.location || 'Not set'}
                    </div>
                  </div>

                  {/* Guest Count */}
                  <div className="p-4 rounded-2xl bg-surface-container-low/80 border border-surface-container-highest/50">
                    <div className="flex items-center gap-2 text-on-surface-variant text-xs mb-1">
                      <Icon name="groups" className="text-[16px] text-primary" />
                      <span className="uppercase tracking-wider">Expected Scale</span>
                    </div>
                    <div className="text-on-surface font-semibold text-sm">
                      {eventPlan.guestCount ? `${eventPlan.guestCount} Guests` : 'Not set'}
                    </div>
                  </div>

                  {/* Budget */}
                  <div className="p-4 rounded-2xl bg-surface-container-low/80 border border-surface-container-highest/50">
                    <div className="flex items-center gap-2 text-on-surface-variant text-xs mb-1">
                      <Icon name="payments" className="text-[16px] text-primary" />
                      <span className="uppercase tracking-wider">Estimated Budget</span>
                    </div>
                    <div className="text-primary font-bold text-sm">
                      {eventPlan.budget ? formatIndianRupees(eventPlan.budget) : 'Not set'}
                    </div>
                  </div>
                </div>

                {/* Required Services */}
                <div className="space-y-3">
                  <h3 className="font-title-md text-base font-semibold text-on-surface flex items-center gap-2">
                    <Icon name="design_services" className="text-[18px] text-primary" />
                    <span>Requested Services ({eventPlan.services.length})</span>
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {eventPlan.services.map((srv) => (
                      <span
                        key={srv}
                        className="px-3 py-1.5 rounded-xl bg-surface-container text-on-surface text-xs font-medium border border-surface-container-highest/70 flex items-center gap-1.5"
                      >
                        <Icon name="check_circle" className="text-[14px] text-primary" />
                        {srv}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Style Preferences */}
                <div className="space-y-3">
                  <h3 className="font-title-md text-base font-semibold text-on-surface flex items-center gap-2">
                    <Icon name="auto_awesome" className="text-[18px] text-primary" />
                    <span>Atmosphere & Style Preferences</span>
                  </h3>
                  {eventPlan.preferences && eventPlan.preferences.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {eventPlan.preferences.map((p) => (
                        <span
                          key={p}
                          className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold border border-primary/30"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-on-surface-variant italic">
                      No specific aesthetic styles selected.
                    </p>
                  )}
                </div>

                {/* Additional Notes */}
                {eventPlan.additionalNotes && (
                  <div className="space-y-2 pt-2 border-t border-surface-container-highest/50">
                    <h3 className="font-title-md text-base font-semibold text-on-surface flex items-center gap-2">
                      <Icon name="notes" className="text-[18px] text-primary" />
                      <span>Host Notes & Custom Instructions</span>
                    </h3>
                    <div className="p-4 rounded-2xl bg-surface-container-low text-on-surface text-sm leading-relaxed border border-surface-container-highest/50 whitespace-pre-wrap">
                      {eventPlan.additionalNotes}
                    </div>
                  </div>
                )}

                {/* Next Steps Advisory & Explore Services Banner */}
                <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-surface-container to-surface-container border border-primary/30 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                      <Icon name="auto_awesome" className="text-[18px]" />
                      <span>Next Milestone: Service Discovery</span>
                    </div>
                    {selectedServicesCount > 0 ? (
                      <span className="text-xs uppercase tracking-wider text-primary font-bold px-2.5 py-0.5 rounded-full bg-primary/20 border border-primary/30">
                        {selectedServicesCount} {selectedServicesCount === 1 ? 'Service' : 'Services'} in Plan
                      </span>
                    ) : (
                      <span className="text-xs uppercase tracking-wider text-primary font-bold">
                        Recommended Next Step
                      </span>
                    )}
                  </div>
                  <p className="text-on-surface-variant text-xs sm:text-sm leading-relaxed">
                    Eva-Ai has prepared service recommendations matching your {formatIndianRupees(eventPlan.budget)} budget in {eventPlan.location}. Browse photography, venues, catering, makeup, decor, and entertainment professionals.
                  </p>
                  <div className="pt-1">
                    <Link
                      to="/customer/services"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md font-bold transition-all shadow-[0_0_20px_rgba(242,202,80,0.25)] hover:shadow-[0_0_28px_rgba(242,202,80,0.4)]"
                    >
                      <Icon name="explore" className="text-[20px]" />
                      <span>Explore Services</span>
                      <Icon name="arrow_forward" className="text-[18px]" />
                    </Link>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <Link
                    to="/"
                    className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface font-title-md font-medium transition-colors border border-surface-container-highest/60 flex items-center justify-center gap-2"
                  >
                    <Icon name="home" className="text-[18px]" />
                    <span>Return to Home</span>
                  </Link>

                  <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => navigate('/onboarding/event')}
                      className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface font-title-md font-medium transition-colors border border-surface-container-highest/60 flex items-center justify-center gap-2"
                    >
                      <Icon name="restart_alt" className="text-[18px]" />
                      <span>Plan Another Event</span>
                    </button>

                    <Link
                      to="/customer/services"
                      className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md font-bold transition-all shadow-[0_0_20px_rgba(242,202,80,0.25)] hover:shadow-[0_0_28px_rgba(242,202,80,0.4)] flex items-center justify-center gap-2"
                    >
                      <Icon name="explore" className="text-[18px]" />
                      <span>Explore Services</span>
                      <Icon name="arrow_forward" className="text-[18px]" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CustomerDashboardPage;
