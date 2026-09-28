import React, { useState, useEffect, useRef } from 'react';
import Icon from '../common/Icon';
import { EventPlanData, formatIndianRupees } from '../../types/event';
import { SelectedServiceItem } from '../../types/service';

interface Message {
  id: string;
  sender: 'eva' | 'user';
  text: string;
  timestamp: string;
}

interface EvaAiAssistantProps {
  eventPlan: EventPlanData | null;
  selectedServices: SelectedServiceItem[];
  onSelectCategory?: (category: string) => void;
}

/**
 * Mock response generator.
 * In a future release, this function can be easily swapped with a call to:
 * Frontend -> Backend API -> AI recommendation service -> Database -> Eva-Ai response
 */
function generateEvaResponse(
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
  const guests = eventPlan?.guestCount ? `${eventPlan.guestCount} guests` : 'your guests';

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

  // 3. Provider recommendations
  if (
    query.includes('recommend') ||
    query.includes('provider') ||
    query.includes('vendor') ||
    query.includes('who') ||
    query.includes('best') ||
    query.includes('suggestion')
  ) {
    return `Based on your current event details in ${location} for ${guests}, I can help you explore providers that match your requirements. For example, LensCraft Studio (Photography) and Grand Palace Auditorium (Venue) are popular in this region. Click on any category chip above to browse all verified options!`;
  }

  // 4. Find the right services / How to search
  if (
    query.includes('find') ||
    query.includes('search') ||
    query.includes('right services') ||
    query.includes('how to') ||
    query.includes('explore')
  ) {
    return `You can use the category chips at the top to filter by Photography, Venue, Catering, Decoration, Makeup, and DJ & Entertainment. You can also type into the search bar to find providers by name, location (like Palakkad or Kochi), or specific specialty tags.`;
  }

  // 5. Date / Timeline questions
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

  // 6. Location / Destination questions
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

  // 7. Unrecognized fallback
  return "I'm still learning how to handle that. For now, try asking me about your budget, required services, or provider recommendations.";
}

export const EvaAiAssistant: React.FC<EvaAiAssistantProps> = ({
  eventPlan,
  selectedServices,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
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

      const initialText = `Hi! I'm Eva 👋\n\nYour personal event planning assistant. I can help you discover services, understand your budget, and plan your event.${contextSentence}`;

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

  const handleSendMessage = (textToSend?: string) => {
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

    // Simulate brief conversational thinking delay (350ms)
    setTimeout(() => {
      const responseText = generateEvaResponse(query, eventPlan, selectedServices);
      const evaMsg: Message = {
        id: `eva-${Date.now()}`,
        sender: 'eva',
        text: responseText,
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, evaMsg]);
      setIsTyping(false);
    }, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Clickable suggestion chips
  const quickActions = [
    'Find the right services',
    'Help me with my budget',
    'What services do I need?',
    'Recommend providers for my event',
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
          className="fixed bottom-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] sm:w-[390px] h-[540px] max-h-[calc(100vh-6.5rem)] rounded-3xl bg-surface-container-high/95 backdrop-blur-2xl border-2 border-primary/40 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_30px_rgba(242,202,80,0.15)] flex flex-col overflow-hidden animate-fadeIn"
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
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary px-2 py-0.2 rounded-full bg-primary/15 border border-primary/30">
                    Demo Assistant
                  </span>
                </div>
                <p className="text-[11px] text-on-surface-variant">Your Event Assistant</p>
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
                  className={`max-w-[82%] p-3.5 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-primary text-on-primary rounded-tr-none font-medium shadow-md'
                      : 'bg-surface-container-low text-on-surface rounded-tl-none border border-surface-container-highest/60 shadow-inner'
                  }`}
                >
                  {msg.text}
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
                  onClick={() => handleSendMessage(action)}
                  className="whitespace-nowrap px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-bright text-[11px] text-primary hover:text-on-surface transition-colors border border-primary/25 hover:border-primary/50 flex-shrink-0"
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
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What would you like to ask Eva?"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-surface-container-high border border-surface-container-highest/80 text-on-surface placeholder:text-on-surface-variant/60 text-xs sm:text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              />

              <button
                type="submit"
                disabled={!inputValue.trim()}
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
