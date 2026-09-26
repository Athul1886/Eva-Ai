import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/common/Icon';
import { getCustomerProfile, saveCustomerProfile, getCustomerSession } from '../utils/customerAuth';
import { CustomerProfileData } from './CustomerSignupPage';
import { EventPlanData } from '../types/event';
import { authApi, ApiError, getStoredAccessToken } from '../api/api';

export const CustomerProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<CustomerProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    location: '',
  });
  const [toastNotice, setToastNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Summary counts
  const [eventPlan, setEventPlan] = useState<EventPlanData | null>(null);
  const [bookingsCount, setBookingsCount] = useState<number>(0);
  const [selectedServicesCount, setSelectedServicesCount] = useState<number>(0);

  const showToast = (message: string, type: 'success' | 'error' = 'success', duration = 3500) => {
    setToastNotice({ message, type });
    setTimeout(() => {
      setToastNotice((prev) => (prev?.message === message ? null : prev));
    }, duration);
  };

  const loadProfile = useCallback(async (silent = false) => {
    // 1. Initial fast local cache read for layout responsiveness
    const cachedProfile = getCustomerProfile();
    const session = getCustomerSession();

    if (cachedProfile) {
      setProfile(cachedProfile);
      setEditForm({
        fullName: cachedProfile.fullName || '',
        phone: cachedProfile.phone || '',
        location: cachedProfile.location || '',
      });
    } else if (session) {
      const fallback: CustomerProfileData = {
        fullName: session.fullName || '',
        email: session.email || '',
        phone: session.phone || '',
        location: session.location || '',
        createdAt: session.loginAt || new Date().toISOString(),
      };
      setProfile(fallback);
      setEditForm({
        fullName: fallback.fullName,
        phone: fallback.phone,
        location: fallback.location,
      });
    }

    // 2. Fetch authoritative customer profile from backend via GET /auth/me
    const token = getStoredAccessToken();
    if (token) {
      try {
        if (!silent) setIsLoading(true);
        const res: any = await authApi.me();
        const user = res?.data?.user || res?.user || res?.data;

        if (user && typeof user === 'object') {
          const backendProfile: CustomerProfileData = {
            fullName: user.fullName || user.name || cachedProfile?.fullName || session?.fullName || '',
            email: user.email || cachedProfile?.email || session?.email || '',
            phone: user.phone || cachedProfile?.phone || session?.phone || '',
            location: user.location || cachedProfile?.location || session?.location || '',
            createdAt: user.createdAt || user.created_at || cachedProfile?.createdAt || new Date().toISOString(),
          };

          // Backend data is authoritative source of truth
          setProfile(backendProfile);
          setEditForm({
            fullName: backendProfile.fullName,
            phone: backendProfile.phone,
            location: backendProfile.location,
          });
          saveCustomerProfile(backendProfile);
        }
      } catch (err: any) {
        console.warn('Failed fetching authoritative customer profile from backend:', err);
        if (err instanceof ApiError) {
          if (err.status === 401) {
            // Handled by centralized auth invalidation
          } else if (err.status === 403) {
            showToast('Account access restricted or deactivated.', 'error');
          }
        }
      } finally {
        if (!silent) setIsLoading(false);
      }
    }

    // 3. Load summary counts from local cache
    try {
      const ev = localStorage.getItem('eva_ai_event');
      if (ev) setEventPlan(JSON.parse(ev));
    } catch (e) {
      console.warn('Failed reading eva_ai_event:', e);
    }

    try {
      const bk = localStorage.getItem('eva_ai_bookings');
      if (bk) {
        const arr = JSON.parse(bk);
        if (Array.isArray(arr)) setBookingsCount(arr.length);
      }
    } catch (e) {
      console.warn('Failed reading eva_ai_bookings:', e);
    }

    try {
      const sv = localStorage.getItem('eva_ai_selected_services');
      if (sv) {
        const arr = JSON.parse(sv);
        if (Array.isArray(arr)) setSelectedServicesCount(arr.length);
      }
    } catch (e) {
      console.warn('Failed reading eva_ai_selected_services:', e);
    }
  }, []);

  useEffect(() => {
    loadProfile(false);

    const handleSync = () => {
      loadProfile(true);
    };

    window.addEventListener('eva_ai_customer_session_updated', handleSync);
    window.addEventListener('eva_ai_customer_profile_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('eva_ai_customer_session_updated', handleSync);
      window.removeEventListener('eva_ai_customer_profile_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadProfile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || isSaving) return;

    const payload = {
      fullName: editForm.fullName.trim() || profile.fullName,
      phone: editForm.phone.trim() || profile.phone,
      location: editForm.location.trim() || profile.location,
    };

    setIsSaving(true);

    try {
      // Authoritative backend request: PUT /auth/me
      const res: any = await authApi.updateMe(payload);
      const updatedUser = res?.data?.user || res?.user || res?.data;

      const updatedProfile: CustomerProfileData = {
        fullName: updatedUser?.fullName || payload.fullName,
        email: updatedUser?.email || profile.email,
        phone: updatedUser?.phone || payload.phone,
        location: updatedUser?.location || payload.location,
        createdAt: updatedUser?.createdAt || profile.createdAt || new Date().toISOString(),
      };

      // Update state and local cache
      setProfile(updatedProfile);
      saveCustomerProfile(updatedProfile);
      setIsEditing(false);
      showToast('Profile details updated successfully.', 'success');
    } catch (err: any) {
      console.warn('Failed updating customer profile on backend:', err);
      if (err instanceof ApiError) {
        if (err.status === 400) {
          showToast(err.message || 'Validation error: Please check the entered profile fields.', 'error');
        } else if (err.status === 401) {
          // Handled by token refresh / auth invalidation
        } else if (err.status === 403) {
          showToast('Permission denied: Unable to modify profile.', 'error');
        } else {
          showToast(err.message || 'Server error updating profile. Please try again.', 'error');
        }
      } else {
        showToast('Network error: Unable to reach server. Please check your connection.', 'error');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      setEditForm({
        fullName: profile.fullName || '',
        phone: profile.phone || '',
        location: profile.location || '',
      });
    }
    setIsEditing(false);
  };

  const initial = (profile?.fullName || 'E').charAt(0).toUpperCase();

  return (
    <main className="flex-1 pt-28 pb-20 relative overflow-hidden">
      {/* Atmospheric glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-0 w-96 h-96 bg-secondary-container/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl w-full mx-auto px-margin-mobile md:px-margin relative z-10 space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-on-surface-variant">
            <Link to="/customer/dashboard" className="hover:text-primary transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-primary font-semibold">My Profile</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => loadProfile(false)}
              disabled={isLoading || isSaving}
              className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors py-1.5 px-3 rounded-xl bg-surface-container/60 hover:bg-surface-container border border-surface-container-highest/60"
              title="Refresh profile from server"
            >
              <Icon name="refresh" className={`text-[16px] ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{isLoading ? 'Syncing...' : 'Sync'}</span>
            </button>
            <Link
              to="/customer/dashboard"
              className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors py-1.5 px-3 rounded-xl bg-surface-container/60 hover:bg-surface-container border border-surface-container-highest/60"
            >
              <Icon name="arrow_back" className="text-[16px]" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>

        {/* Toast Notification */}
        {toastNotice && (
          <div
            className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2.5 animate-in fade-in duration-150 ${
              toastNotice.type === 'error'
                ? 'bg-error-container/80 border-error/40 text-on-error-container'
                : 'bg-primary/15 border-primary/30 text-primary'
            }`}
          >
            <Icon
              name={toastNotice.type === 'error' ? 'error' : 'check_circle'}
              className="text-[18px] shrink-0"
            />
            <span>{toastNotice.message}</span>
          </div>
        )}

        {/* Profile Card */}
        <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-xl p-6 sm:p-10 shadow-2xl border border-surface-container-highest/60 space-y-8 min-w-0">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-surface-container-highest/60 min-w-0">
            <div className="flex items-center gap-4 sm:gap-5 min-w-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary/20 text-primary font-bold text-2xl flex items-center justify-center border border-primary/35 shadow-[0_0_20px_rgba(242,202,80,0.2)] shrink-0">
                {initial}
              </div>
              <div className="min-w-0">
                <span className="font-label-sm text-[11px] uppercase tracking-widest text-primary font-bold block">
                  Event Host Account
                </span>
                <h1 className="font-headline-sm text-xl sm:text-3xl font-bold text-on-surface mt-0.5 truncate">
                  {profile?.fullName || 'Event Host'}
                </h1>
                <p className="font-body-sm text-xs text-on-surface-variant mt-0.5 truncate">
                  {profile?.email}
                </p>
              </div>
            </div>

            <div className="shrink-0">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-bright text-xs font-semibold text-on-surface hover:text-primary border border-surface-container-highest transition-colors"
                >
                  <Icon name="edit" className="text-[16px]" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-bright disabled:opacity-50 text-xs font-semibold text-on-surface-variant transition-colors"
                >
                  <Icon name="close" className="text-[16px]" />
                  <span>Cancel</span>
                </button>
              )}
            </div>
          </div>

          {/* Profile Details (Read or Edit) */}
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={editForm.fullName}
                    disabled={isSaving}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container text-on-surface border border-surface-container-highest focus:border-primary focus:outline-none text-sm disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    disabled
                    value={profile?.email || ''}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container/50 text-on-surface-variant border border-surface-container cursor-not-allowed text-sm"
                  />
                  <span className="text-[10px] text-on-surface-variant mt-1 block">
                    Email address cannot be changed.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone}
                    disabled={isSaving}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container text-on-surface border border-surface-container-highest focus:border-primary focus:outline-none text-sm disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                    Primary Location
                  </label>
                  <input
                    type="text"
                    value={editForm.location}
                    disabled={isSaving}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container text-on-surface border border-surface-container-highest focus:border-primary focus:outline-none text-sm disabled:opacity-60"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleCancelEdit}
                  className="px-4 py-2 rounded-xl bg-surface-container text-xs font-semibold text-on-surface-variant hover:text-on-surface disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 rounded-xl bg-primary hover:bg-tertiary disabled:opacity-50 text-on-primary text-xs font-bold transition-all shadow-[0_0_15px_rgba(242,202,80,0.3)] flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="p-4 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 space-y-1">
                <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold block">
                  Full Name
                </span>
                <p className="text-sm font-semibold text-on-surface break-words">{profile?.fullName || 'Not specified'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 space-y-1">
                <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold block">
                  Email Address
                </span>
                <p className="text-sm font-semibold text-on-surface break-all">{profile?.email || 'Not specified'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 space-y-1">
                <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold block">
                  Phone Number
                </span>
                <p className="text-sm font-semibold text-on-surface break-words">{profile?.phone || 'Not specified'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 space-y-1">
                <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold block">
                  Location
                </span>
                <p className="text-sm font-semibold text-on-surface break-words">{profile?.location || 'Not specified'}</p>
              </div>
            </div>
          )}

          {/* Activity & Event Snapshot */}
          <div className="pt-6 border-t border-surface-container-highest/60 space-y-4">
            <h3 className="font-headline-sm text-base font-bold text-on-surface flex items-center gap-2">
              <Icon name="insights" className="text-primary text-[20px]" />
              <span>Planning Activity Overview</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Icon name="celebration" className="text-[20px]" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-on-surface-variant uppercase tracking-wider block">
                    Event Plan
                  </span>
                  <p className="text-sm font-bold text-on-surface truncate">
                    {eventPlan ? eventPlan.eventType : 'No Event Set'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Icon name="check_box" className="text-[20px]" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-on-surface-variant uppercase tracking-wider block">
                    Selected Services
                  </span>
                  <p className="text-sm font-bold text-on-surface truncate">
                    {selectedServicesCount} {selectedServicesCount === 1 ? 'Service' : 'Services'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <Icon name="receipt_long" className="text-[20px]" />
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] text-on-surface-variant uppercase tracking-wider block">
                    Booking Requests
                  </span>
                  <p className="text-sm font-bold text-on-surface truncate">
                    {bookingsCount} {bookingsCount === 1 ? 'Request' : 'Requests'}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action Links */}
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/customer/dashboard"
                className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-bright text-xs font-semibold text-on-surface hover:text-primary border border-surface-container-highest transition-colors inline-flex items-center gap-1.5"
              >
                <Icon name="space_dashboard" className="text-[16px]" />
                <span>Go to Dashboard</span>
              </Link>
              <Link
                to="/customer/services"
                className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-bright text-xs font-semibold text-on-surface hover:text-primary border border-surface-container-highest transition-colors inline-flex items-center gap-1.5"
              >
                <Icon name="explore" className="text-[16px]" />
                <span>Explore Services</span>
              </Link>
              <Link
                to="/customer/bookings"
                className="px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-bright text-xs font-semibold text-on-surface hover:text-primary border border-surface-container-highest transition-colors inline-flex items-center gap-1.5"
              >
                <Icon name="receipt_long" className="text-[16px]" />
                <span>View Bookings</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default CustomerProfilePage;
