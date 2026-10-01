import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Icon from '../components/common/Icon';
import { providersApi, adminApi, ApiError } from '../api/api';

export const AdminProviderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const [providerData, setProviderData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Status mutation state
  const [mutationLoading, setMutationLoading] = useState<boolean>(false);
  const [statusActionPending, setStatusActionPending] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  const fetchProviderDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res: any = await providersApi.getById(id);
      // Normalize response object safely
      const raw = res?.data || res?.provider || res;
      setProviderData(raw);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setError(err.message || 'Failed to load provider details from the backend.');
      } else {
        setError('Network connectivity failure. Unable to reach provider details endpoint.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviderDetails();
  }, [id]);

  // Handle initiating status change action with confirmation
  const handleInitiateStatusChange = (newStatus: string) => {
    setStatusActionPending(newStatus);
    setActionSuccessMessage(null);
    setActionErrorMessage(null);
    setShowConfirmModal(true);
  };

  // Handle confirming and executing PATCH /api/admin/providers/:id/status
  const handleConfirmStatusChange = async () => {
    if (!id || !statusActionPending || mutationLoading) return;

    setMutationLoading(true);
    setActionErrorMessage(null);
    setActionSuccessMessage(null);

    try {
      const res: any = await adminApi.updateProviderStatus(id, statusActionPending);

      const updatedStatus =
        res?.data?.status ||
        res?.data?.approvalStatus ||
        res?.status ||
        res?.approvalStatus ||
        statusActionPending;

      setActionSuccessMessage(
        `Provider status successfully updated to "${updatedStatus}".`
      );

      // Dismiss confirmation modal
      setShowConfirmModal(false);
      setStatusActionPending(null);

      // Authoritatively refresh data from backend to ensure persistent authoritative view
      await fetchProviderDetails();
    } catch (err: any) {
      if (err instanceof ApiError) {
        setActionErrorMessage(
          err.message || `Failed to update status to ${statusActionPending}.`
        );
      } else {
        setActionErrorMessage(
          'Network request failed while attempting to update provider status.'
        );
      }
      setShowConfirmModal(false);
    } finally {
      setMutationLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin py-12">
        <div className="space-y-6 animate-pulse">
          <div className="w-32 h-6 bg-surface-container-highest/60 rounded" />
          <div className="h-48 rounded-3xl bg-surface-container-high/60 border border-surface-container-highest/60" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-64 rounded-3xl bg-surface-container-high/60 col-span-2" />
            <div className="h-64 rounded-3xl bg-surface-container-high/60" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !providerData) {
    return (
      <div className="flex-1 max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin py-12">
        <div className="p-8 text-center rounded-3xl bg-surface-container-high/60 border border-surface-container-highest/60 space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-error/10 text-error flex items-center justify-center mx-auto">
            <Icon name="error" className="text-[32px]" />
          </div>
          <h2 className="font-title-lg font-bold text-on-surface">Unable to Load Provider</h2>
          <p className="text-body-sm text-on-surface-variant">
            {error || `Provider record with ID "${id}" could not be located.`}
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <Link
              to="/admin/providers"
              className="px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-bright text-on-surface font-semibold text-body-sm border border-surface-container-highest transition-all"
            >
              Back to Providers List
            </Link>
            <button
              onClick={fetchProviderDetails}
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-body-sm transition-all shadow-[0_0_15px_rgba(242,202,80,0.25)]"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Extract fields from providerData carefully
  const businessName =
    providerData.businessName ||
    providerData.business_name ||
    providerData.name ||
    providerData.fullName ||
    'Unnamed Business';

  const providerName =
    providerData.fullName ||
    providerData.full_name ||
    providerData.manager ||
    providerData.contactDemo?.manager ||
    'Not provided';

  const email =
    providerData.email ||
    providerData.contactDemo?.email ||
    'Not provided';

  const phone =
    providerData.phone ||
    providerData.contactDemo?.phone ||
    'Not provided';

  const category =
    providerData.category ||
    providerData.serviceCategory ||
    providerData.categoryName ||
    'Not provided';

  const location =
    providerData.location ||
    providerData.address ||
    providerData.contactDemo?.address ||
    'Not provided';

  const yearsExperience =
    providerData.yearsExperience ??
    providerData.years_experience ??
    providerData.experience ??
    'Not provided';

  const startingPrice =
    providerData.startingPrice ??
    providerData.starting_price ??
    providerData.price ??
    providerData.basePrice ??
    'Not provided';

  const description =
    providerData.description ||
    providerData.about ||
    'Not provided';

  const approvalStatus = (
    providerData.approvalStatus ||
    providerData.approval_status ||
    providerData.status ||
    'PENDING'
  ).toUpperCase();

  const isActive =
    providerData.isActive !== undefined
      ? providerData.isActive
      : providerData.is_active !== undefined
        ? providerData.is_active
        : true;

  const profileImage =
    providerData.profileImage ||
    providerData.profile_image ||
    providerData.image ||
    providerData.avatar;

  // Portfolio images
  const portfolioImages: string[] = Array.isArray(providerData.portfolioImages)
    ? providerData.portfolioImages
    : Array.isArray(providerData.portfolio_images)
      ? providerData.portfolio_images
      : Array.isArray(providerData.images)
        ? providerData.images
        : Array.isArray(providerData.categoryData?.portfolioImages)
          ? providerData.categoryData.portfolioImages
          : [];

  // Packages / Services
  const packages: any[] = Array.isArray(providerData.packages)
    ? providerData.packages
    : Array.isArray(providerData.categoryData?.packageInfo)
      ? providerData.categoryData.packageInfo
      : Array.isArray(providerData.services)
        ? providerData.services.map((s: any) =>
            typeof s === 'string' ? { name: s, price: 0 } : s
          )
        : [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return {
          bg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
          dot: 'bg-emerald-400',
          label: 'Approved Partner',
        };
      case 'REJECTED':
        return {
          bg: 'bg-rose-500/15 border-rose-500/40 text-rose-300',
          dot: 'bg-rose-400',
          label: 'Application Rejected',
        };
      case 'SUSPENDED':
        return {
          bg: 'bg-purple-500/15 border-purple-500/40 text-purple-300',
          dot: 'bg-purple-400',
          label: 'Suspended Account',
        };
      case 'PENDING':
      default:
        return {
          bg: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
          dot: 'bg-amber-400 animate-pulse',
          label: 'Pending Approval',
        };
    }
  };

  const statusBadge = getStatusBadge(approvalStatus);

  return (
    <div className="flex-1 max-w-[1440px] w-full mx-auto px-margin-mobile md:px-margin py-8 md:py-12 space-y-8">
      {/* Back link & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link
          to="/admin/providers"
          className="inline-flex items-center gap-2 text-body-sm font-semibold text-on-surface-variant hover:text-primary transition-colors group"
        >
          <Icon name="arrow_back" className="text-[18px] group-hover:-translate-x-1 transition-transform" />
          <span>Back to Provider Network</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchProviderDetails}
            disabled={mutationLoading}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-highest text-body-sm text-on-surface transition-all"
            title="Reload provider data from backend"
          >
            <Icon name="refresh" className={`text-[16px] ${loading ? 'animate-spin' : ''}`} />
            <span>Reload Dossier</span>
          </button>
        </div>
      </div>

      {/* Success Notification Alert */}
      {actionSuccessMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <Icon name="check_circle" className="text-[22px] text-emerald-400" />
            <span className="text-body-sm font-semibold">{actionSuccessMessage}</span>
          </div>
          <button
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-300 hover:text-white"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>
      )}

      {/* Error Notification Alert */}
      {actionErrorMessage && (
        <div className="p-4 rounded-2xl bg-error/15 border border-error/40 text-error flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <Icon name="error" className="text-[22px]" />
            <span className="text-body-sm font-semibold">{actionErrorMessage}</span>
          </div>
          <button
            onClick={() => setActionErrorMessage(null)}
            className="text-error hover:text-on-surface"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>
      )}

      {/* Header Profile Hero Card */}
      <div className="p-8 rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {profileImage ? (
              <img
                src={profileImage}
                alt={businessName}
                className="w-24 h-24 rounded-3xl object-cover border-2 border-primary/30 shadow-xl"
              />
            ) : (
              <div className="w-24 h-24 rounded-3xl bg-primary/10 border-2 border-primary/20 text-primary font-bold flex items-center justify-center text-3xl shadow-xl">
                {businessName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3.5 py-1 rounded-full bg-surface-container border border-surface-container-highest text-[11px] font-bold text-primary uppercase tracking-wider">
                  {category}
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full border text-[11px] font-bold tracking-wide uppercase ${statusBadge.bg}`}
                >
                  <span className={`w-2 h-2 rounded-full ${statusBadge.dot}`} />
                  <span>{statusBadge.label}</span>
                </span>

                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  <span>{isActive ? 'Account Active' : 'Account Inactive'}</span>
                </span>
              </div>

              <h1 className="font-display-hero text-headline-md md:text-headline-lg font-bold text-on-surface">
                {businessName}
              </h1>

              <p className="text-body-sm text-on-surface-variant flex items-center gap-2">
                <span>Contact Rep: <strong className="text-on-surface">{providerName}</strong></span>
                <span>•</span>
                <span className="font-mono text-[11px] opacity-70">ID: {id}</span>
              </p>
            </div>
          </div>

          {/* Action Decision Control Box */}
          <div className="bg-surface-container-lowest/80 p-5 rounded-2xl border border-surface-container-highest/80 space-y-3 shrink-0 lg:max-w-xs w-full">
            <span className="block text-[11px] font-bold uppercase tracking-widest text-primary">
              Governance Action
            </span>

            <div className="flex flex-col gap-2">
              {/* If Pending, primary actions are Approve and Reject */}
              {approvalStatus === 'PENDING' && (
                <>
                  <button
                    onClick={() => handleInitiateStatusChange('APPROVED')}
                    disabled={mutationLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-body-sm transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Icon name="check_circle" className="text-[18px]" />
                    <span>Approve Provider</span>
                  </button>

                  <button
                    onClick={() => handleInitiateStatusChange('REJECTED')}
                    disabled={mutationLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-body-sm transition-all shadow-[0_0_15px_rgba(244,63,94,0.3)] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Icon name="cancel" className="text-[18px]" />
                    <span>Reject Application</span>
                  </button>
                </>
              )}

              {/* If Approved, can Suspend, Reject or Reset to Pending */}
              {approvalStatus === 'APPROVED' && (
                <>
                  <button
                    onClick={() => handleInitiateStatusChange('SUSPENDED')}
                    disabled={mutationLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-body-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Icon name="pause_circle" className="text-[18px]" />
                    <span>Suspend Account</span>
                  </button>

                  <button
                    onClick={() => handleInitiateStatusChange('REJECTED')}
                    disabled={mutationLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-surface-container hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-body-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Icon name="cancel" className="text-[18px]" />
                    <span>Revoke &amp; Reject</span>
                  </button>
                </>
              )}

              {/* If Rejected or Suspended, can Re-Approve or Set to Pending */}
              {(approvalStatus === 'REJECTED' || approvalStatus === 'SUSPENDED') && (
                <>
                  <button
                    onClick={() => handleInitiateStatusChange('APPROVED')}
                    disabled={mutationLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-body-sm transition-all flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  >
                    <Icon name="check_circle" className="text-[18px]" />
                    <span>Approve &amp; Re-instate</span>
                  </button>

                  <button
                    onClick={() => handleInitiateStatusChange('PENDING')}
                    disabled={mutationLoading}
                    className="w-full py-2.5 px-4 rounded-xl bg-surface-container hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-body-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Icon name="pending" className="text-[18px]" />
                    <span>Set Back to Pending</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Detail Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Info & About & Packages */}
        <div className="lg:col-span-2 space-y-8">
          {/* About / Description Card */}
          <div className="p-8 rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 shadow-xl space-y-4">
            <h2 className="font-title-lg font-bold text-on-surface flex items-center gap-2">
              <Icon name="description" className="text-primary text-[22px]" />
              <span>About / Atelier Overview</span>
            </h2>
            <p className="text-body-md text-on-surface-variant leading-relaxed whitespace-pre-line">
              {description}
            </p>
          </div>

          {/* Packages & Services Offered */}
          <div className="p-8 rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-title-lg font-bold text-on-surface flex items-center gap-2">
                <Icon name="design_services" className="text-primary text-[22px]" />
                <span>Service Packages &amp; Offerings</span>
              </h2>
              <span className="text-body-sm text-on-surface-variant">
                {packages.length} package{packages.length === 1 ? '' : 's'} registered
              </span>
            </div>

            {packages.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-surface-container border border-surface-container-highest/60 text-on-surface-variant text-body-sm">
                No specific service packages configured by this provider.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {packages.map((pkg, idx) => (
                  <div
                    key={pkg.id || idx}
                    className="p-5 rounded-2xl bg-surface-container/70 border border-surface-container-highest/80 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-title-md font-bold text-on-surface">
                        {pkg.name || `Package #${idx + 1}`}
                      </h4>
                      <span className="font-display-hero text-title-md font-bold text-primary">
                        {pkg.price ? `₹${Number(pkg.price).toLocaleString('en-IN')}` : 'Custom Quote'}
                      </span>
                    </div>

                    {pkg.description && (
                      <p className="text-body-sm text-on-surface-variant leading-relaxed">
                        {pkg.description}
                      </p>
                    )}

                    {Array.isArray(pkg.features) && pkg.features.length > 0 && (
                      <ul className="space-y-1.5 pt-2 border-t border-surface-container-highest/40 text-body-sm text-on-surface-variant">
                        {pkg.features.map((feat: string, fIdx: number) => (
                          <li key={fIdx} className="flex items-center gap-2">
                            <Icon name="check" className="text-primary text-[16px] shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Portfolio Gallery */}
          <div className="p-8 rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-title-lg font-bold text-on-surface flex items-center gap-2">
                <Icon name="photo_library" className="text-primary text-[22px]" />
                <span>Portfolio Media</span>
              </h2>
              <span className="text-body-sm text-on-surface-variant">
                {portfolioImages.length} image{portfolioImages.length === 1 ? '' : 's'}
              </span>
            </div>

            {portfolioImages.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-surface-container border border-surface-container-highest/60 text-on-surface-variant text-body-sm">
                No portfolio gallery images uploaded by this provider.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {portfolioImages.map((imgUrl, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-2xl overflow-hidden bg-surface-container border border-surface-container-highest/80 group relative"
                  >
                    <img
                      src={imgUrl}
                      alt={`Portfolio asset ${i + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Key Coordinates Card */}
        <div className="space-y-6">
          <div className="p-8 rounded-3xl bg-surface-container-high/60 backdrop-blur-xl border border-surface-container-highest/60 shadow-xl space-y-6 sticky top-28">
            <h3 className="font-title-lg font-bold text-on-surface flex items-center gap-2">
              <Icon name="badge" className="text-primary text-[22px]" />
              <span>Provider Credentials</span>
            </h3>

            <div className="space-y-4 text-body-sm">
              <div className="p-4 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 space-y-1">
                <span className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
                  Email Address
                </span>
                <p className="font-semibold text-on-surface break-all">{email}</p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 space-y-1">
                <span className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
                  Phone Number
                </span>
                <p className="font-semibold text-on-surface">{phone}</p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 space-y-1">
                <span className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
                  Operational Location
                </span>
                <p className="font-semibold text-on-surface">{location}</p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 space-y-1">
                <span className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
                  Years of Experience
                </span>
                <p className="font-semibold text-on-surface">
                  {yearsExperience !== 'Not provided' ? `${yearsExperience} Years` : 'Not provided'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 space-y-1">
                <span className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
                  Starting Price
                </span>
                <p className="font-semibold text-primary font-display-hero text-title-md">
                  {startingPrice !== 'Not provided' && startingPrice !== ''
                    ? `₹${Number(startingPrice).toLocaleString('en-IN')}`
                    : 'Not provided'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Status Updates */}
      {showConfirmModal && statusActionPending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-md w-full rounded-3xl bg-surface-container-high border border-surface-container-highest p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${
                  statusActionPending === 'APPROVED'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : statusActionPending === 'REJECTED'
                      ? 'bg-rose-500/20 text-rose-400'
                      : 'bg-amber-500/20 text-amber-400'
                }`}
              >
                <Icon
                  name={
                    statusActionPending === 'APPROVED'
                      ? 'verified'
                      : statusActionPending === 'REJECTED'
                        ? 'cancel'
                        : 'help_outline'
                  }
                />
              </div>
              <div>
                <h3 className="font-title-lg font-bold text-on-surface">Confirm Status Change</h3>
                <p className="text-body-sm text-on-surface-variant">
                  Update provider standing in backend
                </p>
              </div>
            </div>

            <p className="text-body-md text-on-surface-variant leading-relaxed">
              Are you sure you want to change the status of{' '}
              <strong className="text-on-surface">{businessName}</strong> to{' '}
              <strong className="text-primary uppercase tracking-wide">{statusActionPending}</strong>?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setStatusActionPending(null);
                }}
                disabled={mutationLoading}
                className="px-5 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-highest text-on-surface font-semibold text-body-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmStatusChange}
                disabled={mutationLoading}
                className={`px-5 py-2.5 rounded-xl font-bold text-body-sm text-white transition-all shadow-lg flex items-center gap-2 cursor-pointer ${
                  statusActionPending === 'APPROVED'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/40'
                    : statusActionPending === 'REJECTED'
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/40'
                      : 'bg-amber-600 hover:bg-amber-500 shadow-amber-900/40'
                }`}
              >
                {mutationLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm &amp; Apply</span>
                    <Icon name="check" className="text-[16px]" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProviderDetailPage;
