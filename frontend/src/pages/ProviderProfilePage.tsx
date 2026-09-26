import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import Icon from '../components/common/Icon';
import { ProviderAccount, ProviderSession, CategorySpecificData } from '../types/provider';
import {
  getProviderProfile,
  updateProviderProfile,
  compressImageFile,
  normalizeBackendProviderProfile,
  saveProviderAccount,
  setProviderSession,
} from '../utils/providerAuth';
import { providersApi, ApiError, getStoredAccessToken } from '../api/api';

export const ProviderProfilePage: React.FC = () => {
  const { session } = useOutletContext<{ session: ProviderSession }>();
  const [profile, setProfile] = useState<ProviderAccount | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<ProviderAccount>>({});
  const [editCategoryData, setEditCategoryData] = useState<CategorySpecificData>({});
  const [toastNotice, setToastNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Profile Photo Management State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFileError, setPhotoFileError] = useState<string | null>(null);
  const [isSavingPhoto, setIsSavingPhoto] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success', duration = 3500) => {
    setToastNotice({ message, type });
    setTimeout(() => {
      setToastNotice((prev) => (prev?.message === message ? null : prev));
    }, duration);
  };

  const loadProfile = useCallback(async (silent = false) => {
    const providerId = session?.providerId;
    if (!providerId) return;

    // 1. Initial fast local cache read for layout responsiveness
    const cachedProfile = getProviderProfile(providerId);
    if (cachedProfile) {
      setProfile(cachedProfile);
      setEditForm({
        businessName: cachedProfile.businessName,
        fullName: cachedProfile.fullName,
        phone: cachedProfile.phone,
        location: cachedProfile.location,
        description: cachedProfile.description,
        startingPrice: cachedProfile.startingPrice,
        yearsExperience: cachedProfile.yearsExperience,
      });
      setEditCategoryData(cachedProfile.categoryData || {});
    }

    // 2. Fetch authoritative provider profile from backend via GET /providers/profile
    const token = getStoredAccessToken();
    if (token) {
      try {
        if (!silent) setIsLoading(true);
        const res: any = await providersApi.getProfile();
        const normalized = normalizeBackendProviderProfile(res, cachedProfile);

        if (normalized) {
          // Backend data is authoritative source of truth
          setProfile(normalized);
          setEditForm({
            businessName: normalized.businessName,
            fullName: normalized.fullName,
            phone: normalized.phone,
            location: normalized.location,
            description: normalized.description,
            startingPrice: normalized.startingPrice,
            yearsExperience: normalized.yearsExperience,
          });
          setEditCategoryData(normalized.categoryData || {});
          saveProviderAccount(normalized);

          // Update active session if relevant fields changed
          if (session) {
            setProviderSession({
              ...session,
              providerId: normalized.id,
              businessName: normalized.businessName,
              fullName: normalized.fullName,
              email: normalized.email || session.email,
              category: normalized.category,
              profileImage: normalized.profileImage || session.profileImage,
            });
          }
        }
      } catch (err: any) {
        console.warn('Failed fetching authoritative provider profile from backend:', err);
        if (err instanceof ApiError) {
          if (err.status === 401) {
            // Handled by centralized auth
          } else if (err.status === 403) {
            showToast('Account access restricted or deactivated.', 'error');
          }
        }
      } finally {
        if (!silent) setIsLoading(false);
      }
    }
  }, [session]);

  useEffect(() => {
    loadProfile(false);

    const handleSync = () => {
      loadProfile(true);
    };

    window.addEventListener('eva_ai_provider_session_updated', handleSync);
    window.addEventListener('eva_ai_provider_profile_updated', handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener('eva_ai_provider_session_updated', handleSync);
      window.removeEventListener('eva_ai_provider_profile_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [loadProfile]);

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const providerId = session?.providerId;
    if (!providerId || !profile || isSaving) return;

    // Validate inputs
    const businessName = (editForm.businessName || profile.businessName || '').trim();
    const fullName = (editForm.fullName || profile.fullName || '').trim();
    if (!businessName || !fullName) {
      showToast('Please provide both brand name and lead partner name.', 'error');
      return;
    }

    // Decouple portfolio and pricing packages from profile payload (they have dedicated endpoints)
    const { portfolioImages: _ignoredPortfolio, packageInfo: _ignoredPackages, ...categorySpecializations } =
      (editCategoryData as any) || {};

    // Construct clean profile payload containing only supported profile fields
    const payload = {
      businessName,
      fullName,
      phone: (editForm.phone ?? profile.phone ?? '').trim(),
      location: (editForm.location ?? profile.location ?? '').trim(),
      description: (editForm.description ?? profile.description ?? '').trim(),
      startingPrice: Number(editForm.startingPrice ?? profile.startingPrice ?? 25000),
      yearsExperience: Number(editForm.yearsExperience ?? profile.yearsExperience ?? 5),
      category: profile.category,
      categoryData: categorySpecializations,
    };

    setIsSaving(true);

    try {
      // Authoritative backend request: PUT /providers/profile (without portfolio/pricing coupling)
      const res: any = await providersApi.updateProfile(payload);
      const normalized = normalizeBackendProviderProfile(res, {
        ...profile,
        ...payload,
        categoryData: {
          ...profile.categoryData,
          ...categorySpecializations,
          portfolioImages: profile.categoryData?.portfolioImages,
          packageInfo: profile.categoryData?.packageInfo,
        },
      });

      if (normalized) {
        setProfile(normalized);
        saveProviderAccount(normalized);

        // Keep active session synchronized
        if (session) {
          setProviderSession({
            ...session,
            providerId: normalized.id,
            businessName: normalized.businessName,
            fullName: normalized.fullName,
            category: normalized.category,
            profileImage: normalized.profileImage || session.profileImage,
          });
        }

        // Dispatch profile update events for cross-component live sync
        window.dispatchEvent(
          new CustomEvent('eva_ai_provider_profile_updated', { detail: { providerId: normalized.id } })
        );
        window.dispatchEvent(new Event('eva_ai_provider_session_updated'));
        window.dispatchEvent(new Event('storage'));

        setIsEditing(false);
        showToast('Profile and craft credentials saved successfully!', 'success');
      }
    } catch (err: any) {
      console.warn('Failed updating provider profile on backend:', err);
      if (err instanceof ApiError) {
        if (err.status === 400) {
          showToast(err.message || 'Validation error: Please verify entered profile fields.', 'error');
        } else if (err.status === 401) {
          // Handled by token refresh / auth invalidation
        } else if (err.status === 403) {
          showToast('Permission denied: Unable to modify provider profile.', 'error');
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

  // Local File Picker & Image Upload Logic with compression
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setPhotoFileError('Invalid file format. Please upload JPG, PNG, or WEBP images.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setPhotoFileError('File size exceeds 8MB limit. Please select a smaller image.');
      return;
    }

    try {
      // Compress to 400x400 avatar with high quality JPEG
      const compressed = await compressImageFile(file, 400, 400, 0.85);
      setPhotoPreview(compressed);
    } catch (err: any) {
      setPhotoFileError(err.message || 'Failed processing image. Please try another image.');
    }
  };

  const handleSavePhoto = async () => {
    if (!photoPreview || !session?.providerId || isSavingPhoto) return;
    setIsSavingPhoto(true);

    try {
      // Attempt backend update with image string
      let normalized: ProviderAccount | null = null;
      try {
        const res: any = await providersApi.updateProfile({ profileImage: photoPreview });
        normalized = normalizeBackendProviderProfile(res, profile);
      } catch (err) {
        console.warn('Backend image upload endpoint not available or rejected, fallback to local storage:', err);
      }

      const updated = normalized || updateProviderProfile(session.providerId, {
        profileImage: photoPreview,
      });

      if (updated) {
        setProfile(updated);
        setPhotoPreview(null);
        setPhotoFileError(null);
        showToast('Profile photo updated successfully!', 'success');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed updating profile photo.', 'error');
    } finally {
      setIsSavingPhoto(false);
    }
  };

  const handleCancelPhoto = () => {
    setPhotoPreview(null);
    setPhotoFileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancelEdit = () => {
    if (profile) {
      setEditForm({
        businessName: profile.businessName,
        fullName: profile.fullName,
        phone: profile.phone,
        location: profile.location,
        description: profile.description,
        startingPrice: profile.startingPrice,
        yearsExperience: profile.yearsExperience,
      });
      setEditCategoryData(profile.categoryData || {});
    }
    setIsEditing(false);
  };

  if (!profile) {
    return (
      <div className="p-8 text-center text-on-surface-variant">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <span>Loading atelier profile...</span>
      </div>
    );
  }

  const category = profile.category;
  const categoryData = profile.categoryData || {};

  // Check if there is category-specific data to display
  const hasCategorySpecificContent = () => {
    switch (category) {
      case 'Photographer':
        return !!(
          (categoryData.photographyStyles && categoryData.photographyStyles.length > 0) ||
          categoryData.equipment?.trim()
        );
      case 'Makeup Artist':
        return !!(categoryData.makeupTypes && categoryData.makeupTypes.length > 0);
      case 'Venue / Auditorium':
        return !!(
          categoryData.capacity ||
          categoryData.hasAC ||
          categoryData.hasParking ||
          categoryData.hasStage ||
          categoryData.hasDining ||
          categoryData.roomsCount ||
          categoryData.otherFacilities?.trim()
        );
      case 'Caterer':
        return !!(
          (categoryData.cuisineTypes && categoryData.cuisineTypes.length > 0) ||
          categoryData.pricePerPerson ||
          categoryData.minGuests ||
          categoryData.maxGuests
        );
      case 'Decorator':
        return !!(
          (categoryData.decorStyles && categoryData.decorStyles.length > 0) ||
          categoryData.previousExperience?.trim()
        );
      case 'DJ / Entertainment':
        return !!(
          (categoryData.entertainmentTypes && categoryData.entertainmentTypes.length > 0) ||
          categoryData.djEquipment?.trim() ||
          categoryData.equipment?.trim() ||
          (categoryData.eventTypesHandled && categoryData.eventTypesHandled.length > 0)
        );
      case 'Event Manager':
        return !!(
          (categoryData.eventTypesHandled && categoryData.eventTypesHandled.length > 0) ||
          categoryData.previousExperience?.trim()
        );
      default:
        return false;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Toast */}
      {toastNotice && (
        <div
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-surface-container-high/95 backdrop-blur-xl border shadow-2xl text-sm font-semibold flex items-center gap-3 animate-in slide-in-from-bottom duration-200 ${
            toastNotice.type === 'error'
              ? 'border-error/40 text-on-error-container bg-error-container/80'
              : 'border-secondary/40 text-secondary'
          }`}
        >
          <Icon
            name={toastNotice.type === 'error' ? 'error' : 'check_circle'}
            className="text-[20px] shrink-0"
          />
          <span>{toastNotice.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-surface-container/60 min-w-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-secondary/20 text-secondary border border-secondary/30">
              {profile.approvalStatus === 'PENDING' ? 'Pending Approval' : 'Verified Partner Dossier'}
            </span>
            <span className="text-xs text-outline">• ID: {profile.id}</span>
          </div>
          <h1 className="font-headline-sm text-2xl sm:text-3xl font-bold text-on-surface break-words">
            {profile.businessName}
          </h1>
          <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant mt-1 break-words">
            Manage your atelier profile photo, business details, and category-specific specializations.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => loadProfile(false)}
            disabled={isLoading || isSaving}
            className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-secondary transition-colors py-2 px-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-surface-container-highest/60 disabled:opacity-50"
            title="Refresh profile from backend"
          >
            <Icon name="refresh" className={`text-[16px] ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Syncing...' : 'Sync'}</span>
          </button>

          {isEditing ? (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleCancelEdit}
              className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold border border-surface-container-highest transition-colors w-full sm:w-auto disabled:opacity-50"
            >
              Cancel Edit
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary-fixed-dim text-on-secondary-fixed text-xs font-bold transition-all shadow-[0_0_15px_rgba(255,178,190,0.25)] flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Icon name="edit" className="text-[16px]" />
              <span>Edit Profile</span>
            </button>
          )}
        </div>
      </div>

      {isEditing ? (
        /* Edit Form */
        <form onSubmit={handleEditSave} className="p-4 sm:p-8 rounded-3xl bg-surface-container-high/60 backdrop-blur-2xl border border-surface-container-highest/60 shadow-xl space-y-6 min-w-0">
          <h2 className="text-base font-bold text-on-surface flex items-center gap-2 border-b border-surface-container pb-3">
            <Icon name="edit_note" className="text-secondary text-[20px]" />
            <span>Edit Atelier Credentials</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                Business / Brand Name
              </label>
              <input
                type="text"
                value={editForm.businessName || ''}
                onChange={(e) => setEditForm({ ...editForm, businessName: e.target.value })}
                className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                Lead Partner Name
              </label>
              <input
                type="text"
                value={editForm.fullName || ''}
                onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                Direct Phone
              </label>
              <input
                type="tel"
                value={editForm.phone || ''}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                Location / Operating City
              </label>
              <input
                type="text"
                value={editForm.location || ''}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                Starting Price (₹ INR)
              </label>
              <input
                type="number"
                value={editForm.startingPrice || ''}
                onChange={(e) => setEditForm({ ...editForm, startingPrice: Number(e.target.value) })}
                className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                Years of Experience
              </label>
              <input
                type="number"
                value={editForm.yearsExperience || ''}
                onChange={(e) => setEditForm({ ...editForm, yearsExperience: Number(e.target.value) })}
                className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
              Service Description / About
            </label>
            <textarea
              rows={4}
              value={editForm.description || ''}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              className="w-full p-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60 resize-none"
            />
          </div>

          {/* Category-Specific Credentials Editing */}
          <div className="pt-4 border-t border-surface-container space-y-4">
            <h3 className="text-xs font-bold text-secondary uppercase tracking-wider flex items-center gap-2">
              <Icon name="tune" className="text-[16px]" />
              <span>Category Specializations ({category})</span>
            </h3>

            {/* Photographer */}
            {category === 'Photographer' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                    Photography Styles (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editCategoryData.photographyStyles?.join(', ') || ''}
                    onChange={(e) =>
                      setEditCategoryData({
                        ...editCategoryData,
                        photographyStyles: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="e.g. Candid Photography, Cinematic Films, Drone 4K"
                    className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                    Equipment &amp; Camera Rigs
                  </label>
                  <input
                    type="text"
                    value={editCategoryData.equipment || ''}
                    onChange={(e) => setEditCategoryData({ ...editCategoryData, equipment: e.target.value })}
                    placeholder="e.g. Sony FX3, Alpha 7 IV, DJI Mavic 3 Cine"
                    className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                  />
                </div>
              </div>
            )}

            {/* Venue / Auditorium */}
            {category === 'Venue / Auditorium' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                      Guest Capacity
                    </label>
                    <input
                      type="number"
                      value={editCategoryData.capacity || ''}
                      onChange={(e) => setEditCategoryData({ ...editCategoryData, capacity: Number(e.target.value) })}
                      className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                      Rooms Count
                    </label>
                    <input
                      type="number"
                      value={editCategoryData.roomsCount || ''}
                      onChange={(e) => setEditCategoryData({ ...editCategoryData, roomsCount: Number(e.target.value) })}
                      className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <label className="flex items-center gap-2 p-3 rounded-xl bg-surface-container border border-surface-container-highest cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editCategoryData.hasAC}
                      onChange={(e) => setEditCategoryData({ ...editCategoryData, hasAC: e.target.checked })}
                      className="rounded text-secondary"
                    />
                    <span className="font-semibold text-on-surface">AC Hall</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 rounded-xl bg-surface-container border border-surface-container-highest cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editCategoryData.hasParking}
                      onChange={(e) => setEditCategoryData({ ...editCategoryData, hasParking: e.target.checked })}
                      className="rounded text-secondary"
                    />
                    <span className="font-semibold text-on-surface">Parking</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 rounded-xl bg-surface-container border border-surface-container-highest cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editCategoryData.hasStage}
                      onChange={(e) => setEditCategoryData({ ...editCategoryData, hasStage: e.target.checked })}
                      className="rounded text-secondary"
                    />
                    <span className="font-semibold text-on-surface">Raised Stage</span>
                  </label>
                  <label className="flex items-center gap-2 p-3 rounded-xl bg-surface-container border border-surface-container-highest cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!editCategoryData.hasDining}
                      onChange={(e) => setEditCategoryData({ ...editCategoryData, hasDining: e.target.checked })}
                      className="rounded text-secondary"
                    />
                    <span className="font-semibold text-on-surface">Dining Hall</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                    Other Facilities &amp; Amenities
                  </label>
                  <input
                    type="text"
                    value={editCategoryData.otherFacilities || ''}
                    onChange={(e) => setEditCategoryData({ ...editCategoryData, otherFacilities: e.target.value })}
                    placeholder="e.g. VIP Lounge, Bridal Suite, Generator Backup"
                    className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                  />
                </div>
              </div>
            )}

            {/* Caterer */}
            {category === 'Caterer' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                    Cuisines Offered (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editCategoryData.cuisineTypes?.join(', ') || ''}
                    onChange={(e) =>
                      setEditCategoryData({
                        ...editCategoryData,
                        cuisineTypes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="e.g. Kerala Traditional Sadhya, Mughlai Banquet, Continental"
                    className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                      Price / Plate (₹)
                    </label>
                    <input
                      type="number"
                      value={editCategoryData.pricePerPerson || ''}
                      onChange={(e) => setEditCategoryData({ ...editCategoryData, pricePerPerson: Number(e.target.value) })}
                      className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                      Min Guests
                    </label>
                    <input
                      type="number"
                      value={editCategoryData.minGuests || ''}
                      onChange={(e) => setEditCategoryData({ ...editCategoryData, minGuests: Number(e.target.value) })}
                      className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                      Max Guests
                    </label>
                    <input
                      type="number"
                      value={editCategoryData.maxGuests || ''}
                      onChange={(e) => setEditCategoryData({ ...editCategoryData, maxGuests: Number(e.target.value) })}
                      className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Makeup Artist */}
            {category === 'Makeup Artist' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                    Makeup &amp; Styling Specialties (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editCategoryData.makeupTypes?.join(', ') || ''}
                    onChange={(e) =>
                      setEditCategoryData({
                        ...editCategoryData,
                        makeupTypes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="e.g. Bridal HD Airbrush, Saree Draping, Hair Artistry"
                    className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                  />
                </div>
              </div>
            )}

            {/* Decorator */}
            {category === 'Decorator' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                    Decor Themes &amp; Styles (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editCategoryData.decorStyles?.join(', ') || ''}
                    onChange={(e) =>
                      setEditCategoryData({
                        ...editCategoryData,
                        decorStyles: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="e.g. Royal Floral Mandap, Bohemian Rustic, Minimalist Gold"
                    className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                    Previous Work Experience &amp; Highlights
                  </label>
                  <input
                    type="text"
                    value={editCategoryData.previousExperience || ''}
                    onChange={(e) => setEditCategoryData({ ...editCategoryData, previousExperience: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                  />
                </div>
              </div>
            )}

            {/* DJ / Entertainment */}
            {category === 'DJ / Entertainment' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                    Entertainment Types (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editCategoryData.entertainmentTypes?.join(', ') || ''}
                    onChange={(e) =>
                      setEditCategoryData({
                        ...editCategoryData,
                        entertainmentTypes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="e.g. Celebrity Club DJ, Live Acoustic Band, Fusion Symphony"
                    className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                    Sound &amp; Lighting Gear
                  </label>
                  <input
                    type="text"
                    value={editCategoryData.djEquipment || editCategoryData.equipment || ''}
                    onChange={(e) => setEditCategoryData({ ...editCategoryData, djEquipment: e.target.value, equipment: e.target.value })}
                    placeholder="e.g. Pioneer CDJ-3000, RCF Line Array, Moving Head Beams"
                    className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                  />
                </div>
              </div>
            )}

            {/* Event Manager */}
            {category === 'Event Manager' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                    Event Types Handled (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={editCategoryData.eventTypesHandled?.join(', ') || ''}
                    onChange={(e) =>
                      setEditCategoryData({
                        ...editCategoryData,
                        eventTypesHandled: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="e.g. Destination Weddings, Corporate Galas, Private Receptions"
                    className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-outline uppercase tracking-wider mb-1.5">
                    Management Credentials &amp; Philosophy
                  </label>
                  <input
                    type="text"
                    value={editCategoryData.previousExperience || ''}
                    onChange={(e) => setEditCategoryData({ ...editCategoryData, previousExperience: e.target.value })}
                    className="w-full h-11 px-4 rounded-xl bg-surface-container text-on-surface text-sm focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-highest/60"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-3.5 rounded-xl bg-secondary hover:bg-secondary-fixed-dim disabled:opacity-50 text-on-secondary-fixed font-bold text-xs transition-all shadow-[0_0_20px_rgba(255,178,190,0.3)] flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-on-secondary-fixed border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Icon name="check" className="text-[16px]" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleCancelEdit}
              className="px-4 py-3.5 rounded-xl bg-surface-container hover:bg-surface-container-highest text-on-surface text-xs font-semibold border border-surface-container-highest transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        /* Profile Read View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0">
          {/* Left Column: Profile Photo Management & Basic Info */}
          <div className="space-y-6 min-w-0">
            {/* Profile Photo Management Card */}
            <div className="p-4 sm:p-6 rounded-3xl bg-surface-container-high/60 backdrop-blur-2xl border border-surface-container-highest/60 shadow-xl space-y-4 min-w-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-outline flex items-center gap-2">
                <Icon name="photo_camera" className="text-secondary text-[16px]" />
                <span>Profile Photo</span>
              </h3>

              {/* Photo Display with Preview State */}
              <div className="flex flex-col items-center text-center">
                <div className="relative group w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-2 border-secondary/50 shadow-2xl mb-3 bg-surface-container">
                  <img
                    src={photoPreview || profile.profileImage || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
                    alt={profile.businessName}
                    className="w-full h-full object-cover"
                  />
                  {photoPreview && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-on-secondary-fixed shadow">
                      Preview
                    </div>
                  )}
                </div>

                <span className="text-sm font-bold text-on-surface break-words max-w-full">{profile.businessName}</span>
                <span className="text-xs text-secondary font-medium uppercase tracking-wider mt-0.5">
                  {profile.category}
                </span>

                {/* Inline Photo Error */}
                {photoFileError && (
                  <div className="mt-3 p-2.5 rounded-xl bg-error/15 border border-error/30 text-error text-xs text-left flex items-start gap-2 max-w-full break-words">
                    <Icon name="error" className="text-[16px] shrink-0 mt-0.5" />
                    <span>{photoFileError}</span>
                  </div>
                )}

                {/* Hidden File Picker */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoSelect}
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  className="hidden"
                />

                {/* Action Buttons */}
                <div className="mt-4 w-full space-y-2">
                  {photoPreview ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isSavingPhoto}
                          onClick={handleSavePhoto}
                          className="flex-1 py-2.5 rounded-xl bg-secondary hover:bg-secondary-fixed-dim text-on-secondary-fixed text-xs font-bold transition-all shadow-[0_0_12px_rgba(255,178,190,0.3)] flex items-center justify-center gap-1.5"
                        >
                          <Icon name="check" className="text-[16px]" />
                          <span>{isSavingPhoto ? 'Saving...' : 'Save Photo'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-3 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold border border-surface-container-highest transition-colors"
                          title="Choose different photo"
                        >
                          Change
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleCancelPhoto}
                        className="w-full py-2 rounded-xl text-xs text-outline hover:text-on-surface transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface hover:text-secondary text-xs font-semibold border border-surface-container-highest transition-all flex items-center justify-center gap-1.5"
                    >
                      <Icon name="upload" className="text-[16px]" />
                      <span>Update Photo</span>
                    </button>
                  )}
                  <span className="text-[10px] text-outline block">
                    Accepts JPG, PNG, WEBP (Max 5MB)
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Contact & Rates Card */}
            <div className="p-4 sm:p-6 rounded-3xl bg-surface-container-high/60 backdrop-blur-2xl border border-surface-container-highest/60 shadow-xl space-y-3 min-w-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-outline flex items-center gap-2">
                <Icon name="contact_phone" className="text-primary text-[16px]" />
                <span>Contact &amp; Rates</span>
              </h3>
              <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-container-low border border-surface-container space-y-2.5 text-xs min-w-0">
                <div className="flex justify-between items-start gap-2 py-1 border-b border-surface-container">
                  <span className="text-on-surface-variant shrink-0">Lead Name:</span>
                  <span className="font-semibold text-on-surface text-right break-words">{profile.fullName}</span>
                </div>
                <div className="flex justify-between items-start gap-2 py-1 border-b border-surface-container">
                  <span className="text-on-surface-variant shrink-0">Email:</span>
                  <span className="font-semibold text-on-surface text-right break-all">{profile.email}</span>
                </div>
                <div className="flex justify-between items-start gap-2 py-1 border-b border-surface-container">
                  <span className="text-on-surface-variant shrink-0">Phone:</span>
                  <span className="font-semibold text-on-surface text-right break-words">{profile.phone}</span>
                </div>
                <div className="flex justify-between items-start gap-2 py-1 border-b border-surface-container">
                  <span className="text-on-surface-variant shrink-0">Location:</span>
                  <span className="font-semibold text-on-surface text-right break-words">{profile.location}</span>
                </div>
                <div className="flex justify-between items-start gap-2 py-1 border-b border-surface-container">
                  <span className="text-on-surface-variant shrink-0">Experience:</span>
                  <span className="font-semibold text-on-surface text-right">{profile.yearsExperience || 5} Years</span>
                </div>
                <div className="flex justify-between items-start gap-2 py-1">
                  <span className="text-on-surface-variant shrink-0">Starting Price:</span>
                  <span className="font-bold text-primary text-right">₹{profile.startingPrice?.toLocaleString('en-IN') || '45,000'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Details Column (2 Cols) */}
          <div className="lg:col-span-2 space-y-6 min-w-0">
            {/* About / Description */}
            <div className="p-4 sm:p-6 rounded-3xl bg-surface-container-high/60 backdrop-blur-2xl border border-surface-container-highest/60 shadow-xl space-y-3 min-w-0">
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider text-outline flex items-center gap-2">
                <Icon name="description" className="text-secondary text-[18px]" />
                <span>About Atelier &amp; Philosophy</span>
              </h3>
              <p className="text-sm text-on-surface-variant leading-relaxed break-words">
                {profile.description || 'No description provided.'}
              </p>
            </div>

            {/* DYNAMIC CATEGORY-SPECIFIC SPECIALIZATIONS */}
            {hasCategorySpecificContent() && (
              <div className="p-4 sm:p-6 rounded-3xl bg-surface-container-high/60 backdrop-blur-2xl border border-surface-container-highest/60 shadow-xl space-y-4 min-w-0">
                <div className="flex items-center justify-between border-b border-surface-container pb-3">
                  <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider text-outline flex items-center gap-2">
                    <Icon name="tune" className="text-secondary text-[18px]" />
                    <span>Craft Specializations ({category})</span>
                  </h3>
                  <span className="text-xs font-semibold text-secondary px-2.5 py-0.5 rounded-full bg-secondary/15 border border-secondary/30">
                    Category Specific
                  </span>
                </div>

                {/* 1. PHOTOGRAPHER SPECIFICS */}
                {category === 'Photographer' && (
                  <div className="space-y-4">
                    {categoryData.photographyStyles && categoryData.photographyStyles.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-on-surface block mb-2">Photography Styles:</span>
                        <div className="flex flex-wrap gap-2">
                          {categoryData.photographyStyles.map((s, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-xl text-xs bg-surface-container text-secondary border border-surface-container-highest font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {categoryData.equipment && categoryData.equipment.trim() && (
                      <div>
                        <span className="text-xs font-semibold text-on-surface block mb-1">Equipment &amp; Rigs:</span>
                        <p className="text-xs text-on-surface-variant leading-relaxed p-3 rounded-xl bg-surface-container border border-surface-container-highest/50">
                          {categoryData.equipment}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. MAKEUP ARTIST SPECIFICS */}
                {category === 'Makeup Artist' && (
                  <div className="space-y-4">
                    {categoryData.makeupTypes && categoryData.makeupTypes.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-on-surface block mb-2">Makeup &amp; Styling Specialties:</span>
                        <div className="flex flex-wrap gap-2">
                          {categoryData.makeupTypes.map((m, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-xl text-xs bg-surface-container text-secondary border border-surface-container-highest font-medium">
                              {m}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. VENUE / AUDITORIUM SPECIFICS */}
                {category === 'Venue / Auditorium' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      {categoryData.capacity && (
                        <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-highest">
                          <span className="text-outline block mb-0.5">Seating Capacity</span>
                          <span className="font-bold text-on-surface text-sm">{categoryData.capacity} Guests</span>
                        </div>
                      )}
                      {categoryData.roomsCount && (
                        <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-highest">
                          <span className="text-outline block mb-0.5">Rooms Available</span>
                          <span className="font-bold text-on-surface text-sm">{categoryData.roomsCount} Rooms</span>
                        </div>
                      )}
                      {categoryData.hasAC !== undefined && (
                        <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-highest">
                          <span className="text-outline block mb-0.5">Air Conditioning</span>
                          <span className={`font-bold ${categoryData.hasAC ? 'text-emerald-400' : 'text-outline'}`}>
                            {categoryData.hasAC ? 'Available' : 'Non-AC'}
                          </span>
                        </div>
                      )}
                      {categoryData.hasParking !== undefined && (
                        <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-highest">
                          <span className="text-outline block mb-0.5">Parking</span>
                          <span className={`font-bold ${categoryData.hasParking ? 'text-emerald-400' : 'text-outline'}`}>
                            {categoryData.hasParking ? 'Dedicated Parking' : 'Street Parking'}
                          </span>
                        </div>
                      )}
                      {categoryData.hasStage !== undefined && (
                        <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-highest">
                          <span className="text-outline block mb-0.5">Stage</span>
                          <span className={`font-bold ${categoryData.hasStage ? 'text-emerald-400' : 'text-outline'}`}>
                            {categoryData.hasStage ? 'Raised Stage' : 'No Stage'}
                          </span>
                        </div>
                      )}
                      {categoryData.hasDining !== undefined && (
                        <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-highest">
                          <span className="text-outline block mb-0.5">Dining Hall</span>
                          <span className={`font-bold ${categoryData.hasDining ? 'text-emerald-400' : 'text-outline'}`}>
                            {categoryData.hasDining ? 'Dining Area Available' : 'No Dining Area'}
                          </span>
                        </div>
                      )}
                    </div>

                    {categoryData.otherFacilities && categoryData.otherFacilities.trim() && (
                      <div>
                        <span className="text-xs font-semibold text-on-surface block mb-1">Additional Facilities:</span>
                        <p className="text-xs text-on-surface-variant p-3 rounded-xl bg-surface-container border border-surface-container-highest/50">
                          {categoryData.otherFacilities}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 4. CATERER SPECIFICS */}
                {category === 'Caterer' && (
                  <div className="space-y-4">
                    {categoryData.cuisineTypes && categoryData.cuisineTypes.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-on-surface block mb-2">Cuisines Offered:</span>
                        <div className="flex flex-wrap gap-2">
                          {categoryData.cuisineTypes.map((c, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-xl text-xs bg-surface-container text-secondary border border-surface-container-highest font-medium">
                              {c}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      {categoryData.pricePerPerson && (
                        <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-highest">
                          <span className="text-outline block mb-0.5">Price Per Person</span>
                          <span className="font-bold text-primary text-sm">₹{categoryData.pricePerPerson}</span>
                        </div>
                      )}
                      {categoryData.minGuests && (
                        <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-highest">
                          <span className="text-outline block mb-0.5">Min Guests</span>
                          <span className="font-bold text-on-surface text-sm">{categoryData.minGuests}</span>
                        </div>
                      )}
                      {categoryData.maxGuests && (
                        <div className="p-3.5 rounded-xl bg-surface-container border border-surface-container-highest">
                          <span className="text-outline block mb-0.5">Max Guests</span>
                          <span className="font-bold text-on-surface text-sm">{categoryData.maxGuests}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 5. DECORATOR SPECIFICS */}
                {category === 'Decorator' && (
                  <div className="space-y-4">
                    {categoryData.decorStyles && categoryData.decorStyles.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-on-surface block mb-2">Decor Themes &amp; Styles:</span>
                        <div className="flex flex-wrap gap-2">
                          {categoryData.decorStyles.map((d, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-xl text-xs bg-surface-container text-secondary border border-surface-container-highest font-medium">
                              {d}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {categoryData.previousExperience && categoryData.previousExperience.trim() && (
                      <div>
                        <span className="text-xs font-semibold text-on-surface block mb-1">Previous Work &amp; Portfolio Details:</span>
                        <p className="text-xs text-on-surface-variant p-3 rounded-xl bg-surface-container border border-surface-container-highest/50">
                          {categoryData.previousExperience}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 6. DJ / ENTERTAINMENT SPECIFICS */}
                {category === 'DJ / Entertainment' && (
                  <div className="space-y-4">
                    {categoryData.entertainmentTypes && categoryData.entertainmentTypes.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-on-surface block mb-2">Entertainment Types:</span>
                        <div className="flex flex-wrap gap-2">
                          {categoryData.entertainmentTypes.map((e, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-xl text-xs bg-surface-container text-secondary border border-surface-container-highest font-medium">
                              {e}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(categoryData.djEquipment || categoryData.equipment) && (
                      <div>
                        <span className="text-xs font-semibold text-on-surface block mb-1">Sound &amp; Lighting Gear:</span>
                        <p className="text-xs text-on-surface-variant p-3 rounded-xl bg-surface-container border border-surface-container-highest/50">
                          {categoryData.djEquipment || categoryData.equipment}
                        </p>
                      </div>
                    )}

                    {categoryData.eventTypesHandled && categoryData.eventTypesHandled.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-on-surface block mb-2">Events Covered:</span>
                        <div className="flex flex-wrap gap-2">
                          {categoryData.eventTypesHandled.map((ev, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-xl text-xs bg-surface-container text-outline border border-surface-container-highest font-medium">
                              {ev}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 7. EVENT MANAGER SPECIFICS */}
                {category === 'Event Manager' && (
                  <div className="space-y-4">
                    {categoryData.eventTypesHandled && categoryData.eventTypesHandled.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-on-surface block mb-2">Event Types Handled:</span>
                        <div className="flex flex-wrap gap-2">
                          {categoryData.eventTypesHandled.map((et, i) => (
                            <span key={i} className="px-3 py-1.5 rounded-xl text-xs bg-surface-container text-secondary border border-surface-container-highest font-medium">
                              {et}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {categoryData.previousExperience && categoryData.previousExperience.trim() && (
                      <div>
                        <span className="text-xs font-semibold text-on-surface block mb-1">Experience &amp; Portfolio:</span>
                        <p className="text-xs text-on-surface-variant p-3 rounded-xl bg-surface-container border border-surface-container-highest/50">
                          {categoryData.previousExperience}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Services Offered list (if entered) */}
            {categoryData.servicesOffered && categoryData.servicesOffered.length > 0 && (
              <div className="p-6 rounded-3xl bg-surface-container-high/60 backdrop-blur-2xl border border-surface-container-highest/60 shadow-xl space-y-3">
                <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider text-outline flex items-center gap-2">
                  <Icon name="checklist" className="text-secondary text-[18px]" />
                  <span>Signature Services Included</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {categoryData.servicesOffered.map((svc, i) => (
                    <div key={i} className="flex items-center gap-2 p-2.5 rounded-xl bg-surface-container border border-surface-container-highest/40">
                      <Icon name="check_circle" className="text-secondary text-[16px]" />
                      <span className="text-on-surface font-medium">{svc}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderProfilePage;
