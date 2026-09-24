import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/common/Icon';
import { getCustomerProfile, saveCustomerProfile, getCustomerSession } from '../utils/customerAuth';
import { CustomerProfileData } from './CustomerSignupPage';
import { EventPlanData } from '../types/event';

export const CustomerProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<CustomerProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    location: '',
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Summary counts
  const [eventPlan, setEventPlan] = useState<EventPlanData | null>(null);
  const [bookingsCount, setBookingsCount] = useState<number>(0);
  const [selectedServicesCount, setSelectedServicesCount] = useState<number>(0);

  useEffect(() => {
    const p = getCustomerProfile();
    if (p) {
      setProfile(p);
      setEditForm({
        fullName: p.fullName,
        phone: p.phone,
        location: p.location,
      });
    } else {
      const session = getCustomerSession();
      if (session) {
        const fallback: CustomerProfileData = {
          fullName: session.fullName,
          email: session.email,
          phone: session.phone || '+91 98470 11223',
          location: session.location || 'Kerala, India',
          createdAt: new Date().toISOString(),
        };
        setProfile(fallback);
        setEditForm({
          fullName: fallback.fullName,
          phone: fallback.phone,
          location: fallback.location,
        });
      }
    }

    // Load event summary
    try {
      const ev = localStorage.getItem('eva_ai_event');
      if (ev) setEventPlan(JSON.parse(ev));
    } catch (e) {
      console.warn('Failed reading eva_ai_event:', e);
    }

    // Load bookings count
    try {
      const bk = localStorage.getItem('eva_ai_bookings');
      if (bk) {
        const arr = JSON.parse(bk);
        if (Array.isArray(arr)) setBookingsCount(arr.length);
      }
    } catch (e) {
      console.warn('Failed reading eva_ai_bookings:', e);
    }

    // Load selected services count
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const updated: CustomerProfileData = {
      ...profile,
      fullName: editForm.fullName.trim() || profile.fullName,
      phone: editForm.phone.trim() || profile.phone,
      location: editForm.location.trim() || profile.location,
    };

    saveCustomerProfile(updated);
    setProfile(updated);
    setIsEditing(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
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

          <Link
            to="/customer/dashboard"
            className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors py-1.5 px-3 rounded-xl bg-surface-container/60 hover:bg-surface-container border border-surface-container-highest/60"
          >
            <Icon name="arrow_back" className="text-[16px]" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Success toast */}
        {saveSuccess && (
          <div className="p-3.5 rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-medium flex items-center gap-2.5 animate-in fade-in duration-150">
            <Icon name="check_circle" className="text-[18px]" />
            <span>Profile details updated successfully.</span>
          </div>
        )}

        {/* Profile Card */}
        <div className="rounded-3xl bg-surface-container-high/60 backdrop-blur-xl p-8 sm:p-10 shadow-2xl border border-surface-container-highest/60 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-surface-container-highest/60">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 text-primary font-bold text-2xl flex items-center justify-center border border-primary/35 shadow-[0_0_20px_rgba(242,202,80,0.2)]">
                {initial}
              </div>
              <div>
                <span className="font-label-sm text-[11px] uppercase tracking-widest text-primary font-bold block">
                  Event Host Account
                </span>
                <h1 className="font-headline-sm text-2xl sm:text-3xl font-bold text-on-surface mt-0.5">
                  {profile?.fullName || 'Event Host'}
                </h1>
                <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
                  {profile?.email}
                </p>
              </div>
            </div>

            <div>
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
                  onClick={() => setIsEditing(false)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-container hover:bg-surface-bright text-xs font-semibold text-on-surface-variant transition-colors"
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
                    onChange={(e) => setEditForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container text-on-surface border border-surface-container-highest focus:border-primary focus:outline-none text-sm"
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
                    onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container text-on-surface border border-surface-container-highest focus:border-primary focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                    Primary Location
                  </label>
                  <input
                    type="text"
                    value={editForm.location}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl bg-surface-container text-on-surface border border-surface-container-highest focus:border-primary focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl bg-surface-container text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-primary hover:bg-tertiary text-on-primary text-xs font-bold transition-all shadow-[0_0_15px_rgba(242,202,80,0.3)]"
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="p-4 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 space-y-1">
                <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold block">
                  Full Name
                </span>
                <p className="text-sm font-semibold text-on-surface">{profile?.fullName || 'Not specified'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 space-y-1">
                <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold block">
                  Email Address
                </span>
                <p className="text-sm font-semibold text-on-surface">{profile?.email || 'Not specified'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 space-y-1">
                <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold block">
                  Phone Number
                </span>
                <p className="text-sm font-semibold text-on-surface">{profile?.phone || 'Not specified'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 space-y-1">
                <span className="text-[11px] text-on-surface-variant uppercase tracking-wider font-semibold block">
                  Location
                </span>
                <p className="text-sm font-semibold text-on-surface">{profile?.location || 'Not specified'}</p>
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
                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                  <Icon name="celebration" className="text-[20px]" />
                </div>
                <div>
                  <span className="text-[11px] text-on-surface-variant uppercase tracking-wider block">
                    Event Plan
                  </span>
                  <p className="text-sm font-bold text-on-surface">
                    {eventPlan ? eventPlan.eventType : 'No Event Set'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                  <Icon name="check_box" className="text-[20px]" />
                </div>
                <div>
                  <span className="text-[11px] text-on-surface-variant uppercase tracking-wider block">
                    Selected Services
                  </span>
                  <p className="text-sm font-bold text-on-surface">
                    {selectedServicesCount} {selectedServicesCount === 1 ? 'Service' : 'Services'}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-surface-container/60 border border-surface-container-highest/40 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                  <Icon name="receipt_long" className="text-[20px]" />
                </div>
                <div>
                  <span className="text-[11px] text-on-surface-variant uppercase tracking-wider block">
                    Booking Requests
                  </span>
                  <p className="text-sm font-bold text-on-surface">
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
