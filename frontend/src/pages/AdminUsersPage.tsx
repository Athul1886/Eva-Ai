import React, { useState, useEffect, useMemo } from 'react';
import Icon from '../components/common/Icon';
import { adminApi, AdminCustomerUser, ApiError } from '../api/api';

export const AdminUsersPage: React.FC = () => {
  const [customers, setCustomers] = useState<AdminCustomerUser[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res: any = await adminApi.getUsers();
      // Handle various response wrappers cleanly
      const list: AdminCustomerUser[] =
        Array.isArray(res?.data?.customers)
          ? res.data.customers
          : Array.isArray(res?.customers)
            ? res.customers
            : Array.isArray(res?.data)
              ? res.data
              : Array.isArray(res)
                ? res
                : [];

      setCustomers(list);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to fetch customer users list from the backend.');
      } else {
        setError('Network connectivity failure. Unable to reach backend customer endpoint.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Filtered customers based on search query and status filter
  const filteredCustomers = useMemo(() => {
    return customers.filter((cust) => {
      // Status filter
      if (statusFilter === 'ACTIVE' && cust.isActive === false) return false;
      if (statusFilter === 'INACTIVE' && cust.isActive !== false) return false;

      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName = cust.fullName?.toLowerCase().includes(q);
      const matchEmail = cust.email?.toLowerCase().includes(q);
      const matchPhone = cust.phone?.toLowerCase().includes(q);
      const matchLocation = cust.location?.toLowerCase().includes(q);
      return Boolean(matchName || matchEmail || matchPhone || matchLocation);
    });
  }, [customers, searchQuery, statusFilter]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not available';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return new Intl.DateTimeFormat('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }).format(date);
    } catch {
      return dateString;
    }
  };

  return (
    <div className="flex-1 max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin py-8 md:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-surface-container-highest/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] uppercase tracking-widest font-bold text-primary">
              Client Host Management
            </span>
          </div>
          <h1 className="font-display-hero text-headline-md md:text-headline-lg font-semibold text-on-surface">
            Customer <span className="text-primary italic font-normal">Directory</span>
          </h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            View authoritative host accounts, contact coordinates, and registration timeline.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-highest/80 text-on-surface text-body-sm font-semibold transition-all disabled:opacity-50"
            title="Refresh customers from backend"
          >
            <Icon name="refresh" className={`text-[18px] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh List</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-surface-container-high/60 backdrop-blur-xl p-4 rounded-2xl border border-surface-container-highest/60">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
            <Icon name="search" className="text-[18px]" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, email, phone, location..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-container border border-surface-container-highest/80 focus:border-primary focus:ring-1 focus:ring-primary/30 text-on-surface placeholder:text-on-surface-variant/50 text-body-sm transition-all outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-on-surface-variant hover:text-on-surface"
            >
              <Icon name="close" className="text-[16px]" />
            </button>
          )}
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1 bg-surface-container p-1 rounded-xl border border-surface-container-highest/60">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-body-sm font-semibold transition-all ${
              statusFilter === 'ALL'
                ? 'bg-primary text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            All ({customers.length})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-body-sm font-semibold transition-all ${
              statusFilter === 'ACTIVE'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setStatusFilter('INACTIVE')}
            className={`px-3 py-1.5 rounded-lg text-body-sm font-semibold transition-all ${
              statusFilter === 'INACTIVE'
                ? 'bg-surface-container-highest text-on-surface shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Inactive
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-6 rounded-2xl bg-error/10 border border-error/30 text-error flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Icon name="error" className="text-[24px] shrink-0 mt-0.5" />
            <div>
              <h3 className="font-title-md font-bold">Failed to load customer list</h3>
              <p className="text-body-sm opacity-90 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchUsers}
            className="px-4 py-2 rounded-xl bg-error text-on-error font-semibold text-body-sm hover:opacity-90 transition-opacity shrink-0"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="rounded-3xl bg-surface-container-high/40 border border-surface-container-highest/60 p-6 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-surface-container/60 animate-pulse border border-surface-container-highest/30 flex items-center px-4 gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-surface-container-highest/60" />
              <div className="flex-1 space-y-2">
                <div className="w-48 h-4 bg-surface-container-highest/60 rounded" />
                <div className="w-32 h-3 bg-surface-container-highest/40 rounded" />
              </div>
              <div className="w-24 h-6 bg-surface-container-highest/50 rounded-full hidden sm:block" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredCustomers.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-surface-container-high/40 border border-surface-container-highest/60 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center text-primary mx-auto">
            <Icon name="group_off" className="text-[32px]" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="font-title-lg font-bold text-on-surface">No customers found</h3>
            <p className="text-body-sm text-on-surface-variant mt-1">
              {searchQuery || statusFilter !== 'ALL'
                ? 'No customer records match your filter criteria. Try resetting your search.'
                : 'No customer accounts currently registered in the database.'}
            </p>
          </div>
          {(searchQuery || statusFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-bright text-primary font-semibold text-body-sm border border-surface-container-highest transition-all"
            >
              Clear Filters
            </button>
          )}
        </div>
      )}

      {/* Customers Table / List */}
      {!loading && !error && filteredCustomers.length > 0 && (
        <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 overflow-hidden shadow-xl">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-container-highest/80 bg-surface-container-low/80 text-on-surface-variant text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Customer</th>
                  <th className="py-4 px-6">Email Address</th>
                  <th className="py-4 px-6">Phone</th>
                  <th className="py-4 px-6">Location</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-highest/40 text-body-sm">
                {filteredCustomers.map((cust) => {
                  const initial = (cust.fullName || cust.email || 'C').charAt(0).toUpperCase();
                  const isActive = cust.isActive !== false;

                  return (
                    <tr
                      key={cust.id}
                      className="hover:bg-surface-container-high/80 transition-colors group"
                    >
                      {/* Name & Avatar */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center text-sm shrink-0">
                            {initial}
                          </div>
                          <div>
                            <span className="font-semibold text-on-surface block group-hover:text-primary transition-colors">
                              {cust.fullName || 'Unnamed Host'}
                            </span>
                            <span className="text-[11px] text-on-surface-variant/80 font-mono">
                              ID: {cust.id ? cust.id.substring(0, 12) + (cust.id.length > 12 ? '...' : '') : 'N/A'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-4 px-6 text-on-surface-variant">
                        <div className="flex items-center gap-2">
                          <Icon name="mail" className="text-[16px] opacity-60" />
                          <span className="truncate max-w-[200px]">{cust.email || 'Not provided'}</span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-4 px-6 text-on-surface-variant">
                        <div className="flex items-center gap-2">
                          <Icon name="call" className="text-[16px] opacity-60" />
                          <span>{cust.phone || 'Not provided'}</span>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="py-4 px-6 text-on-surface-variant">
                        <div className="flex items-center gap-2">
                          <Icon name="location_on" className="text-[16px] opacity-60 text-primary" />
                          <span>{cust.location || 'Not provided'}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-label-sm font-bold tracking-wide uppercase ${
                            isActive
                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isActive ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                            }`}
                          />
                          <span>{isActive ? 'Active' : 'Inactive'}</span>
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="py-4 px-6 text-on-surface-variant font-medium">
                        {formatDate(cust.createdAt)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile / Tablet Cards View */}
          <div className="lg:hidden divide-y divide-surface-container-highest/40 p-4 space-y-4">
            {filteredCustomers.map((cust) => {
              const initial = (cust.fullName || cust.email || 'C').charAt(0).toUpperCase();
              const isActive = cust.isActive !== false;

              return (
                <div
                  key={cust.id}
                  className="p-4 rounded-2xl bg-surface-container/60 border border-surface-container-highest/60 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center text-sm shrink-0">
                        {initial}
                      </div>
                      <div>
                        <h4 className="font-semibold text-on-surface text-body-md">
                          {cust.fullName || 'Unnamed Host'}
                        </h4>
                        <p className="text-[11px] text-on-surface-variant/80 font-mono">
                          ID: {cust.id ? cust.id.substring(0, 10) + '...' : 'N/A'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isActive
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                          : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                      }`}
                    >
                      <span>{isActive ? 'Active' : 'Inactive'}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-body-sm text-on-surface-variant pt-2 border-t border-surface-container-highest/40">
                    <div className="flex items-center gap-2">
                      <Icon name="mail" className="text-[16px] text-primary" />
                      <span className="truncate">{cust.email || 'Not provided'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon name="call" className="text-[16px] text-primary" />
                      <span>{cust.phone || 'Not provided'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon name="location_on" className="text-[16px] text-primary" />
                      <span>{cust.location || 'Not provided'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Icon name="calendar_today" className="text-[16px] text-primary" />
                      <span>Joined: {formatDate(cust.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table Footer with Count */}
          <div className="py-3 px-6 bg-surface-container-low/80 border-t border-surface-container-highest/60 flex items-center justify-between text-body-sm text-on-surface-variant">
            <span>
              Showing <strong>{filteredCustomers.length}</strong> of <strong>{customers.length}</strong> registered customer accounts
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
