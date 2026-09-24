import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import Icon from '../components/common/Icon';
import { ProviderAccount, ProviderSession } from '../types/provider';
import { getProviderProfile, updateProviderProfile, compressImageFile } from '../utils/providerAuth';

interface PackageItem {
  id?: string;
  name: string;
  price: number;
  description: string;
  features?: string[];
}

export const ProviderPortfolioPage: React.FC = () => {
  const { session } = useOutletContext<{ session: ProviderSession }>();
  const [profile, setProfile] = useState<ProviderAccount | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Work Gallery Local File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedUploads, setSelectedUploads] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Packages State
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [editingPackage, setEditingPackage] = useState<PackageItem | null>(null);
  const [isNewPackage, setIsNewPackage] = useState(false);
  const [packageError, setPackageError] = useState<string | null>(null);
  const [packageFeatureInput, setPackageFeatureInput] = useState('');

  useEffect(() => {
    if (session?.providerId) {
      const data = getProviderProfile(session.providerId);
      setProfile(data);
      if (data?.categoryData?.portfolioImages) {
        setImages(data.categoryData.portfolioImages);
      }
      if (data?.categoryData?.packageInfo && data.categoryData.packageInfo.length > 0) {
        const sanitized = data.categoryData.packageInfo.map((p, idx) => ({
          ...p,
          id: p.id || `pkg-${session.providerId}-${idx + 1}-${Math.random().toString(36).substring(2, 6)}`,
        }));
        setPackages(sanitized);
      } else {
        // Initial package if none
        const initialPkg: PackageItem[] = [
          {
            id: `pkg-${session.providerId}-1`,
            name: 'Essential Atelier Tier',
            price: Number(data?.startingPrice) || 35000,
            description: 'Core professional celebration coverage with dedicated crew and master output delivery.',
            features: ['Full day coverage', 'Color-graded digital deliverable', 'Consultation & Planning'],
          },
        ];
        setPackages(initialPkg);
      }
    }
  }, [session?.providerId]);

  // Gallery: Local File Picker (Multiple) with client-side compression
  const handleFilesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const newPreviews: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!validTypes.includes(file.type.toLowerCase())) {
        setUploadError('One or more files have an invalid format. Accepted: JPG, PNG, WEBP.');
        continue;
      }
      if (file.size > 8 * 1024 * 1024) {
        setUploadError('One or more files exceed the 8MB size limit.');
        continue;
      }

      try {
        // Compress to max 1200x900 at 0.8 quality (~50-80KB each)
        const compressed = await compressImageFile(file, 1200, 900, 0.8);
        newPreviews.push(compressed);
      } catch (err: any) {
        setUploadError(err.message || 'Failed processing image file.');
      }
    }

    if (newPreviews.length > 0) {
      setSelectedUploads((prev) => [...prev, ...newPreviews]);
      setShowUploadModal(true);
    }
  };

  const handleRemovePendingUpload = (index: number) => {
    setSelectedUploads((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveUploads = () => {
    if (selectedUploads.length === 0 || !session?.providerId) return;

    // Fetch freshest current profile from storage to prevent race conditions
    const current = getProviderProfile(session.providerId);
    const currentImages = current?.categoryData?.portfolioImages || images;
    // Append to existing images, do not replace!
    const updatedImages = [...currentImages, ...selectedUploads];

    const currentCatData = current?.categoryData || {};
    const updatedCatData = { ...currentCatData, portfolioImages: updatedImages };
    const updated = updateProviderProfile(session.providerId, { categoryData: updatedCatData });

    if (updated) {
      setProfile(updated);
      setImages(updatedImages);
    }

    setSelectedUploads([]);
    setShowUploadModal(false);
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setToastMessage(`Added ${selectedUploads.length} new work image(s) to gallery!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRemoveExistingImage = (indexToRemove: number) => {
    if (!session?.providerId) return;
    const current = getProviderProfile(session.providerId);
    const currentImages = current?.categoryData?.portfolioImages || images;
    const updatedImages = currentImages.filter((_, idx) => idx !== indexToRemove);

    const currentCatData = current?.categoryData || {};
    const updatedCatData = { ...currentCatData, portfolioImages: updatedImages };
    const updated = updateProviderProfile(session.providerId, { categoryData: updatedCatData });

    if (updated) {
      setProfile(updated);
      setImages(updatedImages);
    }

    setToastMessage('Image removed from portfolio gallery.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Package Management
  const handleOpenAddPackage = () => {
    setEditingPackage({
      id: `pkg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: '',
      price: 25000,
      description: '',
      features: [],
    });
    setIsNewPackage(true);
    setPackageError(null);
    setPackageFeatureInput('');
  };

  const handleOpenEditPackage = (pkg: PackageItem) => {
    setEditingPackage({ ...pkg, features: pkg.features || [] });
    setIsNewPackage(false);
    setPackageError(null);
    setPackageFeatureInput('');
  };

  const handleAddFeature = () => {
    if (!packageFeatureInput.trim() || !editingPackage) return;
    setEditingPackage({
      ...editingPackage,
      features: [...(editingPackage.features || []), packageFeatureInput.trim()],
    });
    setPackageFeatureInput('');
  };

  const handleRemoveFeature = (featIndex: number) => {
    if (!editingPackage) return;
    setEditingPackage({
      ...editingPackage,
      features: (editingPackage.features || []).filter((_, i) => i !== featIndex),
    });
  };

  const handleSavePackage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPackage || !session?.providerId) return;

    if (!editingPackage.name.trim()) {
      setPackageError('Package Name is required.');
      return;
    }
    if (!editingPackage.price || Number(editingPackage.price) <= 0) {
      setPackageError('Please enter a valid package price greater than 0.');
      return;
    }
    if (!editingPackage.description.trim()) {
      setPackageError('Package description is required.');
      return;
    }

    // Duplicate package name prevention
    const duplicate = packages.some(
      (p) => p.id !== editingPackage.id && p.name.trim().toLowerCase() === editingPackage.name.trim().toLowerCase()
    );
    if (duplicate) {
      setPackageError('A package with this name already exists. Please choose a distinct package name.');
      return;
    }

    let updatedList: PackageItem[] = [];
    if (isNewPackage) {
      updatedList = [...packages, editingPackage];
    } else {
      updatedList = packages.map((p) => (p.id === editingPackage.id ? editingPackage : p));
    }

    const current = getProviderProfile(session.providerId);
    const currentCatData = current?.categoryData || {};
    const updatedCatData = { ...currentCatData, packageInfo: updatedList };
    const updated = updateProviderProfile(session.providerId, { categoryData: updatedCatData });

    if (updated) {
      setProfile(updated);
      setPackages(updatedList);
    }

    setEditingPackage(null);
    setPackageError(null);
    setToastMessage(`Package "${editingPackage.name}" saved successfully!`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeletePackage = (pkgId?: string) => {
    if (!pkgId || !session?.providerId) return;
    const current = getProviderProfile(session.providerId);
    const currentPackages = current?.categoryData?.packageInfo || packages;
    const updatedList = currentPackages.filter((p) => p.id !== pkgId);

    const currentCatData = current?.categoryData || {};
    const updatedCatData = { ...currentCatData, packageInfo: updatedList };
    const updated = updateProviderProfile(session.providerId, { categoryData: updatedCatData });

    if (updated) {
      setProfile(updated);
      setPackages(updatedList);
    }

    setToastMessage('Package tier deleted.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-2xl bg-surface-container-high/95 backdrop-blur-xl border border-secondary/40 shadow-2xl text-secondary text-sm font-semibold flex items-center gap-3 animate-in slide-in-from-bottom duration-200">
          <Icon name="check_circle" className="text-[20px]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-surface-container/60 min-w-0">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-secondary/20 text-secondary border border-secondary/30">
              Visual Showcase &amp; Tiers
            </span>
            <span className="text-xs text-outline">• {images.length} Gallery Photos</span>
          </div>
          <h1 className="font-headline-sm text-2xl sm:text-3xl font-bold text-on-surface break-words">
            Portfolio Gallery &amp; Pricing Packages
          </h1>
          <p className="font-body-sm text-xs sm:text-sm text-on-surface-variant mt-1 break-words">
            Upload your masterwork captures and define multiple tiered service offerings for prospective clients.
          </p>
        </div>

        {/* Hidden File Picker Input */}
        <input
          type="file"
          ref={fileInputRef}
          multiple
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          onChange={handleFilesSelect}
          className="hidden"
        />

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary-fixed-dim text-on-secondary-fixed text-xs font-bold transition-all shadow-[0_0_15px_rgba(255,178,190,0.25)] flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Icon name="add_photo_alternate" className="text-[16px]" />
            <span>Add Photos</span>
          </button>
        </div>
      </div>

      {/* Inline Upload Error */}
      {uploadError && (
        <div className="p-3.5 rounded-2xl bg-error/15 border border-error/30 text-error text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Icon name="error" className="text-[18px]" />
            <span>{uploadError}</span>
          </div>
          <button type="button" onClick={() => setUploadError(null)} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* SECTION 1: WORK GALLERY */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider text-outline flex items-center gap-2">
            <Icon name="collections" className="text-secondary text-[18px]" />
            <span>Production Portfolio Imagery</span>
          </h2>
          <span className="text-xs text-on-surface-variant">
            {images.length} {images.length === 1 ? 'image' : 'images'} in gallery
          </span>
        </div>

        {images.length === 0 ? (
          /* Empty Gallery State */
          <div className="p-12 rounded-3xl bg-surface-container-high/40 border border-surface-container-highest/60 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-surface-container text-outline mx-auto flex items-center justify-center">
              <Icon name="photo_library" className="text-[28px]" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-on-surface">Your Portfolio Gallery is Empty</h3>
              <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                Upload your high-resolution event captures from your computer to showcase your atelier craftsmanship.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/20 hover:bg-secondary/30 text-secondary text-xs font-bold border border-secondary/40 transition-colors"
            >
              <Icon name="upload" className="text-[16px]" />
              <span>Select Photos from Computer</span>
            </button>
          </div>
        ) : (
          /* Gallery Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {images.map((imgUrl, idx) => (
              <div
                key={idx}
                className="group relative rounded-3xl overflow-hidden aspect-[4/3] bg-surface-container border border-surface-container-highest/60 shadow-lg"
              >
                <img
                  src={imgUrl}
                  alt={`Portfolio piece ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
                  <span className="text-xs font-semibold text-white">
                    Capture #{idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingImage(idx)}
                    className="p-2 rounded-xl bg-error/85 text-white hover:bg-error transition-colors flex items-center gap-1 text-xs font-semibold"
                    title="Remove image from gallery"
                  >
                    <Icon name="delete" className="text-[15px]" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: SERVICE PRICING TIERS */}
      <div className="space-y-6 pt-6 border-t border-surface-container/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider text-outline flex items-center gap-2">
              <Icon name="loyalty" className="text-primary text-[18px]" />
              <span>Service Pricing Tiers</span>
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Create multiple pricing packages so clients can select the exact scope of services they desire.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenAddPackage}
            className="px-4 py-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-primary hover:text-primary text-xs font-bold border border-primary/30 hover:border-primary transition-all flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
          >
            <Icon name="add" className="text-[16px]" />
            <span>+ Add Package</span>
          </button>
        </div>

        {packages.length === 0 ? (
          <div className="p-8 rounded-3xl bg-surface-container-high/40 border border-surface-container-highest/60 text-center space-y-2">
            <p className="text-xs text-on-surface-variant">No pricing packages configured yet.</p>
            <button
              type="button"
              onClick={handleOpenAddPackage}
              className="text-xs text-primary font-bold hover:underline"
            >
              Click here to create your first package
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {packages.map((pkg, idx) => (
              <div
                key={pkg.id || idx}
                className="p-4 sm:p-6 rounded-3xl bg-surface-container-high/60 backdrop-blur-2xl border border-surface-container-highest/60 shadow-lg flex flex-col justify-between hover:border-secondary/30 transition-all group min-w-0"
              >
                <div className="space-y-3.5 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary/20 text-secondary border border-secondary/30">
                      Tier #{idx + 1}
                    </span>
                    <span className="text-lg font-extrabold text-primary">
                      ₹{Number(pkg.price).toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-on-surface break-words">{pkg.name}</h3>
                    <p className="text-xs text-on-surface-variant leading-relaxed mt-1 break-words">
                      {pkg.description}
                    </p>
                  </div>

                  {/* Included Services/Features */}
                  {pkg.features && pkg.features.length > 0 && (
                    <div className="pt-2 border-t border-surface-container/60 space-y-1.5">
                      <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block">
                        Included Services:
                      </span>
                      <ul className="space-y-1 text-xs">
                        {pkg.features.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-center gap-2 text-on-surface-variant">
                            <Icon name="check" className="text-emerald-400 text-[14px] shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Edit & Delete Actions */}
                <div className="pt-4 mt-4 border-t border-surface-container flex items-center justify-between gap-2">
                  <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active Package
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditPackage(pkg)}
                      className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface hover:text-primary transition-colors border border-surface-container-highest flex items-center gap-1"
                    >
                      <Icon name="edit" className="text-[13px]" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeletePackage(pkg.id)}
                      className="p-1.5 rounded-lg hover:bg-error/20 text-outline hover:text-error transition-colors"
                      title="Delete package"
                    >
                      <Icon name="delete" className="text-[16px]" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL 1: Upload Photos Preview & Confirmation */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <div className="max-w-xl w-full bg-surface-container-high rounded-3xl border border-surface-container-highest shadow-2xl p-4 sm:p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col min-w-0">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container">
              <div className="min-w-0">
                <h3 className="font-bold text-base text-on-surface break-words">Preview Selected Work Photos</h3>
                <span className="text-xs text-on-surface-variant">
                  {selectedUploads.length} photo(s) selected to add to your portfolio
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedUploads([]);
                  setShowUploadModal(false);
                }}
                className="p-1.5 rounded-lg text-outline hover:text-on-surface shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Preview Grid */}
            <div className="flex-1 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3 p-1">
              {selectedUploads.map((src, i) => (
                <div key={i} className="relative rounded-2xl overflow-hidden aspect-video bg-surface-container border border-surface-container-highest group">
                  <img src={src} alt={`Upload ${i}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePendingUpload(i)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/75 text-white hover:bg-error transition-colors text-xs"
                    title="Remove from batch"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-2 pt-3 border-t border-surface-container">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface border border-surface-container-highest"
              >
                + Add More
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUploads([]);
                    setShowUploadModal(false);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-on-surface flex-1 xs:flex-initial"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveUploads}
                  disabled={selectedUploads.length === 0}
                  className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary-fixed-dim text-on-secondary-fixed text-xs font-bold shadow-[0_0_15px_rgba(255,178,190,0.3)] transition-all flex items-center justify-center gap-1.5 flex-1 xs:flex-initial"
                >
                  <Icon name="check" className="text-[16px]" />
                  <span>Save</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Add / Edit Package Modal */}
      {editingPackage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleSavePackage}
            className="max-w-lg w-full bg-surface-container-high rounded-3xl border border-surface-container-highest shadow-2xl p-4 sm:p-8 space-y-4 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto min-w-0"
          >
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <h3 className="font-bold text-base text-on-surface flex items-center gap-2 min-w-0 break-words">
                <Icon name="loyalty" className="text-secondary text-[20px] shrink-0" />
                <span>{isNewPackage ? 'Add New Pricing Package' : 'Edit Package Tier'}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingPackage(null)}
                className="p-1.5 rounded-lg text-outline hover:text-on-surface shrink-0"
              >
                ✕
              </button>
            </div>

            {packageError && (
              <div className="p-3 rounded-xl bg-error/15 border border-error/30 text-error text-xs flex items-center gap-2">
                <Icon name="error" className="text-[16px] shrink-0" />
                <span>{packageError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-outline uppercase tracking-wider mb-1">
                  Package / Tier Name <span className="text-secondary">*</span>
                </label>
                <input
                  type="text"
                  value={editingPackage.name}
                  onChange={(e) => setEditingPackage({ ...editingPackage, name: e.target.value })}
                  placeholder="e.g. Royal Platinum Master Collection"
                  className="w-full h-11 px-3.5 rounded-xl bg-surface-container text-on-surface text-sm border border-surface-container-highest focus:ring-1 focus:ring-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-outline uppercase tracking-wider mb-1">
                  Package Price (₹ INR) <span className="text-secondary">*</span>
                </label>
                <input
                  type="number"
                  min="500"
                  step="500"
                  value={editingPackage.price || ''}
                  onChange={(e) => setEditingPackage({ ...editingPackage, price: Number(e.target.value) })}
                  placeholder="e.g. 50000"
                  className="w-full h-11 px-3.5 rounded-xl bg-surface-container text-on-surface text-sm border border-surface-container-highest focus:ring-1 focus:ring-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-outline uppercase tracking-wider mb-1">
                  Package Description <span className="text-secondary">*</span>
                </label>
                <textarea
                  rows={3}
                  value={editingPackage.description}
                  onChange={(e) => setEditingPackage({ ...editingPackage, description: e.target.value })}
                  placeholder="Describe coverage duration, dedicated leads, equipment, and final delivery deliverables..."
                  className="w-full p-3 rounded-xl bg-surface-container text-on-surface text-xs border border-surface-container-highest focus:ring-1 focus:ring-secondary focus:outline-none resize-none"
                />
              </div>

              {/* Included Services / Features */}
              <div>
                <label className="block font-semibold text-outline uppercase tracking-wider mb-1">
                  Included Services / Deliverables (Optional)
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={packageFeatureInput}
                    onChange={(e) => setPackageFeatureInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                    placeholder="e.g. 2 Photographers + 1 Drone Pilot"
                    className="flex-1 h-9 px-3 rounded-lg bg-surface-container text-on-surface text-xs border border-surface-container-highest"
                  />
                  <button
                    type="button"
                    onClick={handleAddFeature}
                    className="px-3 py-2 rounded-lg bg-surface-container-high hover:bg-surface-bright text-xs font-semibold text-secondary border border-surface-container-highest"
                  >
                    + Add
                  </button>
                </div>

                {editingPackage.features && editingPackage.features.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                    {editingPackage.features.map((feat, fIdx) => (
                      <span
                        key={fIdx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container text-[11px] text-on-surface border border-surface-container-highest"
                      >
                        <span>{feat}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFeature(fIdx)}
                          className="text-outline hover:text-error font-bold"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setEditingPackage(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-on-surface"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary-fixed-dim text-on-secondary-fixed text-xs font-bold shadow-[0_0_15px_rgba(255,178,190,0.3)] transition-all flex items-center gap-1.5"
              >
                <Icon name="check" className="text-[16px]" />
                <span>Save Package</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProviderPortfolioPage;
