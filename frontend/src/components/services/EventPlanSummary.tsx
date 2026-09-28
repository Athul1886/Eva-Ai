import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../common/Icon';
import { SelectedServiceItem } from '../../types/service';
import { formatIndianRupees } from '../../types/event';

interface EventPlanSummaryProps {
  selectedServices: SelectedServiceItem[];
  eventBudget: number | '';
  onRemoveService: (providerId: string) => void;
  onClearAllServices: () => void;
}

export const EventPlanSummary: React.FC<EventPlanSummaryProps> = ({
  selectedServices,
  eventBudget,
  onRemoveService,
  onClearAllServices,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Compute estimated total
  const estimatedTotal = selectedServices.reduce(
    (sum, item) => sum + (Number(item.startingPrice) || 0),
    0
  );

  // Determine budget comparison
  const parsedBudget = typeof eventBudget === 'number' && eventBudget > 0 ? eventBudget : 300000;
  const remainingBudget = parsedBudget - estimatedTotal;
  const isOverBudget = remainingBudget < 0;

  const count = selectedServices.length;

  return (
    <>
      {/* Floating / Sticky Bar at Bottom Left */}
      <aside
        aria-label="Event Plan Summary"
        className="fixed bottom-5 left-4 sm:left-6 z-40 max-w-[calc(100vw-7.5rem)] sm:max-w-md w-auto"
      >
        <div className="rounded-2xl bg-surface-container-high/95 backdrop-blur-2xl border-2 border-primary/40 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.7)] flex items-center justify-between gap-4 transition-all">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold shadow-[0_0_15px_rgba(242,202,80,0.4)] flex-shrink-0">
              <Icon name="assignment_turned_in" className="text-[20px]" />
            </div>

            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-title-md text-xs sm:text-sm font-bold text-on-surface">
                  My Event Plan
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                  {count} {count === 1 ? 'Service' : 'Services'}
                </span>
              </div>

              <div className="text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                <span>Est. Total:</span>
                <span className="font-bold text-primary">
                  {formatIndianRupees(estimatedTotal)}
                </span>
              </div>
            </div>
          </div>

          <Link
            to="/customer/event-plan"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary hover:bg-tertiary text-on-primary text-xs sm:text-sm font-bold transition-all shadow-[0_0_15px_rgba(242,202,80,0.25)] flex-shrink-0"
          >
            <span>View Event Plan</span>
            <Icon name="arrow_forward" className="text-[14px]" />
          </Link>
        </div>
      </aside>

      {/* Expanded Modal / Drawer for Reviewing Event Plan */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-container-lowest/80 backdrop-blur-md p-4 animate-fadeIn">
          <div className="relative w-full max-w-lg rounded-3xl bg-surface-container-high border border-surface-container-highest/80 shadow-2xl p-6 sm:p-7 max-h-[90vh] flex flex-col space-y-5 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-highest/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                  <Icon name="receipt_long" className="text-[22px]" />
                </div>
                <div>
                  <h3 className="font-headline-sm text-xl font-bold text-on-surface">
                    My Event Plan
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    Services curated for your upcoming celebration
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-9 h-9 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
                title="Close summary"
              >
                <Icon name="close" className="text-[20px]" />
              </button>
            </div>

            {/* Budget Analytics Card */}
            <div className="p-4 rounded-2xl bg-surface-container-low border border-surface-container-highest/50 space-y-2.5">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-on-surface-variant">Allocated Event Budget:</span>
                <span className="font-semibold text-on-surface">
                  {formatIndianRupees(parsedBudget)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-on-surface-variant">Estimated Services Total:</span>
                <span className="font-bold text-primary">
                  {formatIndianRupees(estimatedTotal)}
                </span>
              </div>

              <div className="pt-2 border-t border-surface-container-highest/40 flex items-center justify-between text-xs sm:text-sm">
                <span className="text-on-surface-variant">Remaining Budget:</span>
                <span
                  className={`font-bold ${
                    isOverBudget ? 'text-error' : 'text-primary'
                  }`}
                >
                  {formatIndianRupees(remainingBudget)}
                  {isOverBudget && ' (Exceeds Target)'}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden mt-2">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    isOverBudget ? 'bg-error' : 'bg-primary'
                  }`}
                  style={{
                    width: `${Math.min(100, (estimatedTotal / parsedBudget) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Selected Services List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {selectedServices.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-surface-container text-on-surface-variant mx-auto flex items-center justify-center">
                    <Icon name="inventory_2" className="text-[24px]" />
                  </div>
                  <h4 className="font-title-md text-base text-on-surface font-semibold">
                    Your event plan is empty.
                  </h4>
                  <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
                    Browse service providers above and click &quot;Add to Event&quot; to begin building your custom vendor plan.
                  </p>
                </div>
              ) : (
                selectedServices.map((srv) => (
                  <div
                    key={srv.providerId}
                    className="p-3.5 rounded-2xl bg-surface-container-low border border-surface-container-highest/60 flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3">
                      {srv.imageUrl && (
                        <img
                          src={srv.imageUrl}
                          alt={srv.providerName}
                          className="w-12 h-12 rounded-xl object-cover border border-surface-container-highest/40"
                        />
                      )}
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                            {srv.category}
                          </span>
                          <span className="text-[11px] text-on-surface-variant flex items-center gap-0.5">
                            <Icon name="location_on" className="text-[12px]" />
                            {srv.location}
                          </span>
                        </div>
                        <h4 className="font-title-md text-sm font-semibold text-on-surface mt-0.5">
                          {srv.providerName}
                        </h4>
                        <span className="text-xs font-bold text-primary">
                          Starting {formatIndianRupees(srv.startingPrice)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onRemoveService(srv.providerId)}
                      className="p-2 rounded-xl bg-surface-container text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                      title="Remove from plan"
                    >
                      <Icon name="delete" className="text-[18px]" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-surface-container-highest/60 flex items-center justify-between gap-3">
              {selectedServices.length > 0 && (
                <button
                  type="button"
                  onClick={onClearAllServices}
                  className="text-xs text-on-surface-variant hover:text-error transition-colors underline"
                >
                  Clear all
                </button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <Link
                  to="/customer/event-plan"
                  className="px-4 py-2.5 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-bold text-xs sm:text-sm transition-all shadow-[0_0_15px_rgba(242,202,80,0.25)] flex items-center gap-1.5"
                >
                  <span>Open Full Event Plan</span>
                  <Icon name="open_in_new" className="text-[14px]" />
                </Link>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface font-semibold text-xs sm:text-sm transition-colors border border-surface-container-highest/60"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EventPlanSummary;
