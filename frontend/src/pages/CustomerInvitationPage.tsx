import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../components/common/Icon';
import InvitationCard from '../components/invitation/InvitationCard';
import QRCodeCard from '../components/invitation/QRCodeCard';
import { EventPlanData, extractEventData } from '../types/event';
import {
  InvitationData,
  InvitationTheme,
  CreateInvitationPayload,
  normalizeInvitationTheme,
} from '../types/invitation';
import { getCustomerSession } from '../utils/customerAuth';
import {
  invitationsApi,
  eventsApi,
  getStoredAccessToken,
  getPublicInvitationUrl,
  ApiError,
} from '../api/api';

export const CustomerInvitationPage: React.FC = () => {
  const navigate = useNavigate();

  // Active event state
  const [eventPlan, setEventPlan] = useState<EventPlanData | null>(() => {
    try {
      const customerSession = getCustomerSession();
      const custId = customerSession?.customerId || customerSession?.userId;
      const eventJson = localStorage.getItem('eva_ai_event');
      if (eventJson) {
        const parsed = JSON.parse(eventJson);
        const owner = parsed?.customerId || parsed?.userId;
        if (!custId || !owner || owner === custId) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return null;
  });

  // Invitation state
  const [invitation, setInvitation] = useState<InvitationData | null>(() => {
    try {
      const customerSession = getCustomerSession();
      const custId = customerSession?.customerId || customerSession?.userId;
      const invJson = localStorage.getItem('eva_ai_invitation');
      if (invJson) {
        const parsed = JSON.parse(invJson);
        const owner = parsed?.customerId || parsed?.userId;
        if (!custId || !owner || owner === custId) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotification, setSuccessNotification] = useState<string | null>(null);

  // Editable Form Fields
  const [coupleNames, setCoupleNames] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [eventTime, setEventTime] = useState<string>('6:00 PM onwards');
  const [venueName, setVenueName] = useState<string>('');
  const [venueAddress, setVenueAddress] = useState<string>('');
  const [theme, setTheme] = useState<InvitationTheme>('royal-gold');

  // Load authoritative event blueprint and invitation data
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      const customerSession = getCustomerSession();
      const custId = customerSession?.customerId || customerSession?.userId;
      const token = getStoredAccessToken();

      let activeEvent: EventPlanData | null = eventPlan;

      // 1. Fetch authoritative event from backend if token exists
      if (token) {
        try {
          if (activeEvent?.id) {
            try {
              const res = await eventsApi.getById(activeEvent.id);
              const data = extractEventData(res);
              if (data) {
                activeEvent = { ...activeEvent, ...data };
                if (isMounted) setEventPlan(activeEvent);
                localStorage.setItem('eva_ai_event', JSON.stringify(activeEvent));
              }
            } catch {
              // ignore single fetch error
            }
          }

          if (!activeEvent || !activeEvent.id) {
            const listRes = await eventsApi.getAll();
            const rawData: any = listRes?.data;
            const rawList =
              rawData?.events ||
              (Array.isArray(rawData) ? rawData : null) ||
              (listRes as any)?.events ||
              (Array.isArray(listRes) ? listRes : []);
            const eventsList = Array.isArray(rawList) ? rawList : [];

            if (eventsList.length > 0) {
              const matching = custId
                ? eventsList.filter((e: any) => {
                    const owner = e.customerId || e.userId || e.customer_id || e.user_id;
                    return !owner || owner === custId;
                  })
                : eventsList;
              if (matching.length > 0) {
                const latest = matching[matching.length - 1];
                activeEvent = extractEventData({ data: latest });
                if (isMounted) setEventPlan(activeEvent);
                localStorage.setItem('eva_ai_event', JSON.stringify(activeEvent));
              }
            }
          }
        } catch (err) {
          console.warn('Failed to load event for invitation:', err);
        }
      }

      // 2. If active event exists, try loading invitation from backend
      if (activeEvent?.id && token) {
        try {
          let invData: any = null;

          // Try fetching by getMy first
          try {
            const myRes = await invitationsApi.getMy();
            const list =
              myRes?.data?.invitations ||
              myRes?.data ||
              myRes?.invitations ||
              (Array.isArray(myRes) ? myRes : []);
            if (Array.isArray(list) && list.length > 0) {
              invData =
                list.find((i: any) => i.eventId === activeEvent?.id) ||
                list[list.length - 1];
            }
          } catch {}

          // Fallback: try fetching by event ID
          if (!invData) {
            try {
              const res = await invitationsApi.getByEventId(activeEvent.id);
              invData = res?.data?.invitation || res?.data || res?.invitation;
            } catch (e: any) {
              if (invitation?.id) {
                try {
                  const res = await invitationsApi.getById(invitation.id);
                  invData = res?.data?.invitation || res?.data || res?.invitation;
                } catch {}
              }
            }
          }

          if (invData && typeof invData === 'object' && (invData.id || invData.publicToken)) {
            const resolvedTheme = normalizeInvitationTheme(
              invData.theme || invData.template || invData.designTheme || invData.templateName || invData.invitationTheme
            );
            const normalizedInv: InvitationData = {
              ...invData,
              theme: resolvedTheme,
              template: resolvedTheme,
            };
            if (isMounted) {
              setInvitation(normalizedInv);
              localStorage.setItem('eva_ai_invitation', JSON.stringify(normalizedInv));
              populateFormFromInvitation(normalizedInv, activeEvent);
            }
          } else if (activeEvent) {
            // Initialize form with defaults from active event
            populateFormFromEvent(activeEvent);
          }
        } catch (invErr) {
          console.warn('Invitation fetch error:', invErr);
          if (activeEvent) {
            populateFormFromEvent(activeEvent);
          }
        }
      } else if (activeEvent) {
        populateFormFromEvent(activeEvent);
      }

      if (isMounted) {
        setIsLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const populateFormFromEvent = (event: EventPlanData) => {
    const defaultHost =
      event.eventType?.toLowerCase() === 'wedding'
        ? 'Aarav & Meera'
        : 'Event Host';
    setCoupleNames((prev) => prev || defaultHost);
    setTitle(
      (prev) =>
        prev ||
        `${(event.eventType || 'Wedding').toUpperCase()} CELEBRATION`
    );
    setMessage(
      (prev) =>
        prev ||
        'Together with our families, we invite you to celebrate this joyous milestone with us.'
    );
    setVenueName((prev) => prev || event.location || 'The Grand Glasshouse');
    setVenueAddress((prev) => prev || event.location || '');
  };

  const populateFormFromInvitation = (inv: InvitationData, event?: EventPlanData | null) => {
    setCoupleNames(inv.coupleNames || inv.hostNames || '');
    setTitle(inv.title || `${(inv.eventType || event?.eventType || 'Wedding').toUpperCase()} CELEBRATION`);
    setMessage(inv.message || '');
    setEventTime(inv.eventTime || '6:00 PM onwards');
    setVenueName(inv.venueName || event?.location || '');
    setVenueAddress(inv.venueAddress || event?.location || '');
    const resolvedTheme = normalizeInvitationTheme(
      inv.theme || inv.template || (inv as any).designTheme || (inv as any).templateName || (inv as any).invitationTheme
    );
    setTheme(resolvedTheme);
  };

  const handleSaveInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventPlan?.id) {
      setErrorMessage('Please create an event plan first before creating an invitation.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const payload: CreateInvitationPayload = {
      eventId: eventPlan.id,
      coupleNames: coupleNames.trim(),
      hostNames: coupleNames.trim(),
      title: title.trim(),
      message: message.trim(),
      eventTime: eventTime.trim(),
      venueName: venueName.trim(),
      venueAddress: venueAddress.trim(),
      theme: theme,
      template: theme,
      templateName: theme,
      designTheme: theme,
      invitationTheme: theme,
      eventType: eventPlan.eventType,
      eventDate: eventPlan.eventDate,
      location: eventPlan.location,
      guestCount: typeof eventPlan.guestCount === 'number' ? eventPlan.guestCount : undefined,
    };

    try {
      let savedInv: any = null;
      try {
        if (invitation?.id) {
          try {
            const res = await invitationsApi.update(invitation.id, payload);
            savedInv = res?.data?.invitation || res?.data || res?.invitation || res;
          } catch {
            const res = await invitationsApi.create(payload);
            savedInv = res?.data?.invitation || res?.data || res?.invitation || res;
          }
        } else {
          try {
            const res = await invitationsApi.create(payload);
            savedInv = res?.data?.invitation || res?.data || res?.invitation || res;
          } catch {
            const res = await invitationsApi.createForEvent(eventPlan.id, payload);
            savedInv = res?.data?.invitation || res?.data || res?.invitation || res;
          }
        }
      } catch (backendErr) {
        console.warn('Backend invitation endpoint fallback:', backendErr);
      }

      const cleanPublicToken =
        savedInv?.publicToken ||
        invitation?.publicToken ||
        `inv_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

      const merged: InvitationData = {
        id: savedInv?.id || invitation?.id || `inv_${Date.now()}`,
        eventId: eventPlan.id,
        publicToken: cleanPublicToken,
        status: savedInv?.status || invitation?.status || 'ACTIVE',
        hostNames: payload.hostNames,
        coupleNames: payload.coupleNames,
        title: payload.title,
        message: payload.message,
        eventType: eventPlan.eventType,
        eventDate: eventPlan.eventDate,
        eventTime: payload.eventTime,
        venueName: payload.venueName,
        venueAddress: payload.venueAddress,
        location: eventPlan.location,
        guestCount: typeof eventPlan.guestCount === 'number' ? eventPlan.guestCount : undefined,
        theme: payload.theme,
        template: payload.template,
        rsvps: savedInv?.rsvps || invitation?.rsvps || [],
        rsvpSummary: savedInv?.rsvpSummary || invitation?.rsvpSummary,
        createdAt: savedInv?.createdAt || invitation?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setInvitation(merged);
      localStorage.setItem('eva_ai_invitation', JSON.stringify(merged));
      setIsEditing(false);
      setSuccessNotification('Invitation saved and published successfully!');
      setTimeout(() => setSuccessNotification(null), 4000);
    } catch (err: any) {
      console.error('Failed to save invitation:', err);
      let msg = 'Failed to save invitation. Please check your connection and try again.';
      if (err instanceof ApiError) {
        msg = err.message || msg;
      }
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const themesList: { id: InvitationTheme; label: string; previewColor: string }[] = [
    { id: 'royal-gold', label: 'Traditional Royal Gold', previewColor: 'bg-[#f2ca50]' },
    { id: 'velvet-burgundy', label: 'Burgundy Imperial', previewColor: 'bg-[#ff5277]' },
    { id: 'botanical-glass', label: 'Botanical Conservatory', previewColor: 'bg-emerald-500' },
    { id: 'minimal-noir', label: 'Modern Minimalist Noir', previewColor: 'bg-zinc-400' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs uppercase tracking-widest text-on-surface-variant font-semibold">
            Loading Invitation Studio...
          </span>
        </div>
      </div>
    );
  }

  // If no active event exists
  if (!eventPlan) {
    return (
      <div className="min-h-[80vh] pt-28 pb-16 flex items-center justify-center p-4">
        <div className="max-w-md w-full rounded-3xl bg-surface-container-high/60 backdrop-blur-xl p-8 sm:p-10 text-center border border-surface-container-highest space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-surface-container-highest text-primary mx-auto flex items-center justify-center shadow-inner">
            <Icon name="mail_lock" className="text-[32px]" />
          </div>
          <div className="space-y-2">
            <h2 className="font-headline-sm text-2xl text-on-surface font-semibold">
              Create an event plan first
            </h2>
            <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
              To generate your personalized digital wedding invitation and guest RSVP pass, you need an active event blueprint.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/onboarding/event"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md font-bold transition-all shadow-[0_0_20px_rgba(242,202,80,0.25)]"
            >
              <span>Create Event Plan</span>
              <Icon name="arrow_forward" className="text-[18px]" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const livePreviewData: Partial<InvitationData> = {
    coupleNames: coupleNames || 'Aarav & Meera',
    hostNames: coupleNames || 'Aarav & Meera',
    title: title || `${(eventPlan.eventType || 'Wedding').toUpperCase()} CELEBRATION`,
    message: message,
    eventType: eventPlan.eventType,
    eventDate: eventPlan.eventDate,
    eventTime: eventTime,
    venueName: venueName || eventPlan.location || 'The Grand Glasshouse',
    venueAddress: venueAddress || eventPlan.location || '',
    location: eventPlan.location,
    guestCount: typeof eventPlan.guestCount === 'number' ? eventPlan.guestCount : undefined,
    theme: theme,
    status: invitation?.status || 'ACTIVE',
  };

  const publicUrl = invitation?.publicToken
    ? getPublicInvitationUrl(invitation.publicToken)
    : '';

  const isExpired =
    invitation?.status === 'EXPIRED' ||
    invitation?.status === 'expired';

  return (
    <div className="bg-surface font-body-md text-on-surface min-h-screen pt-28 pb-20 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin relative z-10 space-y-10">
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-surface-container-highest/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-label-sm uppercase tracking-widest text-primary font-bold text-xs">
                Couture Stationery Studio
              </span>
              {invitation && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    isExpired
                      ? 'bg-error/15 text-error border-error/30'
                      : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  }`}
                >
                  {isExpired ? 'Expired' : 'Active'}
                </span>
              )}
            </div>
            <h1 className="font-headline-lg text-2xl sm:text-3xl text-on-surface font-semibold tracking-tight">
              My Digital Invitation Suite
            </h1>
            <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant">
              Designed from your active {eventPlan.eventType} blueprint ({eventPlan.location}).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {invitation && (
              <a
                href={`/invitation/${invitation.publicToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-bright text-primary font-title-md text-xs font-semibold transition-colors border border-primary/30"
              >
                <Icon name="open_in_new" className="text-[16px]" />
                <span>Open Public Page</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-bright text-on-surface font-title-md text-xs font-semibold transition-colors border border-surface-container-highest"
            >
              <Icon name={isEditing ? 'visibility' : 'tune'} className="text-[16px] text-primary" />
              <span>{isEditing ? 'View Live Preview' : 'Customize Design'}</span>
            </button>
          </div>
        </div>

        {/* Success / Error Banners */}
        {successNotification && (
          <div className="p-4 rounded-2xl bg-primary/20 border border-primary/40 text-primary text-sm flex items-center gap-3 animate-in fade-in">
            <Icon name="check_circle" className="text-[20px]" />
            <span>{successNotification}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-error/15 border border-error/30 text-error text-sm flex items-center gap-3 animate-in fade-in">
            <Icon name="error" className="text-[20px]" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Main Grid: Customizer vs Preview / QR */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (7 cols): Customizer or Info / QR */}
          <div className="lg:col-span-7 space-y-6">
            {isEditing || !invitation ? (
              /* Customization Form */
              <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-xl p-6 sm:p-8 border border-surface-container-highest/60 shadow-2xl space-y-6">
                <div className="space-y-1">
                  <span className="font-label-sm uppercase tracking-widest text-primary font-bold text-xs">
                    Customization Studio
                  </span>
                  <h2 className="font-title-lg text-xl text-on-surface font-semibold">
                    Personalize Your Invitation
                  </h2>
                  <p className="font-body-sm text-xs text-on-surface-variant">
                    Event date, location, and guest count are pre-filled from your blueprint.
                  </p>
                </div>

                <form onSubmit={handleSaveInvitation} className="space-y-5">
                  {/* Theme Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      Choose Aesthetic Template
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {themesList.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setTheme(t.id)}
                          className={`p-3 rounded-2xl border text-left flex flex-col justify-between gap-2 transition-all ${
                            theme === t.id
                              ? 'bg-primary/15 border-primary shadow-[0_0_15px_rgba(242,202,80,0.2)]'
                              : 'bg-surface-container border-surface-container-highest hover:border-primary/40'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-full ${t.previewColor}`} />
                          <span className="text-[11px] font-bold text-on-surface leading-tight">
                            {t.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Couple / Host Names */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      Couple / Host Names <span className="text-primary">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={coupleNames}
                      onChange={(e) => setCoupleNames(e.target.value)}
                      placeholder="e.g. Aarav & Meera or Mr. & Mrs. Sharma"
                      className="w-full px-4 py-3 rounded-xl bg-surface-container border border-surface-container-highest focus:border-primary text-sm text-on-surface outline-none transition-colors"
                    />
                  </div>

                  {/* Title & Tagline */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                        Invitation Title
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. WEDDING CELEBRATION"
                        className="w-full px-4 py-3 rounded-xl bg-surface-container border border-surface-container-highest focus:border-primary text-sm text-on-surface outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                        Event Time
                      </label>
                      <input
                        type="text"
                        value={eventTime}
                        onChange={(e) => setEventTime(e.target.value)}
                        placeholder="e.g. 6:30 PM onwards"
                        className="w-full px-4 py-3 rounded-xl bg-surface-container border border-surface-container-highest focus:border-primary text-sm text-on-surface outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Venue Name & Address */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                        Venue Name
                      </label>
                      <input
                        type="text"
                        value={venueName}
                        onChange={(e) => setVenueName(e.target.value)}
                        placeholder="e.g. Bolgatty Palace Conservatory"
                        className="w-full px-4 py-3 rounded-xl bg-surface-container border border-surface-container-highest focus:border-primary text-sm text-on-surface outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                        Venue Address / City
                      </label>
                      <input
                        type="text"
                        value={venueAddress}
                        onChange={(e) => setVenueAddress(e.target.value)}
                        placeholder="e.g. Mulavukad, Kochi, Kerala"
                        className="w-full px-4 py-3 rounded-xl bg-surface-container border border-surface-container-highest focus:border-primary text-sm text-on-surface outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* Custom Message */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                      Personalized Invitation Message
                    </label>
                    <textarea
                      rows={3}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write a warm note for your invited guests..."
                      className="w-full px-4 py-3 rounded-xl bg-surface-container border border-surface-container-highest focus:border-primary text-sm text-on-surface outline-none resize-none transition-colors"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex items-center justify-end gap-3">
                    {invitation && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-5 py-3 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface text-sm font-semibold transition-colors border border-surface-container-highest"
                      >
                        Cancel
                      </button>
                    )}

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-7 py-3.5 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md text-sm font-bold transition-all shadow-[0_0_20px_rgba(242,202,80,0.25)] flex items-center gap-2 disabled:opacity-60"
                    >
                      {isSaving ? (
                        <>
                          <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                          <span>Publishing...</span>
                        </>
                      ) : (
                        <>
                          <Icon name="publish" className="text-[18px]" />
                          <span>{invitation ? 'Update & Publish' : 'Generate Invitation & QR'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Published Overview & QR Sharing Suite */
              <div className="space-y-6">
                {publicUrl && (
                  <QRCodeCard
                    url={publicUrl}
                    title={`${invitation.coupleNames || invitation.hostNames || 'Event'}'s Guest Pass`}
                    subtitle="Share this QR pass on WhatsApp or print on invitation cards so guests can instantly RSVP."
                  />
                )}

                {/* Event Blueprint Quick Sync Summary */}
                <div className="rounded-3xl bg-surface-container-high/50 backdrop-blur-xl p-6 border border-surface-container-highest/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-xs uppercase tracking-wider text-primary font-bold block">
                      Connected Blueprint
                    </span>
                    <h4 className="font-title-md text-base font-semibold text-on-surface">
                      {eventPlan.eventType} &bull; {eventPlan.location}
                    </h4>
                    <p className="text-xs text-on-surface-variant">
                      Target Date: {eventPlan.eventDate} | Guest Target: {eventPlan.guestCount || 'Not set'}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-bright text-primary font-title-md text-xs font-semibold transition-colors border border-primary/30 shrink-0"
                  >
                    Edit Invitation Details
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column (5 cols): Live Card Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between px-2">
              <span className="font-label-sm uppercase tracking-widest text-on-surface-variant font-bold text-xs flex items-center gap-1.5">
                <Icon name="preview" className="text-primary text-[16px]" />
                <span>Live Guest View</span>
              </span>
              <span className="text-xs text-on-surface-variant">Interactive Preview</span>
            </div>

            <InvitationCard
              invitation={livePreviewData}
              isPreview={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerInvitationPage;
