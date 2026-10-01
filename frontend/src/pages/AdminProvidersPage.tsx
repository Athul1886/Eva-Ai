import React, { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../components/common/Icon';
import { providersApi, adminApi, ApiError, API_BASE_URL, API_ENDPOINTS } from '../api/api';

export interface AdminProviderItem {
  id: string;
  name?: string;
  businessName: string;
  fullName: string;
  email: string;
  phone: string;
  category: string;
  location: string;
  yearsExperience: string;
  startingPrice: string;
  approvalStatus: string;
  isActive: boolean;
  profileImage?: string;
  createdAt?: string;
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Defensive Data Normalization Helpers (Prevents React object-child crashes)
// ---------------------------------------------------------------------------

function extractCategory(item: any): string {
  if (!item) return 'General';
  const raw = item.category || item.serviceCategory || item.categoryName || item.categorySlug;
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();
  if (typeof raw === 'object' && raw !== null) {
    const name = raw.name || raw.title || raw.label || raw.categoryName || raw.slug;
    if (typeof name === 'string' && name.trim().length > 0) return name.trim();
  }
  return 'General';
}

function extractLocation(item: any): string {
  if (!item) return 'Not provided';
  const raw = item.location || item.city || item.address;
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();
  if (typeof raw === 'object' && raw !== null) {
    const loc = raw.city || raw.address || raw.location || raw.name || raw.formatted;
    if (typeof loc === 'string' && loc.trim().length > 0) return loc.trim();
  }
  return 'Not provided';
}

function extractBusinessName(item: any): string {
  if (!item) return 'Not provided';
  const raw = item.businessName || item.business_name || item.name;
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();
  if (typeof raw === 'object' && raw !== null) {
    const bName = raw.businessName || raw.business_name || raw.name;
    if (typeof bName === 'string' && bName.trim().length > 0) return bName.trim();
  }
  return 'Not provided';
}

function extractFullName(item: any): string {
  if (!item) return 'Not provided';
  const raw = item.fullName || item.full_name || item.manager || item.user;
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();
  if (typeof raw === 'object' && raw !== null) {
    const fName = raw.fullName || raw.full_name || raw.name || raw.manager;
    if (typeof fName === 'string' && fName.trim().length > 0) return fName.trim();
  }
  return 'Not provided';
}

function extractEmail(item: any): string {
  if (!item) return 'Not provided';
  const raw = item.email || item.contactDemo?.email || item.user?.email;
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();
  return 'Not provided';
}

function extractPhone(item: any): string {
  if (!item) return 'Not provided';
  const raw = item.phone || item.contactDemo?.phone || item.user?.phone;
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();
  if (typeof raw === 'number') return String(raw);
  return 'Not provided';
}

function extractYearsExperience(item: any): string {
  if (!item) return 'Not provided';
  const raw = item.yearsExperience ?? item.years_experience ?? item.experience ?? item.experienceYears;
  if (typeof raw === 'number' || typeof raw === 'string') {
    const str = String(raw).trim();
    return str.length > 0 ? str : 'Not provided';
  }
  return 'Not provided';
}

function extractStartingPrice(item: any): string {
  if (!item) return 'Not provided';
  const raw = item.startingPrice ?? item.starting_price ?? item.price ?? item.basePrice;
  if (typeof raw === 'number' || typeof raw === 'string') {
    const str = String(raw).trim();
    return str.length > 0 ? str : 'Not provided';
  }
  return 'Not provided';
}

function extractApprovalStatus(item: any): string {
  if (!item) return 'PENDING';
  const raw = item.approvalStatus || item.approval_status || item.status;
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim().toUpperCase();
  if (typeof raw === 'object' && raw !== null) {
    const s = raw.status || raw.approvalStatus || raw.name;
    if (typeof s === 'string' && s.trim().length > 0) return s.trim().toUpperCase();
  }
  return 'PENDING';
}

export const AdminProvidersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatusFilter = (searchParams.get('status') || 'ALL').toUpperCase();

  const [providers, setProviders] = useState<AdminProviderItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatusFilter);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchProviders = async () => {
    setLoading(true);
    setError(null);
    try {
      let rawList: any[] = [];

      if (selectedStatus === 'PENDING') {
        const url = `${API_BASE_URL}${API_ENDPOINTS.ADMIN_PROVIDERS_PENDING}`;
        console.log("Admin pending providers request:", url);
        const res: any = await adminApi.getPendingProviders();
        console.log("Admin pending providers response:", res);
        console.log("Admin pending providers count:", res?.providers?.length);
        console.log("Admin pending provider IDs:", res?.providers?.map((p: any) => p?.id));

        rawList = Array.isArray(res?.providers)
          ? res.providers
          : Array.isArray(res?.data?.providers)
            ? res.data.providers
            : Array.isArray(res?.data)
              ? res.data
              : [];
      } else if (selectedStatus === 'ALL') {
        try {
          const [allRes, pendingRes]: [any, any] = await Promise.all([
            providersApi.getAll().catch(() => ({ providers: [] })),
            adminApi.getPendingProviders().catch(() => ({ providers: [] })),
          ]);

          const approvedList = Array.isArray(allRes?.providers)
            ? allRes.providers
            : Array.isArray(allRes?.data?.providers)
              ? allRes.data.providers
              : Array.isArray(allRes?.data)
                ? allRes.data
                : Array.isArray(allRes)
                  ? allRes
                  : [];

          const pendingList = Array.isArray(pendingRes?.providers)
            ? pendingRes.providers
            : Array.isArray(pendingRes?.data?.providers)
              ? pendingRes.data.providers
              : Array.isArray(pendingRes?.data)
                ? pendingRes.data
                : [];

          const map = new Map<string, any>();
          approvedList.forEach((item: any) => {
            if (!item) return;
            const id = String(item.id || item._id || item.providerId || item.provider_id || Math.random());
            map.set(id, item);
          });
          pendingList.forEach((item: any) => {
            if (!item) return;
            const id = String(item.id || item._id || item.providerId || item.provider_id || Math.random());
            map.set(id, item);
          });
          rawList = Array.from(map.values());
        } catch {
          const res: any = await providersApi.getAll();
          rawList = Array.isArray(res?.providers)
            ? res.providers
            : Array.isArray(res?.data?.providers)
              ? res.data.providers
              : Array.isArray(res?.data)
                ? res.data
                : [];
        }
      } else {
        const res: any = await providersApi.getAll();
        rawList =
          Array.isArray(res?.data?.providers)
            ? res.data.providers
            : Array.isArray(res?.data)
              ? res.data
              : Array.isArray(res?.providers)
                ? res.providers
                : Array.isArray(res)
                  ? res
                  : [];
      }

      // Safe normalization
      const normalized: AdminProviderItem[] = rawList
        .filter((item: any) => item && typeof item === 'object')
        .map((item: any) => {
          const id = String(item.id || item._id || item.providerId || item.provider_id || Math.random());
          const businessName = extractBusinessName(item);
          const fullName = extractFullName(item);
          const email = extractEmail(item);
          const phone = extractPhone(item);
          const category = extractCategory(item);
          const location = extractLocation(item);
          const yearsExperience = extractYearsExperience(item);
          const startingPrice = extractStartingPrice(item);
          const approvalStatus = extractApprovalStatus(item);
          const isActive =
            item.isActive !== undefined
              ? Boolean(item.isActive)
              : item.is_active !== undefined
                ? Boolean(item.is_active)
                : true;
          const profileImage = typeof item.profileImage === 'string' ? item.profileImage : undefined;

          return {
            id,
            businessName,
            fullName,
            email,
            phone,
            category,
            location,
            yearsExperience,
            startingPrice,
            approvalStatus,
            isActive,
            profileImage,
            createdAt: typeof item.createdAt === 'string' ? item.createdAt : undefined,
          };
        });

      setProviders(normalized);
    } catch (err: any) {
      console.error('Error in fetchProviders:', err);
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to fetch provider directory from backend.');
      } else {
        setError('Network connectivity error. Could not connect to the backend providers API.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [selectedStatus]);

  // Sync state if URL query param changes
  useEffect(() => {
    const statusFromUrl = searchParams.get('status');
    if (statusFromUrl) {
      setSelectedStatus(statusFromUrl.toUpperCase());
    } else {
      setSelectedStatus('ALL');
    }
  }, [searchParams]);

  // Handle Approve / Reject actions for Pending providers
  const handleUpdateStatus = async (providerId: string, newStatus: 'APPROVED' | 'REJECTED') => {
    setActionLoadingId(providerId);
    try {
      await adminApi.updateProviderStatus(providerId, newStatus);
      // Re-fetch authoritatively from backend
      await fetchProviders();
    } catch (err: any) {
      console.error(`Error updating provider status to ${newStatus}:`, err);
      if (err instanceof ApiError) {
        alert(err.message || `Failed to update status to ${newStatus}`);
      } else {
        alert(`Network request failed while attempting to update status.`);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // Extract unique categories for filter dropdown
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    providers.forEach((p) => {
      const cat = typeof p.category === 'string' ? p.category.trim() : '';
      if (cat && cat !== 'General' && cat !== 'Not provided') {
        set.add(cat);
      }
    });
    return Array.from(set).sort();
  }, [providers]);

  // Filtered providers
  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      if (!p) return false;
      const pStatus = (typeof p.approvalStatus === 'string' ? p.approvalStatus : '').toUpperCase();

      // Status Filter
      if (selectedStatus !== 'ALL') {
        if (selectedStatus === 'PENDING' && pStatus !== 'PENDING') return false;
        if (selectedStatus === 'APPROVED' && pStatus !== 'APPROVED') return false;
        if (selectedStatus === 'REJECTED' && pStatus !== 'REJECTED') return false;
        if (selectedStatus === 'SUSPENDED' && pStatus !== 'SUSPENDED') return false;
      }

      // Category Filter
      if (selectedCategory !== 'ALL') {
        const cat = typeof p.category === 'string' ? p.category.toLowerCase() : '';
        if (cat !== selectedCategory.toLowerCase()) return false;
      }

      // Search Query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const matchName =
        (typeof p.businessName === 'string' && p.businessName.toLowerCase().includes(q)) ||
        (typeof p.fullName === 'string' && p.fullName.toLowerCase().includes(q));
      const matchCategory = typeof p.category === 'string' && p.category.toLowerCase().includes(q);
      const matchLocation = typeof p.location === 'string' && p.location.toLowerCase().includes(q);
      const matchEmail = typeof p.email === 'string' && p.email.toLowerCase().includes(q);
      return Boolean(matchName || matchCategory || matchLocation || matchEmail);
    });
  }, [providers, selectedStatus, selectedCategory, searchQuery]);

  const handleStatusTabChange = (status: string) => {
    setSelectedStatus(status);
    if (status === 'ALL') {
      searchParams.delete('status');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ status: status.toLowerCase() });
    }
  };

  const getStatusBadge = (status?: string) => {
    const s = (typeof status === 'string' ? status : 'PENDING').toUpperCase();
    switch (s) {
      case 'APPROVED':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          dot: 'bg-emerald-400',
          label: 'Approved',
        };
      case 'REJECTED':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
          dot: 'bg-rose-400',
          label: 'Rejected',
        };
      case 'SUSPENDED':
        return {
          bg: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
          dot: 'bg-purple-400',
          label: 'Suspended',
        };
      case 'PENDING':
      default:
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          dot: 'bg-amber-400 animate-pulse',
          label: 'Pending Review',
        };
    }
  };

  return (
    <div className="flex-1 max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin py-8 md:py-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-surface-container-highest/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] uppercase tracking-widest font-bold text-primary">
              Vendor Governance &amp; Verification
            </span>
          </div>
          <h1 className="font-display-hero text-headline-md md:text-headline-lg font-semibold text-on-surface">
            Provider <span className="text-primary italic font-normal">Network</span>
          </h1>
          <p className="text-body-md text-on-surface-variant mt-1">
            Manage atelier partner applications, approval status, category classification, and profile details.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchProviders}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-highest/80 text-on-surface text-body-sm font-semibold transition-all disabled:opacity-50"
            title="Refresh providers from backend"
          >
            <Icon name="refresh" className={`text-[18px] ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Providers</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="space-y-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {[
            { key: 'ALL', label: 'All Providers', count: providers.length },
            {
              key: 'PENDING',
              label: 'Pending Requests',
              count: providers.filter((p) => (p.approvalStatus || 'PENDING').toUpperCase() === 'PENDING').length,
            },
            {
              key: 'APPROVED',
              label: 'Approved',
              count: providers.filter((p) => (p.approvalStatus || '').toUpperCase() === 'APPROVED').length,
            },
            {
              key: 'REJECTED',
              label: 'Rejected',
              count: providers.filter((p) => (p.approvalStatus || '').toUpperCase() === 'REJECTED').length,
            },
            {
              key: 'SUSPENDED',
              label: 'Suspended',
              count: providers.filter((p) => (p.approvalStatus || '').toUpperCase() === 'SUSPENDED').length,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleStatusTabChange(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-body-sm font-semibold transition-all shrink-0 ${
                selectedStatus === tab.key
                  ? 'bg-primary text-on-primary shadow-[0_0_15px_rgba(242,202,80,0.25)] font-bold'
                  : 'bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-surface-container-highest/60'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  selectedStatus === tab.key
                    ? 'bg-on-primary/20 text-on-primary'
                    : 'bg-surface-container-highest text-on-surface-variant'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search Bar & Category Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-surface-container-high/60 backdrop-blur-xl p-4 rounded-2xl border border-surface-container-highest/60">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-on-surface-variant">
              <Icon name="search" className="text-[18px]" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by business name, category, city..."
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

          {/* Category Filter Dropdown */}
          <div className="flex items-center gap-2">
            <label className="text-body-sm font-semibold text-on-surface-variant hidden md:inline">
              Category:
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-surface-container border border-surface-container-highest/80 text-on-surface text-body-sm focus:border-primary outline-none transition-all cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-6 rounded-2xl bg-error/10 border border-error/30 text-error flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Icon name="error" className="text-[24px] shrink-0 mt-0.5" />
            <div>
              <h3 className="font-title-md font-bold">Failed to load providers list</h3>
              <p className="text-body-sm opacity-90 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchProviders}
            className="px-4 py-2 rounded-xl bg-error text-on-error font-semibold text-body-sm hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="p-6 rounded-3xl bg-surface-container-high/40 border border-surface-container-highest/60 animate-pulse space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-surface-container-highest/70" />
                <div className="flex-1 space-y-2">
                  <div className="w-32 h-4 bg-surface-container-highest/70 rounded" />
                  <div className="w-20 h-3 bg-surface-container-highest/50 rounded" />
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <div className="w-full h-3 bg-surface-container-highest/40 rounded" />
                <div className="w-2/3 h-3 bg-surface-container-highest/40 rounded" />
              </div>
              <div className="h-10 bg-surface-container-highest/50 rounded-xl" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredProviders.length === 0 && (
        <div className="p-12 text-center rounded-3xl bg-surface-container-high/40 border border-surface-container-highest/60 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center text-primary mx-auto">
            <Icon name="storefront" className="text-[32px]" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="font-title-lg font-bold text-on-surface">
              {selectedStatus === 'PENDING' ? 'No pending requests' : 'No providers found'}
            </h3>
            <p className="text-body-sm text-on-surface-variant mt-1">
              {searchQuery || selectedStatus !== 'ALL' || selectedCategory !== 'ALL'
                ? selectedStatus === 'PENDING'
                  ? 'There are currently no provider applications awaiting review.'
                  : 'No providers matched your current search or status filter criteria.'
                : 'No service providers currently registered in the database.'}
            </p>
          </div>
          {(searchQuery || selectedCategory !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
              }}
              className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-bright text-primary font-semibold text-body-sm border border-surface-container-highest transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}

      {/* Providers Grid / Cards */}
      {!loading && !error && filteredProviders.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProviders.map((prov) => {
            const statusStyle = getStatusBadge(prov.approvalStatus);
            const nameForInitial =
              prov.businessName !== 'Not provided'
                ? prov.businessName
                : prov.fullName !== 'Not provided'
                  ? prov.fullName
                  : 'P';
            const initial = nameForInitial.charAt(0).toUpperCase() || 'P';
            const isActive = prov.isActive !== false;
            const isPending = prov.approvalStatus === 'PENDING';

            return (
              <div
                key={prov.id}
                className="rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 hover:border-primary/40 transition-all p-6 shadow-xl flex flex-col justify-between group hover:-translate-y-1"
              >
                <div>
                  {/* Top Bar: Category & Approval Status */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <span className="px-3 py-1 rounded-full bg-surface-container border border-surface-container-highest/80 text-[11px] font-bold text-primary uppercase tracking-wider truncate">
                      {prov.category || 'Service Provider'}
                    </span>

                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px] font-bold tracking-wide uppercase shrink-0 ${statusStyle.bg}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot}`} />
                      <span>{statusStyle.label}</span>
                    </span>
                  </div>

                  {/* Provider Header */}
                  <div className="flex items-start gap-4 mb-4">
                    {prov.profileImage ? (
                      <img
                        src={prov.profileImage}
                        alt={prov.businessName}
                        className="w-14 h-14 rounded-2xl object-cover border border-surface-container-highest/80 shrink-0"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 text-primary font-bold flex items-center justify-center text-xl shrink-0">
                        {initial}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-title-lg font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                        {prov.businessName}
                      </h3>
                      <p className="text-body-sm text-on-surface-variant truncate">
                        {prov.fullName !== 'Not provided' ? `Applicant: ${prov.fullName}` : prov.email}
                      </p>
                    </div>
                  </div>

                  {/* Metadata items */}
                  <div className="space-y-2 py-3 border-y border-surface-container-highest/40 text-body-sm text-on-surface-variant">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 opacity-80">
                        <Icon name="person" className="text-[16px] text-primary" />
                        Full Name
                      </span>
                      <span className="font-semibold text-on-surface truncate max-w-[160px]">
                        {prov.fullName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 opacity-80">
                        <Icon name="storefront" className="text-[16px] text-primary" />
                        Business Name
                      </span>
                      <span className="font-semibold text-on-surface truncate max-w-[160px]">
                        {prov.businessName}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 opacity-80">
                        <Icon name="mail" className="text-[16px] text-primary" />
                        Email
                      </span>
                      <span className="font-semibold text-on-surface truncate max-w-[160px]">
                        {prov.email}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 opacity-80">
                        <Icon name="call" className="text-[16px] text-primary" />
                        Phone
                      </span>
                      <span className="font-semibold text-on-surface truncate max-w-[160px]">
                        {prov.phone}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 opacity-80">
                        <Icon name="location_on" className="text-[16px] text-primary" />
                        Location
                      </span>
                      <span className="font-semibold text-on-surface truncate max-w-[160px]">
                        {prov.location}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 opacity-80">
                        <Icon name="history_edu" className="text-[16px] text-primary" />
                        Experience
                      </span>
                      <span className="font-semibold text-on-surface">
                        {prov.yearsExperience !== 'Not provided' ? `${prov.yearsExperience} yrs` : 'Not provided'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                {isPending ? (
                  <div className="pt-5 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleUpdateStatus(prov.id, 'APPROVED')}
                        disabled={actionLoadingId === prov.id}
                        data-action="approve-provider"
                        className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-body-sm transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {actionLoadingId === prov.id ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Icon name="check_circle" className="text-[16px]" />
                            <span>Approve</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleUpdateStatus(prov.id, 'REJECTED')}
                        disabled={actionLoadingId === prov.id}
                        data-action="reject-provider"
                        className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-body-sm transition-all shadow-[0_0_12px_rgba(244,63,94,0.3)] flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {actionLoadingId === prov.id ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Icon name="cancel" className="text-[16px]" />
                            <span>Reject</span>
                          </>
                        )}
                      </button>
                    </div>

                    <Link
                      to={`/admin/providers/${prov.id}`}
                      className="w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-body-sm border border-surface-container-highest/80 transition-all flex items-center justify-center gap-2 group/btn"
                    >
                      <span>Inspect Details</span>
                      <Icon name="arrow_forward" className="text-[14px] group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                ) : (
                  <div className="pt-5">
                    <Link
                      to={`/admin/providers/${prov.id}`}
                      className="w-full py-3 rounded-xl bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface font-semibold text-body-sm border border-surface-container-highest/80 hover:border-primary transition-all flex items-center justify-center gap-2 group/btn"
                    >
                      <span>Inspect Provider Dossier</span>
                      <Icon name="arrow_forward" className="text-[16px] group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminProvidersPage;
