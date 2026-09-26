import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../common/Icon';
import { EventPlanData, formatIndianRupees } from '../../types/event';
import { SelectedServiceItem } from '../../types/service';
import {
  recommendationsApi,
  eventsApi,
  AIRecommendationCategory,
  AIRecommendationProvider,
  AIRecommendationMeta,
  ApiError,
} from '../../api/api';

interface Message {
  id: string;
  sender: 'eva' | 'user';
  text: string;
  timestamp: string;
  recommendations?: AIRecommendationCategory[];
  meta?: AIRecommendationMeta;
  error?: boolean;
}

interface EvaAiAssistantProps {
  eventPlan: EventPlanData | null;
  selectedServices: SelectedServiceItem[];
  onSelectCategory?: (category: string) => void;
}

const CATEGORY_NAME_MAP: Record<string, string> = {
  venue: 'Venue',
  photography: 'Photography',
  catering: 'Catering',
  decoration: 'Decoration',
  makeup: 'Makeup Artist',
  dj: 'DJ / Entertainment',
  management: 'Event Manager',
};

/**
 * Fallback conversational responses for non-recommendation general inquiries
 * (e.g. Budget overview, location coverage, date advice)
 */
function generateConversationalResponse(
  userQuery: string,
  eventPlan: EventPlanData | null,
  selectedServices: SelectedServiceItem[]
): string {
  const query = userQuery.toLowerCase().trim();

  // Compute live budget metrics
  const budgetNum =
    typeof eventPlan?.budget === 'number' && eventPlan.budget > 0
      ? eventPlan.budget
      : 300000;
  const estimatedTotal = selectedServices.reduce(
    (sum, s) => sum + (Number(s.startingPrice) || 0),
    0
  );
  const remaining = budgetNum - estimatedTotal;
  const formattedBudget = formatIndianRupees(budgetNum);
  const formattedEstimated = formatIndianRupees(estimatedTotal);
  const formattedRemaining = formatIndianRupees(remaining);

  const eventType = eventPlan?.eventType || 'event';
  const location = eventPlan?.location || 'Kerala';

  // 1. Budget query
  if (
    query.includes('budget') ||
    query.includes('cost') ||
    query.includes('price') ||
    query.includes('spend') ||
    query.includes('money') ||
    query.includes('expensive')
  ) {
    if (selectedServices.length === 0) {
      return `Your current event budget is ${formattedBudget}. You haven't added any services yet. As you add photography, venues, or catering, I will calculate your estimated spend and remaining balance dynamically!`;
    }
    return `Your current event budget is ${formattedBudget}. Your selected services (${selectedServices.length} selected) are estimated at ${formattedEstimated}, leaving approximately ${formattedRemaining}.${
      remaining < 0
        ? ' Note: Your estimated services currently exceed your initial budget target.'
        : ''
    }`;
  }

  // 2. Services needed query
  if (
    query.includes('what services') ||
    query.includes('services do i need') ||
    query.includes('what do i need') ||
    query.includes('services need') ||
    query.includes('which services')
  ) {
    const defaultServices =
      'photography, venue, catering, decoration, makeup artist, and DJ entertainment';
    const chosenList =
      eventPlan?.services && eventPlan.services.length > 0
        ? eventPlan.services.join(', ')
        : defaultServices;

    return `For your ${eventType}, you may want to consider ${chosenList}. You can explore each category on this page and add verified professionals directly to your event plan.`;
  }

  // 3. Find the right services / How to search
  if (
    query.includes('find') ||
    query.includes('search') ||
    query.includes('right services') ||
    query.includes('how to') ||
    query.includes('explore')
  ) {
    return `You can use the category chips at the top to filter by Photography, Venue, Catering, Decoration, Makeup, and DJ & Entertainment. You can also type into the search bar to find providers by name, location (like Palakkad or Kochi), or specific specialty tags.`;
  }

  // 4. Date / Timeline questions
  if (query.includes('date') || query.includes('when') || query.includes('time')) {
    if (eventPlan?.eventDate) {
      try {
        const d = new Date(eventPlan.eventDate);
        const dateStr = d.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        return `Your target celebration date is set for ${dateStr}. Top vendors in ${location} often get booked 3 to 6 months in advance, so adding your core venue and photography services early is recommended.`;
      } catch {
        return `Your target date is recorded as ${eventPlan.eventDate}.`;
      }
    }
    return `You haven't set a specific date yet in your event blueprint. You can click 'Edit Plan' at the top to configure your target date anytime.`;
  }

  // 5. Location / Destination questions
  if (
    query.includes('location') ||
    query.includes('place') ||
    query.includes('city') ||
    query.includes('palakkad') ||
    query.includes('kochi') ||
    query.includes('thrissur')
  ) {
    return `Your event location is set to ${location}. Eva-Ai currently features verified professionals across Palakkad, Kochi, Thrissur, Calicut, and Coimbatore. Use the location filter to view partners situated right next to your venue.`;
  }

  // 6. Unrecognized fallback
  return "I'm here to help you plan your event! Try asking me to recommend providers, check your budget status, or explore needed services.";
}

export const EvaAiAssistant: React.FC<EvaAiAssistantProps> = ({
  eventPlan,
  selectedServices,
  onSelectCategory,
}) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [addingServiceId, setAddingServiceId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll messages to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  // Construct initial greeting message when opened
  useEffect(() => {
    if (messages.length === 0) {
      let contextSentence = '';
      if (eventPlan?.eventType || eventPlan?.location || eventPlan?.guestCount) {
        const parts: string[] = [];
        if (eventPlan.eventType) parts.push(`a ${eventPlan.eventType.toLowerCase()}`);
        if (eventPlan.location) parts.push(`in ${eventPlan.location}`);
        if (eventPlan.guestCount) parts.push(`for around ${eventPlan.guestCount} guests`);

        if (parts.length > 0) {
          contextSentence = ` I see you're planning ${parts.join(' ')}.`;
        }
      }

      const initialText = `Hi! I'm Eva 👋\n\nYour personal event planning assistant. I can help you discover services, understand your budget, and generate personalized provider recommendations.${contextSentence}`;

      setMessages([
        {
          id: 'welcome-1',
          sender: 'eva',
          text: initialText,
          timestamp: 'Just now',
        },
      ]);
    }
  }, [eventPlan]);

  const handleRecommendationRequest = async () => {
    // 1. Validate required event context fields
    const missingFields: string[] = [];
    if (!eventPlan?.eventType?.trim()) missingFields.push('Event Type');
    if (!eventPlan?.eventDate?.trim()) missingFields.push('Event Date');
    if (!eventPlan?.location?.trim()) missingFields.push('Location');
    if (!eventPlan?.guestCount || Number(eventPlan.guestCount) <= 0) missingFields.push('Guest Count');
    if (!eventPlan?.budget || Number(eventPlan.budget) <= 0) missingFields.push('Budget');

    const rawServices = eventPlan?.services || [];
    if (!rawServices || rawServices.length === 0) {
      missingFields.push('Required Services');
    }

    if (missingFields.length > 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: `eva-${Date.now()}`,
          sender: 'eva',
          text: `To generate tailored AI recommendations from our curated partner network, please ensure all core event blueprint fields are set.\n\nMissing information: ${missingFields.join(
            ', '
          )}.\n\nYou can click "Edit Plan" at the top of the page to configure these details!`,
          timestamp: 'Just now',
          error: true,
        },
      ]);
      setIsTyping(false);
      return;
    }

    // 2. Format requiredServices into category names (e.g. "Venue", "Photography")
    const formattedRequiredServices = rawServices.map(
      (s) => CATEGORY_NAME_MAP[s.toLowerCase()] || s
    );

    // 3. Format optional preferences
    const preferences =
      eventPlan?.preferences && eventPlan.preferences.length > 0
        ? { styles: eventPlan.preferences }
        : undefined;

    const requestPayload = {
      eventType: eventPlan!.eventType.trim().toLowerCase(),
      eventDate: eventPlan!.eventDate.trim(),
      location: eventPlan!.location.trim(),
      guestCount: Number(eventPlan!.guestCount),
      budget: Number(eventPlan!.budget),
      requiredServices: formattedRequiredServices,
      ...(preferences ? { preferences } : {}),
    };

    try {
      const res = await recommendationsApi.getRecommendations(requestPayload);

      if (res.success && res.recommendations && res.recommendations.length > 0) {
        setMessages((prev) => [
          ...prev,
          {
            id: `eva-${Date.now()}`,
            sender: 'eva',
            text:
              res.message ||
              `I've generated personalized provider recommendations tailored to your ${eventPlan?.eventType || 'event'} in ${eventPlan?.location || 'your area'}:`,
            recommendations: res.recommendations,
            meta: res.meta,
            timestamp: 'Just now',
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `eva-${Date.now()}`,
            sender: 'eva',
            text:
              res.message ||
              'No suitable providers or services found matching your exact event parameters. Try adjusting your budget or required services in your Event Plan.',
            timestamp: 'Just now',
          },
        ]);
      }
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setMessages((prev) => [
            ...prev,
            {
              id: `eva-${Date.now()}`,
              sender: 'eva',
              text: 'Authentication required. Please sign in to your customer account to generate personalized AI recommendations.',
              timestamp: 'Just now',
              error: true,
            },
          ]);
        } else if (err.status === 400) {
          const errMsg =
            err.responseBody?.errors?.map((e: any) => e.message).join(', ') ||
            err.message ||
            'Invalid recommendation request. Please verify your event plan details.';
          setMessages((prev) => [
            ...prev,
            {
              id: `eva-${Date.now()}`,
              sender: 'eva',
              text: `Recommendation request failed: ${errMsg}`,
              timestamp: 'Just now',
              error: true,
            },
          ]);
        } else if (err.status === 404 || err.message?.toLowerCase().includes('no suitable')) {
          setMessages((prev) => [
            ...prev,
            {
              id: `eva-${Date.now()}`,
              sender: 'eva',
              text: 'No suitable providers or services found matching your event criteria.',
              timestamp: 'Just now',
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `eva-${Date.now()}`,
              sender: 'eva',
              text:
                err.message ||
                'The AI recommendation service is temporarily unavailable. Please try again in a moment.',
              timestamp: 'Just now',
              error: true,
            },
          ]);
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `eva-${Date.now()}`,
            sender: 'eva',
            text: 'A network error occurred while connecting to the recommendation service. Please check your connectivity and try again.',
            timestamp: 'Just now',
            error: true,
          },
        ]);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendMessage = (textToSend?: string) => {
    if (isTyping) return; // Prevent duplicate simultaneous AI requests

    const query = (textToSend || inputValue).trim();
    if (!query) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    const lower = query.toLowerCase();
    const isRecommendationQuery =
      lower.includes('recommend') ||
      lower.includes('provider') ||
      lower.includes('vendor') ||
      lower.includes('suggestion') ||
      lower.includes('who should i book') ||
      lower.includes('best vendor') ||
      lower.includes('best photographer') ||
      lower.includes('best venue');

    if (isRecommendationQuery) {
      handleRecommendationRequest();
    } else {
      setTimeout(() => {
        const responseText = generateConversationalResponse(query, eventPlan, selectedServices);
        const evaMsg: Message = {
          id: `eva-${Date.now()}`,
          sender: 'eva',
          text: responseText,
          timestamp: 'Just now',
        };
        setMessages((prev) => [...prev, evaMsg]);
        setIsTyping(false);
      }, 350);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Add recommended service to Event Plan via eventsApi and update local cache
  const handleAddService = async (
    provider: AIRecommendationProvider,
    categoryName: string
  ) => {
    if (!provider.isAvailable) return;
    if (addingServiceId === provider.serviceId) return;

    setAddingServiceId(provider.serviceId);

    const serviceItem: SelectedServiceItem = {
      id: `sel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      serviceId: provider.serviceId,
      providerId: provider.providerId,
      providerName: provider.providerName,
      category: categoryName || 'Service',
      location: provider.location,
      startingPrice: provider.startingPrice,
      selectedAt: new Date().toISOString(),
    };

    // 1. Authoritative backend event-service API sync if eventId exists
    if (eventPlan?.id) {
      try {
        await eventsApi.addService(eventPlan.id, {
          serviceId: provider.serviceId,
          providerId: provider.providerId,
          providerName: provider.providerName,
          category: categoryName || 'Service',
          startingPrice: provider.startingPrice,
          location: provider.location,
        });
      } catch (err) {
        console.warn('Backend event service sync fallback to local cache:', err);
      }
    }

    // 2. Update local selected services cache
    try {
      const raw = localStorage.getItem('eva_ai_selected_services');
      const list: SelectedServiceItem[] = raw ? JSON.parse(raw) : [];
      const exists = list.some(
        (s) =>
          s.providerId === provider.providerId &&
          (s.serviceId === provider.serviceId || !provider.serviceId)
      );
      if (!exists) {
        list.push(serviceItem);
        localStorage.setItem('eva_ai_selected_services', JSON.stringify(list));
        window.dispatchEvent(new Event('eva_ai_selected_services_updated'));
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err) {
      console.warn('Failed saving selected service to localStorage:', err);
    } finally {
      setAddingServiceId(null);
    }
  };

  const isServiceAlreadySelected = (providerId: string, serviceId?: string): boolean => {
    return selectedServices.some(
      (s) =>
        s.providerId === providerId ||
        (serviceId && s.serviceId === serviceId)
    );
  };

  const handleNavigateToProvider = (providerId: string) => {
    if (!providerId) return;
    setIsOpen(false);
    navigate(`/customer/services/${providerId}`);
  };

  // Clickable suggestion chips
  const quickActions = [
    'Recommend providers for my event',
    'Help me with my budget',
    'What services do I need?',
    'Find the right services',
  ];

  return (
    <>
      {/* 1. FLOATING EVA-AI BUTTON (Bottom-Right) */}
      <div className="fixed bottom-5 right-4 sm:right-6 z-40">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Close Eva-Ai assistant' : 'Ask Eva-Ai'}
          title="Ask Eva-Ai"
          className={`group relative flex items-center gap-2.5 px-4 py-3 sm:px-5 sm:py-3.5 rounded-full transition-all duration-300 backdrop-blur-2xl shadow-2xl ${
            isOpen
              ? 'bg-primary text-on-primary shadow-[0_0_30px_rgba(242,202,80,0.5)] scale-95'
              : 'bg-surface-container-high/90 hover:bg-surface-container-high text-primary border-2 border-primary/50 hover:border-primary shadow-[0_0_25px_rgba(242,202,80,0.35)] hover:shadow-[0_0_35px_rgba(242,202,80,0.6)] hover:scale-105'
          }`}
        >
          {/* Subtle pulsating gold aura when closed */}
          {!isOpen && (
            <span className="absolute -inset-1 rounded-full bg-primary/20 blur-md animate-pulse pointer-events-none" />
          )}

          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
              isOpen
                ? 'bg-on-primary text-primary'
                : 'bg-primary/20 text-primary group-hover:rotate-12'
            }`}
          >
            <Icon name={isOpen ? 'close' : 'auto_awesome'} className="text-[18px]" />
          </div>

          <span
            className={`font-title-md text-xs sm:text-sm font-bold tracking-wide transition-colors ${
              isOpen ? 'text-on-primary' : 'text-on-surface group-hover:text-primary'
            }`}
          >
            {isOpen ? 'Close' : 'Ask Eva'}
          </span>

          {/* Online status indicator dot */}
          {!isOpen && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
          )}
        </button>
      </div>

      {/* 2. CHAT PANEL */}
      {isOpen && (
        <aside
          aria-label="Eva-Ai Chat Assistant"
          className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[420px] h-[580px] max-h-[calc(100vh-6.5rem)] rounded-3xl bg-surface-container-high/95 backdrop-blur-2xl border-2 border-primary/40 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_30px_rgba(242,202,80,0.15)] flex flex-col overflow-hidden animate-fadeIn"
        >
          {/* Ambient background accent light */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-10 left-0 w-40 h-40 bg-secondary-container/15 rounded-full blur-3xl pointer-events-none" />

          {/* Chat Header */}
          <div className="relative z-10 p-4 sm:p-5 border-b border-surface-container-highest/60 bg-surface-container/70 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/20 text-primary flex items-center justify-center border border-primary/30 shadow-[0_0_12px_rgba(242,202,80,0.25)]">
                <Icon name="auto_awesome" className="text-[20px]" />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-headline-sm text-base font-bold text-on-surface">
                    ✨ Eva-Ai
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30">
                    AI Planner
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant">Intelligent Event Concierge</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-lg bg-surface-container-high hover:bg-surface-bright text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors border border-surface-container-highest/60"
              title="Minimize chat"
            >
              <Icon name="close" className="text-[18px]" />
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-3.5 text-xs sm:text-sm">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'eva' && (
                  <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 mt-0.5 border border-primary/30">
                    <Icon name="auto_awesome" className="text-[15px]" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] p-3.5 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-primary text-on-primary rounded-tr-none font-medium shadow-md'
                      : msg.error
                      ? 'bg-error/15 text-error rounded-tl-none border border-error/30'
                      : 'bg-surface-container-low text-on-surface rounded-tl-none border border-surface-container-highest/60 shadow-inner'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* Render Structured AI Recommendations */}
                  {msg.recommendations && msg.recommendations.length > 0 && (
                    <div className="mt-3.5 space-y-3.5">
                      {msg.recommendations.map((cat, catIdx) => (
                        <div
                          key={`${cat.category}-${catIdx}`}
                          className="p-3 rounded-xl bg-surface-container/90 border border-surface-container-highest/80 space-y-2.5"
                        >
                          <div className="flex items-center justify-between border-b border-surface-container-highest/50 pb-1.5">
                            <span className="font-bold text-xs text-primary uppercase tracking-wider flex items-center gap-1.5">
                              <Icon name="category" className="text-[14px]" />
                              {cat.category}
                            </span>
                            <span className="text-[10px] text-on-surface-variant font-medium">
                              {cat.providers.length} {cat.providers.length === 1 ? 'Match' : 'Matches'}
                            </span>
                          </div>

                          <div className="space-y-2.5">
                            {cat.providers.map((prov) => {
                              const alreadyInPlan = isServiceAlreadySelected(
                                prov.providerId,
                                prov.serviceId
                              );
                              const isAdding = addingServiceId === prov.serviceId;

                              return (
                                <div
                                  key={`${prov.providerId}-${prov.serviceId}`}
                                  className="p-2.5 rounded-lg bg-surface-container-high/80 border border-surface-container-highest/60 space-y-2"
                                >
                                  {/* Header: Name & Match Score */}
                                  <div className="flex items-start justify-between gap-1.5">
                                    <div>
                                      <h4 className="font-bold text-xs text-on-surface">
                                        {prov.providerName}
                                      </h4>
                                      <p className="text-[11px] text-secondary font-medium">
                                        {prov.serviceName}
                                      </p>
                                    </div>
                                    <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary border border-primary/30 shadow-[0_0_8px_rgba(242,202,80,0.2)]">
                                      ✨ {prov.matchScore}% Match
                                    </span>
                                  </div>

                                  {/* Meta: Location, Price, Rating */}
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-on-surface-variant">
                                    <span className="flex items-center gap-1">
                                      <Icon name="location_on" className="text-[13px] text-primary" />
                                      {prov.location}
                                    </span>
                                    <span className="flex items-center gap-1 font-semibold text-on-surface">
                                      {formatIndianRupees(prov.startingPrice)}
                                    </span>
                                    <span className="flex items-center gap-1 text-primary">
                                      <Icon name="star" className="text-[13px]" />
                                      {prov.rating} ({prov.reviewCount})
                                    </span>
                                  </div>

                                  {/* Match Reasons */}
                                  {prov.matchReasons && prov.matchReasons.length > 0 && (
                                    <div className="pt-1 space-y-0.5 border-t border-surface-container/60">
                                      {prov.matchReasons.map((reason, rIdx) => (
                                        <div
                                          key={rIdx}
                                          className="flex items-center gap-1.5 text-[10px] text-on-surface-variant"
                                        >
                                          <Icon name="check" className="text-[12px] text-emerald-400 shrink-0" />
                                          <span>{reason}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Availability & Actions */}
                                  <div className="pt-2 flex items-center justify-between border-t border-surface-container/60">
                                    <div>
                                      {prov.isAvailable ? (
                                        <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                          Available
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-error font-semibold flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-error" />
                                          Unavailable
                                        </span>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleNavigateToProvider(prov.providerId)}
                                        className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-bright text-[11px] font-semibold text-on-surface transition-colors border border-surface-container-highest"
                                      >
                                        View Details
                                      </button>

                                      <button
                                        type="button"
                                        disabled={!prov.isAvailable || alreadyInPlan || isAdding}
                                        onClick={() => handleAddService(prov, cat.category)}
                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                                          alreadyInPlan
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default'
                                            : !prov.isAvailable
                                            ? 'bg-surface-container text-outline opacity-50 cursor-not-allowed border border-surface-container-highest'
                                            : 'bg-primary hover:bg-primary-container text-on-primary shadow-sm hover:scale-105'
                                        }`}
                                      >
                                        {alreadyInPlan ? (
                                          <>
                                            <Icon name="check" className="text-[12px]" />
                                            <span>In Plan</span>
                                          </>
                                        ) : isAdding ? (
                                          <span>Adding...</span>
                                        ) : (
                                          <>
                                            <Icon name="add" className="text-[12px]" />
                                            <span>Add to Plan</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Simulated typing bubble */}
            {isTyping && (
              <div className="flex gap-2.5 items-center text-on-surface-variant">
                <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 border border-primary/30">
                  <Icon name="auto_awesome" className="text-[15px]" />
                </div>
                <div className="p-3 rounded-2xl bg-surface-container-low border border-surface-container-highest/60 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: '0.15s' }}
                  />
                  <span
                    className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: '0.3s' }}
                  />
                  <span className="text-[11px] text-primary ml-1 font-medium">Generating recommendations...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="relative z-10 px-4 py-2 border-t border-surface-container-highest/40 bg-surface-container-low/50">
            <div className="text-[10px] text-on-surface-variant/80 uppercase tracking-wider font-semibold mb-1.5">
              Suggestions:
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {quickActions.map((action) => (
                <button
                  key={action}
                  type="button"
                  disabled={isTyping}
                  onClick={() => handleSendMessage(action)}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-bright text-[11px] text-primary hover:text-on-surface transition-colors border border-primary/25 hover:border-primary/50 flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Input Bar */}
          <div className="relative z-10 p-3 bg-surface-container border-t border-surface-container-highest/60">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputValue}
                disabled={isTyping}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isTyping ? 'Generating AI recommendations...' : 'What would you like to ask Eva?'}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-container-high border border-surface-container-highest/80 text-on-surface placeholder:text-on-surface-variant/60 text-xs sm:text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="w-9 h-9 rounded-xl bg-primary hover:bg-tertiary disabled:opacity-40 disabled:hover:bg-primary text-on-primary flex items-center justify-center transition-all shadow-[0_0_12px_rgba(242,202,80,0.3)] flex-shrink-0"
                title="Send message"
              >
                <Icon name="send" className="text-[18px]" />
              </button>
            </form>
          </div>
        </aside>
      )}
    </>
  );
};

export default EvaAiAssistant;
