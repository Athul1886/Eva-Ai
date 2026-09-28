import React, { useState } from 'react';
import Icon from '../common/Icon';
import { PackageItem } from '../../types';

interface AiPlannerSectionProps {
  packageItems: PackageItem[];
  onToggleItem: (id: string) => void;
  onResetPackage: () => void;
  onOpenBookingPreview: () => void;
}

export const AiPlannerSection: React.FC<AiPlannerSectionProps> = ({
  packageItems,
  onToggleItem,
  onResetPackage,
  onOpenBookingPreview,
}) => {
  const [chatPrompt, setChatPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatMessage, setChatMessage] = useState<string | null>(null);

  const budgetCap = 200000;
  const currentTotal = packageItems.reduce(
    (acc, item) => (item.checked ? acc + item.cost : acc),
    0
  );
  const percentage = Math.min(Math.round((currentTotal / budgetCap) * 100), 100);
  const surplus = budgetCap - currentTotal;
  const isOverBudget = surplus < 0;

  const handleSendPrompt = () => {
    if (!chatPrompt.trim()) return;
    const query = chatPrompt;
    setChatPrompt('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      setChatMessage(
        `EVENTORA AI matched your query: "${query}". Updated venue & catering selections have been reflected in your live cart.`
      );
      setTimeout(() => {
        setChatMessage(null);
      }, 5000);
    }, 900);
  };

  return (
    <section className="w-full py-28 bg-surface relative overflow-hidden" id="ai-concierge">
      <div className="max-w-[1440px] mx-auto px-margin-mobile md:px-margin">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Left: Conversational AI Simulator */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping"></span>
              <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary">
                Natural Language Planning
              </span>
            </div>
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg font-medium text-on-surface">
              Planning That Understands You.
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2 mb-8">
              Speak to the EVENTORA Concierge in plain language. Our agent interprets nuances, filters regional calendars, checks live vendor pricing, and allocates your budget without mathematical overshoot.
            </p>

            {/* Chat Console Container */}
            <div className="rounded-2xl bg-surface-container-high/50 backdrop-blur-xl p-6 shadow-2xl flex flex-col gap-4">
              {/* Simulated User Prompt */}
              <div className="flex items-start gap-3 self-end max-w-[88%]">
                <div className="p-4 rounded-2xl rounded-tr-none bg-primary text-on-primary shadow-md">
                  <p className="font-body-md text-body-md font-medium">
                    &ldquo;I want an intimate royal wedding in Palakkad for around 250 guests with majestic floral mandap d&eacute;cor, cinematic coverage, and grand feast strictly under ₹2,00,000.&rdquo;
                  </p>
                  <div className="flex items-center justify-end gap-1 mt-1 text-[11px] text-on-primary/70">
                    <span>10:42 AM</span>
                    <Icon name="done_all" className="text-[13px]" />
                  </div>
                </div>
                <div className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center shrink-0">
                  <Icon name="person" className="text-primary text-[18px]" />
                </div>
              </div>

              {/* AI Response Box */}
              <div className="flex items-start gap-3 max-w-[95%]">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(242,202,80,0.3)]">
                  <Icon name="auto_awesome" className="text-primary text-[18px]" />
                </div>
                <div className="p-5 rounded-2xl rounded-tl-none bg-surface-container-low shadow-md space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="font-title-md text-title-md font-semibold text-primary">
                      EVENTORA AI Concierge
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-label-sm text-label-sm">
                      48 providers analyzed
                    </span>
                  </div>
                  <p className="font-body-md text-body-md text-on-surface">
                    I have analyzed 48 certified providers in Palakkad for your guest count. Here is your optimized Tier-1 master allocation preserving a{' '}
                    <strong className="text-primary">₹5,000 surplus</strong>:
                  </p>

                  {/* Interactive Mini Cards */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container/70">
                      <div>
                        <div className="font-title-md text-title-md text-on-surface">
                          Grand Palace Auditorium
                        </div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant">
                          250–400 capacity • 2.4 km away
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-title-md text-title-md text-primary font-bold">
                          ₹60,000
                        </div>
                        <span className="inline-block text-[11px] text-primary uppercase">
                          Auto-Assigned
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container/70">
                      <div>
                        <div className="font-title-md text-title-md text-on-surface">
                          XYZ Cinematic Photography
                        </div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant">
                          4.9 ★ (140+ weddings) • Drone ready
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-title-md text-title-md text-primary font-bold">
                          ₹40,000
                        </div>
                        <span className="inline-block text-[11px] text-primary uppercase">
                          Auto-Assigned
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container/70">
                      <div>
                        <div className="font-title-md text-title-md text-on-surface">
                          ABC Royal Feast Catering
                        </div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant">
                          250 Pax @ ₹280 / royal feast plate
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-title-md text-title-md text-primary font-bold">
                          ₹70,000
                        </div>
                        <span className="inline-block text-[11px] text-primary uppercase">
                          Auto-Assigned
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container/70">
                      <div>
                        <div className="font-title-md text-title-md text-on-surface">
                          Dream Floral Mandap Décor
                        </div>
                        <div className="font-body-sm text-body-sm text-on-surface-variant">
                          Fresh Jasmine &amp; Canopy Lights
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-title-md text-title-md text-primary font-bold">
                          ₹25,000
                        </div>
                        <span className="inline-block text-[11px] text-primary uppercase">
                          Auto-Assigned
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-primary/10 flex items-center justify-between">
                    <div className="font-label-sm text-label-sm uppercase tracking-wider text-primary">
                      Allocation Result
                    </div>
                    <div className="font-title-md text-title-md font-bold text-on-surface">
                      ₹1,95,000 Total (Under ₹2,00,000 cap)
                    </div>
                  </div>
                </div>
              </div>

              {/* Chat feedback notification */}
              {chatMessage && (
                <div className="p-3 rounded-xl bg-primary/20 border border-primary/30 text-primary text-sm animate-fadeIn">
                  {chatMessage}
                </div>
              )}

              {/* Interactive chat input */}
              <div className="mt-2 flex items-center gap-2 p-2 rounded-xl bg-surface-container">
                <input
                  type="text"
                  value={chatPrompt}
                  onChange={(e) => setChatPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendPrompt();
                  }}
                  className="flex-1 bg-transparent px-3 py-2 text-on-surface placeholder:text-outline-variant font-body-md text-body-md focus:outline-none"
                  placeholder="Ask AI: e.g. 'Can we swap catering for pure vegetarian and add a DJ?'"
                />
                <button
                  type="button"
                  aria-label="Send message"
                  className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center hover:bg-tertiary transition-colors"
                  onClick={handleSendPrompt}
                >
                  <Icon name="send" className="text-[20px]" />
                </button>
              </div>

              {isTyping && (
                <div className="text-primary font-label-sm text-label-sm animate-pulse px-2">
                  ✨ EVENTORA AI is recomputing matching algorithms across 52 regional items...
                </div>
              )}
            </div>
          </div>

          {/* Right: Functional Live Interactive Package / Cart Calculator */}
          <div className="lg:col-span-6">
            <div className="rounded-2xl bg-surface-container-high/60 backdrop-blur-xl p-8 shadow-2xl relative">
              <div className="flex items-center justify-between pb-6">
                <div>
                  <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary">
                    Live Customizer
                  </span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    My Event Package Cart
                  </h3>
                </div>
                <button
                  type="button"
                  className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 font-label-md text-label-md"
                  onClick={onResetPackage}
                >
                  <Icon name="restart_alt" className="text-[16px]" />
                  <span>Reset</span>
                </button>
              </div>

              {/* Interactive Items List */}
              <div className="space-y-3.5 my-6">
                {packageItems.map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-surface-container-low cursor-pointer hover:bg-surface-container transition-all group"
                  >
                    <div className="flex items-center gap-3.5">
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={() => onToggleItem(item.id)}
                        className="package-checkbox w-5 h-5 accent-primary rounded cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="font-title-md text-title-md text-on-surface font-semibold group-hover:text-primary transition-colors">
                          {item.title}
                        </span>
                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                          {item.subtitle}
                        </span>
                      </div>
                    </div>
                    <span className="font-title-md text-title-md text-on-surface font-bold">
                      {item.prefix || ''}₹{item.cost.toLocaleString('en-IN')}
                    </span>
                  </label>
                ))}
              </div>

              {/* Dynamic Balance Bar & Breakdown */}
              <div className="p-5 rounded-xl bg-surface-container-lowest space-y-4">
                <div className="flex items-center justify-between font-body-md text-body-md text-on-surface-variant">
                  <span>Total Budget Cap:</span>
                  <span className="font-title-md text-title-md text-on-surface">
                    ₹{budgetCap.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex items-center justify-between font-title-lg text-title-lg">
                  <span className="text-on-surface font-medium">Selected Package Total:</span>
                  <span className="text-primary font-bold">
                    ₹{currentTotal.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Budget Utilization Gauge */}
                <div className="space-y-1.5">
                  <div className="flex justify-between font-label-sm text-label-sm text-outline">
                    <span>Budget Utilization</span>
                    <span>{percentage}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-surface-container overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isOverBudget
                          ? 'bg-error'
                          : 'bg-gradient-to-r from-primary via-tertiary to-primary'
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between font-label-sm text-label-sm mt-1">
                    <span className="text-on-surface-variant">Remaining Safe Margin:</span>
                    <span className={isOverBudget ? 'text-error font-bold' : 'text-tertiary font-bold'}>
                      {isOverBudget
                        ? `₹${Math.abs(surplus).toLocaleString('en-IN')} Over Budget`
                        : `₹${surplus.toLocaleString('en-IN')} Surplus`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Call to Action */}
              <button
                type="button"
                className="w-full mt-6 py-4 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-title-md text-title-md font-bold transition-all duration-300 shadow-[0_0_25px_rgba(242,202,80,0.3)] hover:shadow-[0_0_35px_rgba(242,202,80,0.5)] flex items-center justify-center gap-2"
                onClick={onOpenBookingPreview}
              >
                <Icon name="check_circle" className="text-[20px]" />
                <span>Proceed to Booking Preview</span>
              </button>
              <p className="text-center font-body-sm text-body-sm text-outline mt-3">
                Zero platform fees. Providers hold dates for 48 hours without upfront commitment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AiPlannerSection;
