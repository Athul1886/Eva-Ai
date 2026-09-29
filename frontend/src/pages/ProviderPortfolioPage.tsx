import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import Icon from '../components/common/Icon';
import { ProviderAccount, ProviderSession } from '../types/provider';
import { getProviderProfile, updateProviderProfile, compressImageFile } from '../utils/providerAuth';
import { apiClient, hasAuthToken } from '../utils/api';

const isUUID = (str?: string): boolean =>
  !!str && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);

interface PackageItem {
  id?: string;
  name: string;
  price: number;
  description: string;
  features?: string[];
}

export interface PortfolioItem {
  id: string;
  providerId?: string;
  imageUrl: string;
  title?: string;
  caption?: string;
  displayOrder?: number;
  createdAt?: string;
}

export const ProviderPortfolioPage: React.FC = () => {
  const { session } = useOutletContext<{ session: ProviderSession }>();
  const [profile, setProfile] = useState<ProviderAccount | null>(null);
  const [portfolios, setPortfolios] = useState<PortfolioItem[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Work Gallery Local File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedUploads, setSelectedUploads] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Edit Portfolio Item State
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCaption, setEditCaption] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Replace Image State
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const [replacingItem, setReplacingItem] = useState<PortfolioItem | null>(null);
  const [replacePreview, setReplacePreview] = useState<string | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);

  // Delete Portfolio Item State
  const [deletingItem, setDeletingItem] = useState<PortfolioItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Packages State
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [editingPackage, setEditingPackage] = useState<PackageItem | null>(null);
  const [isNewPackage, setIsNewPackage] = useState(false);
  const [packageError, setPackageError] = useState<string | null>(null);
  const [packageFeatureInput, setPackageFeatureInput] = useState('');

  const fetchPortfolio = async () => {
    if (!hasAuthToken()) return;
    try {
      const res = await apiClient.get('/providers/portfolio');
      console.log('[ProviderPortfolioPage] Fetched portfolio:', res);
      
      const rawList = res.portfolios || res.portfolio || [];
      if (res.success && Array.isArray(rawList)) {
        const items: PortfolioItem[] = rawList.map((item: any) => ({
          id: item.id,
          providerId: item.providerId || item.provider_id,
          imageUrl: item.imageUrl || item.image_url,
          title: item.title || '',
          caption: item.caption || item.description || '',
          displayOrder: item.displayOrder ?? item.display_order ?? 0,
          createdAt: item.createdAt || item.created_at,
        }));
        
        console.log('[ProviderPortfolioPage] Mapped items:', items);
        setPortfolios(items);
        const liveImages = items.map((m) => m.imageUrl).filter(Boolean);
        setImages(liveImages);
        
        // Sync local profile for immediate local access (though backend remains truth)
        setProfile((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            categoryData: {
              ...prev.categoryData,
              portfolioImages: liveImages,
            },
          };
        });
      } else {
        console.warn('[ProviderPortfolioPage] Invalid portfolio response:', res);
      }
    } catch (err) {
      console.error('[ProviderPortfolioPage] Failed fetching portfolio from backend:', err);
    }
  };

  useEffect(() => {
    if (session?.providerId) {
      const data = getProviderProfile(session.providerId);
      setProfile(data);
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

      // Fetch live services and portfolio from backend if authenticated
      if (hasAuthToken()) {
        apiClient.get('/services/my')
          .then((res) => {
            if (res.success && Array.isArray(res.services) && res.services.length > 0) {
              const livePkgs: PackageItem[] = res.services.map((s: any) => ({
                id: s.id,
                name: s.title,
                price: Number(s.price),
                description: s.description || '',
                features: ['Professional consultation', 'Master execution deliverable'],
              }));
              setPackages(livePkgs);
            }
          })
          .catch((err) => {
            console.warn('[ProviderPortfolioPage] Failed fetching services from backend:', err);
          });

        fetchPortfolio();
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
    const newFiles: File[] = [];

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

      newPreviews.push(URL.createObjectURL(file));
      newFiles.push(file);
    }

    if (newPreviews.length > 0) {
      setSelectedUploads((prev) => [...prev, ...newPreviews]);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
      setShowUploadModal(true);
    }
  };

  const handleRemovePendingUpload = (index: number) => {
    setSelectedUploads((prev) => prev.filter((_, i) => i !== index));
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveUploads = async () => {
    if (selectedFiles.length === 0 || !session?.providerId) return;

    if (!hasAuthToken()) {
      setUploadError('You must be logged in to upload portfolio images.');
      return;
    }

    setToastMessage('Uploading image(s)...');
    
    try {
      let uploadedCount = 0;
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const formData = new FormData();
        formData.append('portfolioImage', file);
        formData.append('title', file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ') || 'Portfolio Image');
        formData.append('displayOrder', String(portfolios.length + i + 1));

        const response = await apiClient.post('/providers/portfolio', formData);
        if (response.success) {
          uploadedCount++;
        }
      }

      if (uploadedCount > 0) {
        setToastMessage(`Added ${uploadedCount} photo(s) to gallery!`);
        await fetchPortfolio();
      } else {
        setUploadError('Failed to upload image(s). Please try again.');
      }
    } catch (err: any) {
      console.warn('[ProviderPortfolioPage] Failed uploading portfolio to backend:', err);
      setUploadError(err.message || 'Error communicating with server.');
      return;
    }

    setSelectedUploads([]);
    setSelectedFiles([]);
    setShowUploadModal(false);
    if (fileInputRef.current) fileInputRef.current.value = '';

    setTimeout(() => setToastMessage(null), 3000);
  };

  // Edit Portfolio Item Handlers
  const handleOpenEdit = (item: PortfolioItem) => {
    setEditingItem(item);
    setEditTitle(item.title || '');
    setEditCaption(item.caption || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setIsSavingEdit(true);
    try {
      const res = await apiClient.put(`/providers/portfolio/${editingItem.id}`, {
        title: editTitle.trim(),
        caption: editCaption.trim(),
      });
      if (res.success) {
        setToastMessage('Portfolio details updated successfully!');
        await fetchPortfolio();
        setEditingItem(null);
      } else {
        setUploadError(res.message || 'Failed to update portfolio details.');
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Error updating portfolio item.');
    } finally {
      setIsSavingEdit(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Replace Image Handlers
  const handleStartReplace = (item: PortfolioItem) => {
    setReplacingItem(item);
    setReplaceFile(null);
    setReplacePreview(null);
    if (replaceFileInputRef.current) {
      replaceFileInputRef.current.value = '';
      replaceFileInputRef.current.click();
    }
  };

  const handleReplaceFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setUploadError('Invalid format. Accepted: JPG, PNG, WEBP.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File exceeds 10MB limit.');
      return;
    }
    setReplaceFile(file);
    setReplacePreview(URL.createObjectURL(file));
  };

  const handleConfirmReplace = async () => {
    if (!replacingItem || !replaceFile) return;
    setIsReplacing(true);
    try {
      const formData = new FormData();
      formData.append('portfolioImage', replaceFile);
      if (replacingItem.title) formData.append('title', replacingItem.title);
      if (replacingItem.caption) formData.append('caption', replacingItem.caption);

      const res = await apiClient.put(`/providers/portfolio/${replacingItem.id}`, formData);
      if (res.success) {
        setToastMessage('Portfolio image replaced successfully!');
        await fetchPortfolio();
        setReplacingItem(null);
        setReplaceFile(null);
        setReplacePreview(null);
      } else {
        setUploadError(res.message || 'Failed to replace image.');
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Error replacing portfolio image.');
    } finally {
      setIsReplacing(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Delete Portfolio Item Handlers
  const handleOpenDelete = (item: PortfolioItem) => {
    setDeletingItem(item);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsDeleting(true);
    try {
      const res = await apiClient.delete(`/providers/portfolio/${deletingItem.id}`);
      if (res.success) {
        setPortfolios((prev) => prev.filter((p) => p.id !== deletingItem.id));
        setImages((prev) => prev.filter((url) => url !== deletingItem.imageUrl));
        setToastMessage('Portfolio photo deleted successfully!');
        await fetchPortfolio();
        setDeletingItem(null);
      } else {
        setUploadError(res.message || 'Failed to delete portfolio image.');
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Error deleting portfolio item.');
    } finally {
      setIsDeleting(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
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

    if (hasAuthToken()) {
      if (isNewPackage || !isUUID(editingPackage.id)) {
        apiClient.post('/services', {
          title: editingPackage.name,
          price: Number(editingPackage.price),
          description: editingPackage.description,
        })
          .then((res) => {
            if (res.success && res.service?.id) {
              setPackages((prev) =>
                prev.map((p) => (p.id === editingPackage.id ? { ...p, id: res.service.id } : p))
              );
            }
          })
          .catch((err) => {
            console.warn('[ProviderPortfolioPage] Failed creating service on backend:', err);
          });
      } else {
        apiClient.put(`/services/${editingPackage.id}`, {
          title: editingPackage.name,
          price: Number(editingPackage.price),
          description: editingPackage.description,
        }).catch((err) => {
          console.warn('[ProviderPortfolioPage] Failed updating service on backend:', err);
        });
      }
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

    if (hasAuthToken() && isUUID(pkgId)) {
      apiClient.delete(`/services/${pkgId}`).catch((err) => {
        console.warn('[ProviderPortfolioPage] Failed deleting service on backend:', err);
      });
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
            {portfolios.length > 0 ? portfolios.length : images.length}{' '}
            {(portfolios.length > 0 ? portfolios.length : images.length) === 1 ? 'image' : 'images'} in gallery
          </span>
        </div>

        {/* Hidden File Input for Image Replacement */}
        <input
          ref={replaceFileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleReplaceFileSelected}
          className="hidden"
        />

        {(portfolios.length === 0 && images.length === 0) ? (
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
            {(portfolios.length > 0
              ? portfolios
              : images.map((url, idx) => ({
                  id: `temp-${idx}`,
                  imageUrl: url,
                  title: `Capture #${idx + 1}`,
                  caption: '',
                }))
            ).map((item, idx) => (
              <div
                key={item.id || idx}
                className="group rounded-3xl overflow-hidden bg-surface-container border border-surface-container-highest/60 shadow-lg flex flex-col transition-all hover:border-secondary/40"
              >
                {/* Image Section */}
                <div className="relative aspect-[4/3] bg-surface-container-highest overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.title || `Portfolio capture ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      console.warn('Failed loading image:', item.imageUrl);
                    }}
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-semibold text-white/90 border border-white/10">
                    Capture #{idx + 1}
                  </div>
                </div>

                {/* Card Content & Action Controls */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-on-surface truncate" title={item.title || `Capture #${idx + 1}`}>
                      {item.title || `Capture #${idx + 1}`}
                    </h3>
                    {item.caption ? (
                      <p className="text-xs text-on-surface-variant line-clamp-2 mt-1" title={item.caption}>
                        {item.caption}
                      </p>
                    ) : (
                      <p className="text-xs text-outline italic mt-1">No description added</p>
                    )}
                  </div>

                  {/* Actions: Edit, Replace, Delete */}
                  <div className="pt-2 border-t border-surface-container-highest/40 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-surface-container-high hover:bg-surface-bright text-xs font-semibold text-on-surface hover:text-secondary border border-surface-container-highest transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      title="Edit title & description"
                    >
                      <Icon name="edit" className="text-[14px]" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartReplace(item)}
                      className="flex-1 py-1.5 px-2 rounded-xl bg-surface-container-high hover:bg-surface-bright text-xs font-semibold text-on-surface hover:text-primary border border-surface-container-highest transition-all flex items-center justify-center gap-1.5 shadow-sm"
                      title="Replace with new photo"
                    >
                      <Icon name="sync" className="text-[14px]" />
                      <span>Replace</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenDelete(item)}
                      className="py-1.5 px-2.5 rounded-xl bg-error/15 hover:bg-error/25 text-xs font-semibold text-error border border-error/20 transition-all flex items-center justify-center gap-1 shadow-sm"
                      title="Delete image"
                    >
                      <Icon name="delete" className="text-[14px]" />
                      <span>Delete</span>
                    </button>
                  </div>
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
          <div className="p-8 sm:p-12 rounded-3xl bg-surface-container-high/40 border border-surface-container-highest/60 text-center space-y-4 max-w-lg mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-surface-container text-primary mx-auto flex items-center justify-center border border-primary/30">
              <Icon name="loyalty" className="text-[28px]" />
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-sm sm:text-base text-on-surface">No Pricing Packages Configured</h3>
              <p className="text-xs text-on-surface-variant max-w-sm mx-auto leading-relaxed">
                Packages give clients transparent insight into your offerings, deliverables, and pricing tiers. Create at least one tier to display on your atelier profile.
              </p>
            </div>
            <div className="pt-1">
              <button
                type="button"
                onClick={handleOpenAddPackage}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-tertiary text-on-primary text-xs font-bold transition-all shadow-[0_0_15px_rgba(242,202,80,0.25)]"
              >
                <Icon name="add" className="text-[16px]" />
                <span>Create Your First Package Tier</span>
              </button>
            </div>
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

      {/* Edit Portfolio Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-surface-container-high border border-surface-container-highest p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                <Icon name="edit" className="text-secondary text-[20px]" />
                <span>Edit Portfolio Details</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-on-surface-variant hover:text-on-surface text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-4 items-center p-3 rounded-2xl bg-surface-container border border-surface-container-highest">
              <img
                src={editingItem.imageUrl}
                alt="Preview"
                className="w-16 h-16 rounded-xl object-cover border border-surface-container-highest shadow-inner flex-shrink-0"
              />
              <div className="text-xs text-on-surface-variant min-w-0">
                <p className="font-semibold text-on-surface truncate">{editingItem.title || 'Untitled Capture'}</p>
                <p className="text-[11px] text-outline truncate">{editingItem.imageUrl}</p>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="e.g. Grand Ballroom Reception Stage"
                  className="w-full h-10 px-3.5 rounded-xl bg-surface-container text-on-surface text-sm border border-surface-container-highest focus:border-secondary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">
                  Description / Caption
                </label>
                <textarea
                  value={editCaption}
                  onChange={(e) => setEditCaption(e.target.value)}
                  rows={3}
                  placeholder="Provide architectural highlights, floral arrangement details, or event theme..."
                  className="w-full p-3 rounded-xl bg-surface-container text-on-surface text-sm border border-surface-container-highest focus:border-secondary focus:outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-on-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 rounded-xl bg-secondary hover:bg-secondary-fixed-dim text-on-secondary-fixed text-xs font-bold shadow-[0_0_15px_rgba(255,178,190,0.3)] transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <>
                      <Icon name="sync" className="text-[16px] animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="check" className="text-[16px]" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Replace Image Preview Modal */}
      {replacePreview && replacingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-surface-container-high border border-surface-container-highest p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container">
              <h3 className="font-bold text-base text-on-surface flex items-center gap-2">
                <Icon name="sync" className="text-primary text-[20px]" />
                <span>Confirm Image Replacement</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setReplacingItem(null);
                  setReplaceFile(null);
                  setReplacePreview(null);
                }}
                className="text-on-surface-variant hover:text-on-surface text-sm p-1"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="block text-xs font-bold text-outline uppercase tracking-wider mb-1.5">
                  Current Image
                </span>
                <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-surface-container border border-surface-container-highest">
                  <img
                    src={replacingItem.imageUrl}
                    alt="Current"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div>
                <span className="block text-xs font-bold text-secondary uppercase tracking-wider mb-1.5">
                  New Replacement
                </span>
                <div className="rounded-2xl overflow-hidden aspect-[4/3] bg-surface-container border-2 border-secondary/60">
                  <img
                    src={replacePreview}
                    alt="New replacement preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface-container text-xs text-on-surface-variant border border-surface-container-highest">
              <p className="font-bold text-on-surface mb-0.5">Cloud Storage Synchronization</p>
              <p>The previous image in Supabase Storage will be purged and replaced with your new high-resolution image. Metadata and gallery position are preserved.</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container">
              <button
                type="button"
                disabled={isReplacing}
                onClick={() => {
                  setReplacingItem(null);
                  setReplaceFile(null);
                  setReplacePreview(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-on-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReplace}
                disabled={isReplacing}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-fixed-dim text-on-primary-fixed text-xs font-bold shadow-[0_0_15px_rgba(208,188,255,0.3)] transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isReplacing ? (
                  <>
                    <Icon name="sync" className="text-[16px] animate-spin" />
                    <span>Replacing...</span>
                  </>
                ) : (
                  <>
                    <Icon name="check" className="text-[16px]" />
                    <span>Replace Image</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-surface-container-high border border-error/30 p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-error/15 text-error flex items-center justify-center flex-shrink-0">
                <Icon name="delete_forever" className="text-[26px]" />
              </div>
              <div>
                <h3 className="font-bold text-base text-on-surface">
                  Delete this portfolio image?
                </h3>
                <p className="text-xs text-on-surface-variant">
                  This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="rounded-2xl overflow-hidden aspect-[16/9] bg-surface-container border border-surface-container-highest max-h-40">
              <img
                src={deletingItem.imageUrl}
                alt={deletingItem.title || 'To delete'}
                className="w-full h-full object-cover"
              />
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Permanently remove <strong className="text-on-surface">{deletingItem.title || 'this photo'}</strong> from your atelier portfolio. The image file in cloud storage and its database record will be purged immediately.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-surface-container">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-on-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 rounded-xl bg-error hover:bg-error/90 text-white text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Icon name="sync" className="text-[16px] animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Icon name="delete" className="text-[16px]" />
                    <span>Delete Image</span>
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

export default ProviderPortfolioPage;
