import React from 'react';
import Icon from '../common/Icon';
import { formatIndianRupees } from '../../types/event';

interface BudgetOverviewProps {
  totalBudget: number | '';
  estimatedCost: number;
  selectedCount: number;
  unavailableCount?: number;
  onSendBookingRequests: () => void;
  isSending?: boolean;
}

export const BudgetOverview: React.FC<BudgetOverviewProps> = ({
  totalBudget,
  estimatedCost,
  selectedCount,
  unavailableCount = 0,
  onSendBookingRequests,
  isSending = false,
}) => {
  const hasValidBudget = typeof totalBudget === 'number' && totalBudget > 0;
  const remainingBudget = hasValidBudget ? totalBudget - estimatedCost : null;
  const isOverBudget = hasValidBudget && remainingBudget !== null && remainingBudget < 0;

  // Percentage calculation
  const budgetPercentage = hasValidBudget
    ? Math.round((estimatedCost / totalBudget) * 100)
    : null;

  const progressBarWidth = budgetPercentage !== null
    ? Math.min(100, Math.max(0, budgetPercentage))
    : 0;

  return (
    <div className="rounded-3xl bg-surface-container-high/80 backdrop-blur-xl border border-surface-container-highest/70 p-6 sm:p-7 shadow-2xl space-y-6 sticky top-28">
      {/* Card Header */}
      <div className="flex items-center justify-between pb-4 border-b border-surface-container-highest/60">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center shadow-[0_0_15px_rgba(242,202,80,0.2)]">
            <Icon name="account_balance_wallet" className="text-[20px]" />
          </div>
          <div>
            <h2 className="font-headline-sm text-xl font-bold text-on-surface">
              Budget Overview
            </h2>
            <p className="text-xs text-on-surface-variant">
              Live financial summary for selected services
            </p>
          </div>
        </div>

        {selectedCount > 0 && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/25">
            {selectedCount} {selectedCount === 1 ? 'Service' : 'Services'}
          </span>
        )}
      </div>

      {/* Financial Metrics Stack */}
      <div className="space-y-4">
        {/* 1. Total Event Budget */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-on-surface-variant flex items-center gap-1.5">
            <Icon name="savings" className="text-[16px] text-primary" />
            <span>Total Event Budget</span>
          </span>
          <span className="font-bold text-on-surface text-base">
            {hasValidBudget ? formatIndianRupees(totalBudget) : 'Not specified'}
          </span>
        </div>

        {/* 2. Estimated Services Cost */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-on-surface-variant flex items-center gap-1.5">
            <Icon name="receipt" className="text-[16px] text-primary" />
            <span>Estimated Services</span>
          </span>
          <span className="font-bold text-primary text-base">
            {formatIndianRupees(estimatedCost)}
          </span>
        </div>

        {/* 3. Remaining Budget */}
        <div className="pt-3 border-t border-surface-container-highest/50 flex items-center justify-between text-sm">
          <span className="text-on-surface-variant flex items-center gap-1.5 font-medium">
            <Icon name="pie_chart" className="text-[16px] text-primary" />
            <span>Remaining Budget</span>
          </span>
          <span
            className={`font-bold text-base ${
              !hasValidBudget
                ? 'text-on-surface-variant'
                : isOverBudget
                ? 'text-error'
                : 'text-primary'
            }`}
          >
            {hasValidBudget && remainingBudget !== null
              ? isOverBudget
                ? `- ${formatIndianRupees(Math.abs(remainingBudget))}`
                : formatIndianRupees(remainingBudget)
              : 'No budget set'}
          </span>
        </div>
      </div>

      {/* Budget Progress Indicator */}
      <div className="space-y-2 pt-2 border-t border-surface-container-highest/40">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-on-surface">
            Services Budget Usage
          </span>
          <span
            className={`font-bold ${
              isOverBudget ? 'text-error' : 'text-primary'
            }`}
          >
            {hasValidBudget && budgetPercentage !== null
              ? `${budgetPercentage}% of your event budget`
              : 'N/A'}
          </span>
        </div>

        {/* Progress Track */}
        <div className="w-full h-3 rounded-full bg-surface-container overflow-hidden p-0.5 border border-surface-container-highest/60">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              isOverBudget
                ? 'bg-gradient-to-r from-secondary-container via-error to-error shadow-[0_0_12px_rgba(255,180,171,0.5)]'
                : 'bg-gradient-to-r from-primary/70 via-primary to-primary-container shadow-[0_0_12px_rgba(242,202,80,0.4)]'
            }`}
            style={{ width: `${progressBarWidth}%` }}
          />
        </div>

        {/* Over budget warning */}
        {isOverBudget && (
          <div className="p-3 rounded-xl bg-error-container/40 border border-error/40 flex items-start gap-2.5 mt-2 animate-fadeIn">
            <Icon name="warning" className="text-error text-[18px] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-error leading-relaxed">
              Your selected services exceed the current event budget. You can still proceed with your requests.
            </p>
          </div>
        )}

        {!hasValidBudget && (
          <p className="text-[11px] text-on-surface-variant italic mt-1">
            Tip: Set your event budget in the onboarding wizard to accurately measure spending.
          </p>
        )}
      </div>

      {/* Subtle Price Disclaimer */}
      <div className="p-3.5 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 flex items-start gap-2 text-[11px] text-on-surface-variant leading-relaxed">
        <Icon name="info" className="text-primary text-[15px] flex-shrink-0 mt-0.5" />
        <span>
          Prices shown are starting/estimated prices. Final pricing will be confirmed directly by the service provider.
        </span>
      </div>

      {/* Unavailable warning if any selected provider is unavailable */}
      {unavailableCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-error-container/30 border border-error/40 flex items-start gap-2.5 text-xs text-error">
          <Icon name="event_busy" className="text-[18px] text-error flex-shrink-0 mt-0.5" />
          <span>
            {unavailableCount === selectedCount
              ? 'All selected providers are unavailable on your event date. You cannot send booking requests until you change dates or replace them.'
              : `${unavailableCount} selected provider(s) are unavailable on your date and will be excluded when sending requests.`}
          </span>
        </div>
      )}

      {/* Send Booking Requests Action Button */}
      {selectedCount > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onSendBookingRequests}
            disabled={isSending}
            className="w-full py-4 px-6 rounded-2xl bg-primary hover:bg-tertiary disabled:opacity-50 text-on-primary font-title-md font-bold text-sm sm:text-base transition-all shadow-[0_0_24px_rgba(242,202,80,0.3)] hover:shadow-[0_0_32px_rgba(242,202,80,0.5)] flex items-center justify-center gap-2 group active:scale-[0.98]"
          >
            {isSending ? (
              <div className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Icon name="send" className="text-[20px] group-hover:translate-x-0.5 transition-transform" />
                <span>Send Booking Requests</span>
              </>
            )}
          </button>
          <p className="text-[10px] text-center text-on-surface-variant mt-2">
            No payment required &bull; Providers will be notified directly
          </p>
        </div>
      )}
    </div>
  );
};

export default BudgetOverview;
