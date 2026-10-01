import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../common/Icon';
import { EventPlanData, formatIndianRupees } from '../../types/event';
import { SelectedServiceItem } from '../../types/service';
import {
  aiApi,
  eventsApi,
  AiChatRecommendation,
  AiChatAction,
  ApiError,
} from '../../api/api';

interface Message {
  id: string;
  sender: 'eva' | 'user';
  text: string;
  timestamp: string;
  recommendations?: AiChatRecommendation[];
  actions?: AiChatAction[];
  error?: boolean;
  isPlanRecommendation?: boolean;
}

interface EvaAiAssistantProps {
  eventPlan: EventPlanData | null;
  selectedServices: SelectedServiceItem[];
  onSelectCategory?: (category: string) => void;
}

const CHAT_CONVERSATION_KEY = 'eva_ai_chat_conversation_id';

function getOrCreateConversationId(): string {
  try {
    let convId = localStorage.getItem(CHAT_CONVERSATION_KEY);
    if (!convId || !convId.trim()) {
      convId = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      localStorage.setItem(CHAT_CONVERSATION_KEY, convId);
    }
    return convId;
  } catch {
    return `conv_${Date.now()}`;
  }
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

  // Handle normal conversational messages
  const handleSendMessage = async (textToSend?: string) => {
    if (isTyping) return; // Prevent duplicate simultaneous requests

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

    const convId = getOrCreateConversationId();
    const payload: { message: string; eventId?: string; conversationId?: string } = {
      message: query,
      conversationId: convId,
    };

    if (eventPlan?.id && typeof eventPlan.id === 'string' && eventPlan.id.trim()) {
      payload.eventId = eventPlan.id.trim();
    }

    try {
      const res = await aiApi.chat(payload);

      if (res && res.success) {
        const evaMsg: Message = {
          id: `eva-${Date.now()}`,
          sender: 'eva',
          text: res.message || 'Here are the recommendations based on your request.',
          recommendations: res.recommendations || [],
          actions: res.actions || [],
          timestamp: 'Just now',
        };
        setMessages((prev) => [...prev, evaMsg]);
      } else {
        const evaMsg: Message = {
          id: `eva-${Date.now()}`,
          sender: 'eva',
          text: res?.message || "I couldn't find suitable recommendations right now.",
          recommendations: res?.recommendations || [],
          actions: res?.actions || [],
          timestamp: 'Just now',
        };
        setMessages((prev) => [...prev, evaMsg]);
      }
    } catch (err: any) {
      let errorText = "I couldn't connect to Eva-Ai right now. Please try again.";
      if (err instanceof ApiError) {
        if (err.status === 401) {
          errorText = 'Your session has expired. Please log in again to continue.';
        } else if (err.status === 403) {
          errorText = 'Eva-Ai is available for customer accounts only.';
        } else if (err.message) {
          errorText = err.message;
        }
      }
      const evaMsg: Message = {
        id: `eva-${Date.now()}`,
        sender: 'eva',
        text: errorText,
        timestamp: 'Just now',
        error: true,
      };
      setMessages((prev) => [...prev, evaMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const eventPlanRef = useRef(eventPlan);
  useEffect(() => {
    eventPlanRef.current = eventPlan;
  }, [eventPlan]);

  const isTypingRef = useRef(isTyping);
  useEffect(() => {
    isTypingRef.current = isTyping;
  }, [isTyping]);

  // One-click: "✨ Build My Event Plan" handler
  const handleBuildEventPlan = useCallback(async () => {
    console.log('[EvaAiAssistant] handleBuildEventPlan called, isTypingRef:', isTypingRef.current);
    if (isTypingRef.current) return;

    const currentPlan = eventPlanRef.current;
    console.log('[EvaAiAssistant] currentPlan:', currentPlan);

    if (!currentPlan || (!currentPlan.id && !currentPlan.eventType)) {
      console.log('[EvaAiAssistant] No event plan found, setting warning message');
      setMessages((prev) => [
        ...prev,
        {
          id: `eva-${Date.now()}`,
          sender: 'eva',
          text: 'Please create an event plan first so Eva-Ai can build your event plan.\n\nYou can click "Plan Your Event" above to configure your event blueprint!',
          timestamp: 'Just now',
          error: true,
        },
      ]);
      return;
    }

    const servicesList =
      currentPlan.services && currentPlan.services.length > 0
        ? currentPlan.services.join(', ')
        : 'all core celebration services (photography, venue, catering, decoration, makeup, and entertainment)';
    const prefList =
      currentPlan.preferences && currentPlan.preferences.length > 0
        ? ` Preferences: ${currentPlan.preferences.join(', ')}.`
        : '';
    const notes = currentPlan.additionalNotes
      ? ` Additional notes: ${currentPlan.additionalNotes}.`
      : '';
    const budgetNum =
      typeof currentPlan.budget === 'number'
        ? currentPlan.budget
        : Number(currentPlan.budget) || 0;
    const budgetStr = budgetNum > 0 ? formatIndianRupees(budgetNum) : 'specified budget';

    const promptMessage = `Build a complete event plan for my ${currentPlan.eventType || 'event'} in ${
      currentPlan.location || 'Kerala'
    } on ${currentPlan.eventDate || 'my target date'} for ${
      currentPlan.guestCount || 'my'
    } guests with a total budget of ${budgetStr}. Required services: ${servicesList}.${prefList}${notes} Please select the best combination of real approved service providers and packages that fits within my total event budget.`;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: '✨ Build My Event Plan',
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    const convId = getOrCreateConversationId();
    const payload: { message: string; eventId?: string; conversationId?: string } = {
      message: promptMessage,
      conversationId: convId,
    };

    if (currentPlan.id && typeof currentPlan.id === 'string' && currentPlan.id.trim()) {
      payload.eventId = currentPlan.id.trim();
    }

    console.log('[EvaAiAssistant] Sending chat payload to aiApi.chat:', payload);

    try {
      const res = await aiApi.chat(payload);
      console.log('[EvaAiAssistant] aiApi.chat response received:', res);

      if (res && res.success) {
        const evaMsg: Message = {
          id: `eva-${Date.now()}`,
          sender: 'eva',
          text:
            res.message ||
            'Here is your complete recommended event plan tailored to your Event Blueprint and budget:',
          recommendations: res.recommendations || [],
          actions: res.actions || [],
          timestamp: 'Just now',
          isPlanRecommendation: true,
        };
        setMessages((prev) => [...prev, evaMsg]);
      } else {
        const evaMsg: Message = {
          id: `eva-${Date.now()}`,
          sender: 'eva',
          text:
            res?.message ||
            "I couldn't generate a complete plan with the available providers within your budget. Would you like to adjust your required services or budget?",
          recommendations: res?.recommendations || [],
          actions: res?.actions || [],
          timestamp: 'Just now',
        };
        setMessages((prev) => [...prev, evaMsg]);
      }
    } catch (err: any) {
      console.error('[EvaAiAssistant] aiApi.chat error:', err);
      let errorText = "I couldn't connect to Eva-Ai right now. Please try again.";
      if (err instanceof ApiError) {
        if (err.status === 401) {
          errorText = 'Your session has expired. Please log in again to continue.';
        } else if (err.status === 403) {
          errorText = 'Eva-Ai is available for customer accounts only.';
        } else if (err.message) {
          errorText = err.message;
        }
      }
      const evaMsg: Message = {
        id: `eva-${Date.now()}`,
        sender: 'eva',
        text: errorText,
        timestamp: 'Just now',
        error: true,
      };
      setMessages((prev) => [...prev, evaMsg]);
    } finally {
      setIsTyping(false);
    }
  }, []);

  // Listen for custom trigger from "✨ Build My Event Plan" button in EventSummaryCard
  useEffect(() => {
    const handleTrigger = () => {
      console.log('[EvaAiAssistant] eva_ai_trigger_build_plan event received');
      setIsOpen(true);
      setTimeout(() => {
        handleBuildEventPlan();
      }, 50);
    };

    window.addEventListener('eva_ai_trigger_build_plan', handleTrigger);
    return () => {
      window.removeEventListener('eva_ai_trigger_build_plan', handleTrigger);
    };
  }, [handleBuildEventPlan]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Add recommended service to Event Plan via eventsApi and update local cache
  const handleAddService = async (rec: AiChatRecommendation) => {
    if (!rec.providerId) return;
    const actionKey = rec.serviceId || rec.providerId;
    if (addingServiceId === actionKey) return;

    setAddingServiceId(actionKey);

    const serviceItem: SelectedServiceItem = {
      id: `sel_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      serviceId: rec.serviceId,
      providerId: rec.providerId,
      providerName: rec.providerName || 'Service Provider',
      category: rec.category || 'Service',
      location: rec.location || '',
      startingPrice: rec.startingPrice || 0,
      selectedAt: new Date().toISOString(),
    };

    // 1. Authoritative backend event-service API sync if eventId exists
    if (eventPlan?.id) {
      const isValidUuid = (val?: any): boolean =>
        typeof val === 'string' &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());

      const payload: Record<string, any> = {
        providerId: rec.providerId,
        providerName: rec.providerName || 'Service Provider',
        category: rec.category || 'Service',
        startingPrice: rec.startingPrice || 0,
        location: rec.location || '',
      };

      if (isValidUuid(rec.serviceId)) {
        payload.serviceId = rec.serviceId;
      }

      try {
        await eventsApi.addService(eventPlan.id, payload);
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
          s.providerId === rec.providerId &&
          (s.serviceId === rec.serviceId || !rec.serviceId)
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

  const handleNavigateToProvider = (providerId?: string) => {
    if (!providerId) return;
    setIsOpen(false);
    navigate(`/customer/services/${providerId}`);
  };

  // Clickable suggestion chips
  const quickActions = [
    '✨ Build My Event Plan',
    'Find me a wedding photographer in Palakkad under 50000',
    'Show me venues in Palakkad',
    'Help me with my budget',
    'What services do I need?',
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
            {messages.map((msg) => {
              const recs = msg.recommendations || [];
              const totalEstimated = recs.reduce(
                (sum, r) => sum + (Number(r.startingPrice) || 0),
                0
              );
              const budgetNum =
                eventPlan?.budget !== undefined &&
                eventPlan?.budget !== null &&
                eventPlan?.budget !== ''
                  ? Number(eventPlan.budget)
                  : 0;
              const remainingBudget = budgetNum > 0 ? budgetNum - totalEstimated : null;

              return (
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

                    {/* Render Structured AI Recommendations from Backend */}
                    {recs.length > 0 && (
                      <div className="mt-3.5 space-y-2.5">
                        {recs.map((rec, recIdx) => {
                          const alreadyInPlan = isServiceAlreadySelected(
                            rec.providerId,
                            rec.serviceId
                          );
                          const isAdding =
                            addingServiceId === (rec.serviceId || rec.providerId);

                          return (
                            <div
                              key={`${rec.providerId}-${rec.serviceId || recIdx}`}
                              className="p-3 rounded-xl bg-surface-container/90 border border-surface-container-highest/80 space-y-2"
                            >
                              {/* Header: Name & Category */}
                              <div className="flex items-start justify-between gap-1.5">
                                <div>
                                  <h4 className="font-bold text-xs text-on-surface">
                                    {rec.providerName || 'Event Service Provider'}
                                  </h4>
                                  {rec.serviceName && (
                                    <p className="text-[11px] text-secondary font-medium">
                                      {rec.serviceName}
                                    </p>
                                  )}
                                </div>
                                {rec.category && (
                                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary border border-primary/30">
                                    {rec.category}
                                  </span>
                                )}
                              </div>

                              {/* Meta: Location, Price, Rating, Experience */}
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-on-surface-variant">
                                {rec.location && (
                                  <span className="flex items-center gap-1">
                                    <Icon name="location_on" className="text-[13px] text-primary" />
                                    {rec.location}
                                  </span>
                                )}
                                {rec.startingPrice !== undefined &&
                                  rec.startingPrice !== null &&
                                  rec.startingPrice > 0 && (
                                    <span className="flex items-center gap-1 font-semibold text-on-surface">
                                      {formatIndianRupees(rec.startingPrice)}
                                    </span>
                                  )}
                                {rec.rating !== undefined &&
                                  rec.rating !== null &&
                                  rec.rating > 0 && (
                                    <span className="flex items-center gap-1 text-primary">
                                      <Icon name="star" className="text-[13px]" />
                                      {rec.rating}
                                    </span>
                                  )}
                                {rec.experience !== undefined &&
                                  rec.experience !== null &&
                                  rec.experience > 0 && (
                                    <span className="flex items-center gap-1 text-on-surface-variant">
                                      <Icon
                                        name="workspace_premium"
                                        className="text-[13px] text-secondary"
                                      />
                                      {rec.experience} yrs exp
                                    </span>
                                  )}
                              </div>

                              {/* Actions: View Provider & Add to Plan */}
                              <div className="pt-2 flex items-center justify-end gap-1.5 border-t border-surface-container/60">
                                <button
                                  type="button"
                                  onClick={() => handleNavigateToProvider(rec.providerId)}
                                  className="px-2.5 py-1 rounded-lg bg-surface-container hover:bg-surface-bright text-[11px] font-semibold text-on-surface transition-colors border border-surface-container-highest cursor-pointer"
                                >
                                  View Provider
                                </button>

                                <button
                                  type="button"
                                  disabled={alreadyInPlan || isAdding}
                                  onClick={() => handleAddService(rec)}
                                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                    alreadyInPlan
                                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default'
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
                          );
                        })}

                        {/* Plan Cost & Budget Summary Breakdown */}
                        {recs.length > 0 && (
                          <div className="mt-3 p-3 rounded-xl bg-surface-container/95 border border-surface-container-highest/90 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between text-on-surface font-semibold">
                              <span className="text-on-surface-variant">Estimated Total:</span>
                              <span className="text-on-surface">
                                {formatIndianRupees(totalEstimated)}
                              </span>
                            </div>
                            {budgetNum > 0 && remainingBudget !== null && (
                              <div className="flex items-center justify-between border-t border-surface-container-highest/50 pt-1.5">
                                <span className="text-on-surface-variant font-medium">
                                  Remaining Budget:
                                </span>
                                <span
                                  className={`font-bold ${
                                    remainingBudget >= 0 ? 'text-emerald-400' : 'text-error'
                                  }`}
                                >
                                  {formatIndianRupees(remainingBudget)}{' '}
                                  {remainingBudget < 0 ? '(Exceeds Budget)' : '✓'}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Loading / Typing indicator bubble */}
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
                  <span className="text-[11px] text-primary ml-1 font-medium">
                    Eva is planning your event...
                  </span>
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
                  onClick={() => {
                    if (action === '✨ Build My Event Plan') {
                      handleBuildEventPlan();
                    } else {
                      handleSendMessage(action);
                    }
                  }}
                  className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                    action === '✨ Build My Event Plan'
                      ? 'bg-primary/20 text-primary hover:bg-primary hover:text-on-primary border border-primary font-bold shadow-[0_0_10px_rgba(242,202,80,0.2)]'
                      : 'bg-surface-container hover:bg-surface-bright text-primary hover:text-on-surface border border-primary/25 hover:border-primary/50'
                  }`}
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
                placeholder={isTyping ? 'Eva is thinking...' : 'What would you like to ask Eva?'}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-container-high border border-surface-container-highest/80 text-on-surface placeholder:text-on-surface-variant/60 text-xs sm:text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={!inputValue.trim() || isTyping}
                className="w-9 h-9 rounded-xl bg-primary hover:bg-tertiary disabled:opacity-40 disabled:hover:bg-primary text-on-primary flex items-center justify-center transition-all shadow-[0_0_12px_rgba(242,202,80,0.3)] flex-shrink-0 cursor-pointer"
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
