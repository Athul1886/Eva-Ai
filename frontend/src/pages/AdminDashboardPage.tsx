import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/common/Icon';
import { adminApi, AdminDashboardStats, ApiError } from '../api/api';
import { getAdminSession } from '../utils/adminAuth';

export const AdminDashboardPage: React.FC = () => {
  const session = getAdminSession();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await adminApi.getDashboardStats();
      // Inspect payload structure safely (support both direct response and enveloped data)
      const data: AdminDashboardStats =
        res?.data && typeof res.data === 'object' && res.data.totalCustomers !== undefined
          ? res.data
          : res && typeof res === 'object' && res.totalCustomers !== undefined
            ? res
            : {
                totalCustomers: res?.totalCustomers ?? res?.data?.totalCustomers ?? 0,
                totalProviders: res?.totalProviders ?? res?.data?.totalProviders ?? 0,
                pendingProviders: res?.pendingProviders ?? res?.data?.pendingProviders ?? 0,
                approvedProviders: res?.approvedProviders ?? res?.data?.approvedProviders ?? 0,
                rejectedProviders: res?.rejectedProviders ?? res?.data?.rejectedProviders ?? 0,
              };

      setStats(data);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load administrator statistics from the backend server.');
      } else {
        setError('Network connectivity error. Could not reach backend admin statistics endpoint.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const adminName = session?.fullName || session?.email?.split('@')[0] || 'Administrator';

  return (
    <div className="flex-1 max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin py-8 md:py-12 space-y-8">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-surface-container-highest/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] uppercase tracking-widest font-bold text-primary">
              Live Governance &amp; Telemetry
            </span>
          </div>
          <h1 className="font-display-hero text-headline-md md:text-headline-lg font-semibold text-on-surface">
            Control Center <span className="text-primary italic font-normal">Dashboard</span>
          </h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Welcome back, <span className="text-on-surface font-semibold">{adminName}</span>. Real-time platform metrics from backend services.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-highest/80 text-on-surface text-body-sm font-semibold transition-all disabled:opacity-50"
            title="Refresh statistics from backend"
          >
            <Icon name="refresh" className={`text-[18px] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Stats</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-6 rounded-2xl bg-error/10 border border-error/30 text-error flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Icon name="error" className="text-[24px] shrink-0 mt-0.5" />
            <div>
              <h3 className="font-title-md font-bold">Failed to load platform stats</h3>
              <p className="text-body-sm opacity-90 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchStats}
            className="px-4 py-2 rounded-xl bg-error text-on-error font-semibold text-body-sm hover:opacity-90 transition-opacity shrink-0"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 animate-pulse space-y-4"
            >
              <div className="w-10 h-10 rounded-xl bg-surface-container-highest/60" />
              <div className="space-y-2">
                <div className="w-20 h-4 bg-surface-container-highest/50 rounded" />
                <div className="w-16 h-8 bg-surface-container-highest/70 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Live Stats Grid */}
      {stats && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {/* 1. Total Customers */}
            <div className="p-6 rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 hover:border-primary/40 transition-all shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center">
                  <Icon name="people" className="text-[24px]" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/80 px-2.5 py-1 rounded-full bg-surface-container">
                  Active Base
                </span>
              </div>
              <div>
                <p className="text-body-sm text-on-surface-variant font-medium">Total Customers</p>
                <p className="font-display-hero text-headline-lg font-bold text-on-surface mt-1">
                  {stats.totalCustomers.toLocaleString()}
                </p>
              </div>
            </div>

            {/* 2. Total Providers */}
            <div className="p-6 rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 hover:border-secondary/40 transition-all shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-secondary/10 border border-secondary/20 text-secondary flex items-center justify-center">
                  <Icon name="storefront" className="text-[24px]" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/80 px-2.5 py-1 rounded-full bg-surface-container">
                  Network
                </span>
              </div>
              <div>
                <p className="text-body-sm text-on-surface-variant font-medium">Total Providers</p>
                <p className="font-display-hero text-headline-lg font-bold text-on-surface mt-1">
                  {stats.totalProviders.toLocaleString()}
                </p>
              </div>
            </div>

            {/* 3. Pending Providers (Action Required) */}
            <Link
              to="/admin/providers?status=pending"
              className="p-6 rounded-3xl bg-amber-500/10 backdrop-blur-xl border border-amber-500/30 hover:border-amber-500/60 transition-all shadow-lg flex flex-col justify-between relative overflow-hidden group cursor-pointer"
            >
              <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                  <Icon name="pending_actions" className="text-[24px]" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30">
                  Needs Review
                </span>
              </div>
              <div>
                <p className="text-body-sm text-amber-200/90 font-medium">Pending Approvals</p>
                <p className="font-display-hero text-headline-lg font-bold text-amber-300 mt-1">
                  {stats.pendingProviders.toLocaleString()}
                </p>
              </div>
            </Link>

            {/* 4. Approved Providers */}
            <div className="p-6 rounded-3xl bg-emerald-500/10 backdrop-blur-xl border border-emerald-500/30 hover:border-emerald-500/60 transition-all shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                  <Icon name="check_circle" className="text-[24px]" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                  Verified
                </span>
              </div>
              <div>
                <p className="text-body-sm text-emerald-200/90 font-medium">Approved Providers</p>
                <p className="font-display-hero text-headline-lg font-bold text-emerald-300 mt-1">
                  {stats.approvedProviders.toLocaleString()}
                </p>
              </div>
            </div>

            {/* 5. Rejected Providers */}
            <div className="p-6 rounded-3xl bg-rose-500/10 backdrop-blur-xl border border-rose-500/30 hover:border-rose-500/60 transition-all shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center">
                  <Icon name="cancel" className="text-[24px]" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-rose-300 px-2.5 py-1 rounded-full bg-rose-500/20 border border-rose-500/30">
                  Declined
                </span>
              </div>
              <div>
                <p className="text-body-sm text-rose-200/90 font-medium">Rejected Providers</p>
                <p className="font-display-hero text-headline-lg font-bold text-rose-300 mt-1">
                  {stats.rejectedProviders.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions & Navigation Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
            {/* Quick Action 1: Provider Review Desk */}
            <div className="p-8 rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 hover:border-primary/50 transition-all shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center">
                    <Icon name="verified_user" className="text-[22px]" />
                  </div>
                  <div>
                    <h2 className="font-title-lg text-title-lg font-semibold text-on-surface">
                      Provider Verification Desk
                    </h2>
                    <p className="text-body-sm text-on-surface-variant">
                      Review atelier partner submissions, approve verified curators, or update provider standing.
                    </p>
                  </div>
                </div>

                {stats.pendingProviders > 0 && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-body-sm flex items-center gap-2">
                    <Icon name="notifications_active" className="text-[18px]" />
                    <span>
                      <strong>{stats.pendingProviders} provider{stats.pendingProviders > 1 ? 's' : ''}</strong> awaiting review and approval decision.
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-6 flex flex-wrap gap-3">
                <Link
                  to="/admin/providers?status=pending"
                  className="px-5 py-2.5 rounded-xl bg-primary hover:bg-tertiary text-on-primary font-bold text-body-sm transition-all shadow-[0_0_15px_rgba(242,202,80,0.2)] flex items-center gap-2"
                >
                  <span>Review Pending ({stats.pendingProviders})</span>
                  <Icon name="arrow_forward" className="text-[16px]" />
                </Link>
                <Link
                  to="/admin/providers"
                  className="px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface font-semibold text-body-sm border border-surface-container-highest transition-all flex items-center gap-2"
                >
                  <span>View All Providers</span>
                </Link>
              </div>
            </div>

            {/* Quick Action 2: Customer Registry */}
            <div className="p-8 rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 hover:border-secondary/50 transition-all shadow-xl flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/20 text-secondary flex items-center justify-center">
                    <Icon name="contacts" className="text-[22px]" />
                  </div>
                  <div>
                    <h2 className="font-title-lg text-title-lg font-semibold text-on-surface">
                      Customer Registry
                    </h2>
                    <p className="text-body-sm text-on-surface-variant">
                      Inspect registered host accounts, contact coordinates, and user activity status.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-highest/50 text-on-surface-variant text-body-sm flex items-center gap-2">
                  <Icon name="info" className="text-[18px] text-primary" />
                  <span>
                    Total <strong>{stats.totalCustomers}</strong> registered event hosts recorded in platform database.
                  </span>
                </div>
              </div>

              <div className="pt-6">
                <Link
                  to="/admin/users"
                  className="px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface font-semibold text-body-sm border border-surface-container-highest transition-all inline-flex items-center gap-2"
                >
                  <span>Open Customer Directory</span>
                  <Icon name="arrow_forward" className="text-[16px]" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
