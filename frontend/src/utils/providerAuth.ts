import { ProviderAccount, ProviderSession, ProviderCategoryType, CategorySpecificData } from '../types/provider';
import { Booking, BookingStatus } from '../types/booking';
import { Provider } from '../types/service';
import { MOCK_PROVIDERS } from '../data/mockProviders';
import {
  authApi,
  providersApi,
  getStoredAccessToken,
  setStoredAccessToken,
  getStoredRefreshToken,
  setStoredRefreshToken,
  ApiError,
} from '../api/api';

export const PROVIDER_SESSION_KEY = 'eva_ai_provider_session';
export const PROVIDERS_KEY = 'eva_ai_providers';
export const PROVIDER_AVAILABILITY_KEY = 'eva_ai_provider_availability';
export const BOOKINGS_KEY = 'eva_ai_bookings';

const PASSWORD_SALT = 'eva_ai_prov_sec_2026_';

export function hashPassword(plain: string): string {
  try {
    return btoa(PASSWORD_SALT + plain);
  } catch {
    return `${PASSWORD_SALT}${plain.split('').reverse().join('')}`;
  }
}

export function verifyPassword(plain: string, hash: string): boolean {
  return hashPassword(plain) === hash;
}

// Initial demo accounts seeded if none exist
function getInitialProviders(): ProviderAccount[] {
  return [
    {
      id: 'lenscraft-studio',
      fullName: 'Rohit Menon',
      businessName: 'LensCraft Studio',
      email: 'studio@lenscraft.com',
      phone: '+91 94470 12345',
      location: 'Palakkad, Kerala',
      description: 'Premier visual storytellers capturing candid rituals, cinematic slow-motion highlights, and timeless heirloom photo albums.',
      yearsExperience: 8,
      startingPrice: 45000,
      category: 'Photographer',
      profileImage: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=400&q=80',
      createdAt: '2026-01-10T10:00:00.000Z',
      categoryData: {
        photographyStyles: ['Candid Photography', 'Cinematic Wedding Films', 'Drone Aerial 4K', 'Traditional Portraiture'],
        equipment: 'Sony FX3 Cinema Rigs, Alpha 7 IV, DJI Mavic 3 Pro Cine, Prime G-Master lenses',
        servicesOffered: ['Full-Day Wedding Coverage', 'Pre-Wedding Conceptual Shoots', 'Same-Day Highlights', 'Handcrafted Albums'],
        portfolioImages: [
          'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=1200&q=80',
        ],
        packageInfo: [
          { name: 'Essential Gold', price: 45000, description: 'Single-day core coverage for ceremonies and rituals' },
          { name: 'Royal Heirloom Platinum', price: 85000, description: 'Comprehensive 2-day multi-camera master wedding capture' },
        ],
      },
    },
    {
      id: 'grand-regal-auditorium',
      fullName: 'Sunil Varma',
      businessName: 'Grand Regal Palace',
      email: 'events@grandregal.com',
      phone: '+91 98471 99882',
      location: 'Thrissur, Kerala',
      description: 'Air-conditioned luxury ballroom and heritage open-air convention center for grand celebratory banquets.',
      yearsExperience: 14,
      startingPrice: 150000,
      category: 'Venue / Auditorium',
      profileImage: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=400&q=80',
      createdAt: '2026-02-15T12:00:00.000Z',
      categoryData: {
        capacity: 1200,
        hasAC: true,
        hasParking: true,
        hasStage: true,
        hasDining: true,
        roomsCount: 8,
        otherFacilities: 'Bridal green rooms, VIP lounge, generator backup, valet parking',
        servicesOffered: ['Full Venue Rental', 'Stage Lighting Setup', 'Round Table Banquet Arrangement'],
        portfolioImages: [
          'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1545232979-fbf673646545?auto=format&fit=crop&w=1200&q=80',
        ],
      },
    },
  ];
}

export function getRegisteredProviders(): ProviderAccount[] {
  try {
    const raw = localStorage.getItem(PROVIDERS_KEY);
    if (!raw) {
      const initial = getInitialProviders();
      localStorage.setItem(PROVIDERS_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed reading registered providers from localStorage:', err);
    return getInitialProviders();
  }
}

export function saveProviderAccount(account: ProviderAccount): void {
  try {
    const list = getRegisteredProviders();
    const existingIndex = list.findIndex((p) => p.id === account.id || p.email.toLowerCase() === account.email.toLowerCase());
    if (existingIndex >= 0) {
      list[existingIndex] = { ...list[existingIndex], ...account };
    } else {
      list.push(account);
    }
    localStorage.setItem(PROVIDERS_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Failed saving provider account:', err);
  }
}

/**
 * Lightweight client-side image compression using HTMLCanvasElement.
 * Resizes down to max dimensions preserving aspect ratio and encodes to JPEG at given quality.
 * Shrinks 3-5MB camera files to ~30-90KB, ensuring zero localStorage quota overflows.
 */
export function compressImageFile(
  file: File,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const valid = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!valid.includes(file.type.toLowerCase())) {
      reject(new Error('Invalid image format. Please select a JPG, PNG, or WEBP image.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed reading image file.'));
    reader.onload = (e) => {
      const dataUrl = e.target?.result;
      if (typeof dataUrl !== 'string') {
        reject(new Error('Invalid image data.'));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error('Failed decoding image file.'));
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function getProviderProfile(providerId: string): ProviderAccount | null {
  const list = getRegisteredProviders();
  const found = list.find((p) => p.id === providerId);
  if (found) return found;

  // Fallback to MOCK_PROVIDERS if available
  const mock = MOCK_PROVIDERS.find((p) => p.id === providerId);
  if (mock) {
    return {
      id: mock.id,
      fullName: mock.name,
      businessName: mock.name,
      email: `${mock.id}@eva-ai.internal`,
      phone: '+91 94470 00000',
      location: mock.location,
      description: mock.description || mock.about,
      yearsExperience: mock.yearsExperience || 5,
      startingPrice: mock.startingPrice,
      category: (mock.category as ProviderCategoryType) || 'Photographer',
      profileImage: mock.images?.[0],
      createdAt: new Date().toISOString(),
      categoryData: {
        servicesOffered: mock.services || [],
        portfolioImages: mock.images || [],
        packageInfo: mock.packages?.map((pkg, idx) => ({
          id: `pkg-${mock.id}-${idx + 1}`,
          name: pkg.name,
          price: pkg.price,
          description: pkg.description,
          features: pkg.features || [],
        })),
      },
    };
  }
  return null;
}

export function normalizeBackendProviderProfile(
  raw: any,
  existingFallback?: ProviderAccount | null
): ProviderAccount | null {
  if (!raw || typeof raw !== 'object') return existingFallback || null;
  const data =
    raw.data?.provider ||
    raw.data?.profile ||
    raw.data?.user ||
    raw.data ||
    raw.provider ||
    raw.profile ||
    raw.user ||
    raw;
  if (!data || typeof data !== 'object') return existingFallback || null;

  const id = data.id || data._id || data.providerId || existingFallback?.id || '';
  const fullName = data.fullName || data.name || data.managerName || existingFallback?.fullName || '';
  const businessName =
    data.businessName || data.companyName || data.name || existingFallback?.businessName || fullName || '';
  const email = data.email || existingFallback?.email || '';
  const phone = data.phone || existingFallback?.phone || '';
  const location = data.location || data.city || data.address || existingFallback?.location || '';
  const description = data.description || data.about || existingFallback?.description || '';
  const yearsExperience =
    data.yearsExperience !== undefined && data.yearsExperience !== null
      ? Number(data.yearsExperience)
      : data.experience !== undefined && data.experience !== null
      ? Number(data.experience)
      : existingFallback?.yearsExperience ?? 5;
  const startingPrice =
    data.startingPrice !== undefined && data.startingPrice !== null
      ? Number(data.startingPrice)
      : data.price !== undefined && data.price !== null
      ? Number(data.price)
      : existingFallback?.startingPrice ?? 25000;
  const category = (data.category as ProviderCategoryType) || existingFallback?.category || 'Photographer';
  const profileImage = data.profileImage || data.avatar || data.image || existingFallback?.profileImage;
  const approvalStatus = data.approvalStatus || data.approval_status || existingFallback?.approvalStatus || 'APPROVED';
  const createdAt = data.createdAt || data.created_at || existingFallback?.createdAt || new Date().toISOString();
  const updatedAt = data.updatedAt || data.updated_at || existingFallback?.updatedAt || new Date().toISOString();

  // Merge categoryData safely preserving portfolio and packages
  const incomingCatData = data.categoryData || data.category_data || {};
  const existingCatData = existingFallback?.categoryData || {};

  const mergedCategoryData: CategorySpecificData = {
    ...existingCatData,
    ...incomingCatData,
    photographyStyles: incomingCatData.photographyStyles || existingCatData.photographyStyles,
    equipment: incomingCatData.equipment || incomingCatData.djEquipment || existingCatData.equipment,
    makeupTypes: incomingCatData.makeupTypes || existingCatData.makeupTypes,
    capacity: incomingCatData.capacity !== undefined ? incomingCatData.capacity : existingCatData.capacity,
    hasAC: incomingCatData.hasAC !== undefined ? incomingCatData.hasAC : existingCatData.hasAC,
    hasParking: incomingCatData.hasParking !== undefined ? incomingCatData.hasParking : existingCatData.hasParking,
    hasStage: incomingCatData.hasStage !== undefined ? incomingCatData.hasStage : existingCatData.hasStage,
    hasDining: incomingCatData.hasDining !== undefined ? incomingCatData.hasDining : existingCatData.hasDining,
    roomsCount: incomingCatData.roomsCount !== undefined ? incomingCatData.roomsCount : existingCatData.roomsCount,
    otherFacilities: incomingCatData.otherFacilities || existingCatData.otherFacilities,
    cuisineTypes: incomingCatData.cuisineTypes || existingCatData.cuisineTypes,
    pricePerPerson: incomingCatData.pricePerPerson !== undefined ? incomingCatData.pricePerPerson : existingCatData.pricePerPerson,
    minGuests: incomingCatData.minGuests !== undefined ? incomingCatData.minGuests : existingCatData.minGuests,
    maxGuests: incomingCatData.maxGuests !== undefined ? incomingCatData.maxGuests : existingCatData.maxGuests,
    decorStyles: incomingCatData.decorStyles || existingCatData.decorStyles,
    previousExperience: incomingCatData.previousExperience || existingCatData.previousExperience,
    djEquipment: incomingCatData.djEquipment || existingCatData.djEquipment,
    entertainmentTypes: incomingCatData.entertainmentTypes || existingCatData.entertainmentTypes,
    eventTypesHandled: incomingCatData.eventTypesHandled || existingCatData.eventTypesHandled,
    servicesOffered: incomingCatData.servicesOffered || existingCatData.servicesOffered,
    // Strictly preserve portfolio and pricing tiers!
    portfolioImages:
      incomingCatData.portfolioImages && incomingCatData.portfolioImages.length > 0
        ? incomingCatData.portfolioImages
        : existingCatData.portfolioImages,
    packageInfo:
      incomingCatData.packageInfo && incomingCatData.packageInfo.length > 0
        ? incomingCatData.packageInfo
        : existingCatData.packageInfo,
  };

  return {
    id: id || `prov_${Date.now().toString(36)}`,
    fullName,
    businessName,
    email,
    phone,
    location,
    description,
    yearsExperience,
    startingPrice,
    category,
    profileImage,
    approvalStatus,
    categoryData: mergedCategoryData,
    createdAt,
    updatedAt,
  };
}

export function updateProviderProfile(providerId: string, updates: Partial<ProviderAccount>): ProviderAccount | null {
  try {
    const list = getRegisteredProviders();
    let index = list.findIndex((p) => p.id === providerId);

    // Fallback seed from mock profile if not yet in registered providers list
    if (index === -1) {
      const fallback = getProviderProfile(providerId);
      if (fallback) {
        list.push(fallback);
        index = list.length - 1;
      } else {
        return null;
      }
    }

    list[index] = { ...list[index], ...updates };
    localStorage.setItem(PROVIDERS_KEY, JSON.stringify(list));

    // Keep active session synchronized if relevant fields changed
    const session = getProviderSession();
    if (session && session.providerId === providerId) {
      let sessionUpdated = false;
      if (updates.profileImage !== undefined) {
        session.profileImage = updates.profileImage;
        sessionUpdated = true;
      }
      if (updates.businessName !== undefined) {
        session.businessName = updates.businessName;
        sessionUpdated = true;
      }
      if (updates.fullName !== undefined) {
        session.fullName = updates.fullName;
        sessionUpdated = true;
      }
      if (sessionUpdated) {
        setProviderSession(session);
        window.dispatchEvent(new Event('eva_ai_provider_session_updated'));
      }
    }

    // Dispatch profile update events for cross-component live sync
    window.dispatchEvent(new CustomEvent('eva_ai_provider_profile_updated', { detail: { providerId } }));
    window.dispatchEvent(new Event('storage'));

    return list[index];
  } catch (err) {
    console.warn('Failed updating provider profile:', err);
  }
  return null;
}

/**
 * Normalizes portfolio image data from backend GET /providers/portfolio
 */
export function normalizePortfolioItems(raw: any, fallbackImages: string[] = []): string[] {
  if (!raw) return fallbackImages;
  let list: any[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (Array.isArray(raw?.data)) {
    list = raw.data;
  } else if (Array.isArray(raw?.portfolio)) {
    list = raw.portfolio;
  } else if (Array.isArray(raw?.data?.portfolio)) {
    list = raw.data.portfolio;
  } else if (Array.isArray(raw?.data?.images)) {
    list = raw.data.images;
  } else if (Array.isArray(raw?.images)) {
    list = raw.images;
  } else if (Array.isArray(raw?.data?.portfolioImages)) {
    list = raw.data.portfolioImages;
  } else if (Array.isArray(raw?.portfolioImages)) {
    list = raw.portfolioImages;
  }

  const result: string[] = [];
  for (const item of list) {
    if (typeof item === 'string' && item.trim()) {
      if (!result.includes(item.trim())) result.push(item.trim());
    } else if (item && typeof item === 'object') {
      const url = item.imageUrl || item.url || item.image || item.src;
      if (typeof url === 'string' && url.trim()) {
        if (!result.includes(url.trim())) result.push(url.trim());
      }
    }
  }
  return result.length > 0 ? result : fallbackImages;
}

/**
 * Normalizes package tier data from backend services or portfolio packages
 */
export function normalizeServicePackages(raw: any, fallbackPackages: any[] = []): any[] {
  if (!raw) return fallbackPackages;
  let list: any[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (Array.isArray(raw?.data)) {
    list = raw.data;
  } else if (Array.isArray(raw?.services)) {
    list = raw.services;
  } else if (Array.isArray(raw?.packages)) {
    list = raw.packages;
  } else if (Array.isArray(raw?.data?.packages)) {
    list = raw.data.packages;
  } else if (Array.isArray(raw?.data?.services)) {
    list = raw.data.services;
  } else if (Array.isArray(raw?.packageInfo)) {
    list = raw.packageInfo;
  } else if (Array.isArray(raw?.data?.packageInfo)) {
    list = raw.data.packageInfo;
  }

  const result: any[] = [];
  for (const item of list) {
    if (item && typeof item === 'object') {
      const id =
        item.id ||
        item._id ||
        item.packageId ||
        `pkg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const name = item.name || item.title || item.packageName || 'Service Tier';
      const price = Number(item.price || item.startingPrice || item.rate || 25000);
      const description = item.description || item.about || 'Professional service tier delivery.';
      const features = Array.isArray(item.features)
        ? item.features
        : Array.isArray(item.services)
        ? item.services
        : typeof item.features === 'string'
        ? item.features.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [];

      result.push({
        id,
        name,
        price,
        description,
        features,
      });
    }
  }
  return result.length > 0 ? result : fallbackPackages;
}

/**
 * Authoritative loader: Fetches provider profile from backend and updates local storage cache.
 */
export async function fetchAndCacheProviderProfile(providerId?: string): Promise<ProviderAccount | null> {
  const currentSession = getProviderSession();
  const targetId = providerId || currentSession?.providerId;
  const existingLocal = targetId ? getProviderProfile(targetId) : null;

  try {
    const res: any = await providersApi.getProfile();
    const normalized = normalizeBackendProviderProfile(res, existingLocal);
    if (normalized) {
      saveProviderAccount(normalized);
      if (currentSession && (!targetId || currentSession.providerId === normalized.id)) {
        setProviderSession({
          ...currentSession,
          providerId: normalized.id,
          businessName: normalized.businessName,
          fullName: normalized.fullName,
          email: normalized.email || currentSession.email,
          category: normalized.category,
          profileImage: normalized.profileImage || currentSession.profileImage,
        });
      }
      window.dispatchEvent(new CustomEvent('eva_ai_provider_profile_updated', { detail: { providerId: normalized.id } }));
      window.dispatchEvent(new Event('eva_ai_provider_session_updated'));
      window.dispatchEvent(new Event('storage'));
      return normalized;
    }
  } catch (err) {
    console.warn('Failed fetching authoritative provider profile from backend:', err);
  }
  return existingLocal;
}

/**
 * Returns all providers formatted for customer-side discovery and details,
 * seamlessly merging live modifications from registered providers (localStorage).
 */
export function getAllDisplayProviders(): Provider[] {
  const registered = getRegisteredProviders();
  const regMap = new Map<string, ProviderAccount>();
  registered.forEach((r) => regMap.set(r.id, r));

  const result: Provider[] = [];
  const processedIds = new Set<string>();

  // Process mock providers with live overrides
  for (const base of MOCK_PROVIDERS) {
    processedIds.add(base.id);
    const reg = regMap.get(base.id);
    if (!reg) {
      result.push(base);
      continue;
    }

    // Respect backend approval status: pending, rejected, or suspended providers are hidden from public discovery
    if (
      reg.approvalStatus &&
      ['PENDING', 'REJECTED', 'SUSPENDED'].includes(reg.approvalStatus.toUpperCase())
    ) {
      continue;
    }

    const regImages = reg.categoryData?.portfolioImages;
    const combinedImages: string[] = [];
    if (reg.profileImage) combinedImages.push(reg.profileImage);
    if (regImages && regImages.length > 0) {
      regImages.forEach((img) => {
        if (!combinedImages.includes(img)) combinedImages.push(img);
      });
    }

    result.push({
      ...base,
      name: reg.businessName || reg.fullName || base.name,
      location: reg.location || base.location,
      startingPrice: Number(reg.startingPrice) || base.startingPrice,
      yearsExperience: Number(reg.yearsExperience) || base.yearsExperience,
      description: reg.description || base.description,
      about: reg.description || base.about,
      category: reg.category || base.category,
      images: combinedImages.length > 0 ? combinedImages : base.images,
      priceRange: `₹${(Number(reg.startingPrice) || base.startingPrice).toLocaleString('en-IN')}+`,
      packages:
        reg.categoryData?.packageInfo && reg.categoryData.packageInfo.length > 0
          ? reg.categoryData.packageInfo.map((pkg) => ({
              name: pkg.name,
              price: Number(pkg.price),
              description: pkg.description,
              features: pkg.features && pkg.features.length > 0 ? pkg.features : ['Core consultation & execution'],
            }))
          : base.packages,
      services:
        reg.categoryData?.servicesOffered && reg.categoryData.servicesOffered.length > 0
          ? reg.categoryData.servicesOffered
          : base.services,
      contactDemo: {
        manager: reg.fullName || base.contactDemo.manager,
        phone: reg.phone || base.contactDemo.phone,
        email: reg.email || base.contactDemo.email,
        address: base.contactDemo.address,
        hours: base.contactDemo.hours,
      },
    });
  }

  // Include any newly signed-up providers not in mock list
  for (const reg of registered) {
    if (!processedIds.has(reg.id)) {
      // Respect backend approval status
      if (
        reg.approvalStatus &&
        ['PENDING', 'REJECTED', 'SUSPENDED'].includes(reg.approvalStatus.toUpperCase())
      ) {
        continue;
      }

      const portImages = reg.categoryData?.portfolioImages || [];
      const imagesList = reg.profileImage
        ? [reg.profileImage, ...portImages.filter((img) => img !== reg.profileImage)]
        : portImages.length > 0
        ? portImages
        : ['https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80'];

      result.push({
        id: reg.id,
        name: reg.businessName || reg.fullName,
        category: reg.category,
        location: reg.location || 'Kerala',
        rating: 5.0,
        reviewCount: 1,
        startingPrice: Number(reg.startingPrice) || 25000,
        yearsExperience: Number(reg.yearsExperience) || 3,
        description: reg.description,
        about: reg.description,
        services: reg.categoryData?.servicesOffered || ['Signature Event Services'],
        tags: [reg.category, 'Verified Partner'],
        images: imagesList,
        priceRange: `₹${(Number(reg.startingPrice) || 25000).toLocaleString('en-IN')}+`,
        available: true,
        packages: (reg.categoryData?.packageInfo || []).map((pkg) => ({
          name: pkg.name,
          price: Number(pkg.price),
          description: pkg.description,
          features: pkg.features && pkg.features.length > 0 ? pkg.features : ['Dedicated consultation & execution'],
        })),
        contactDemo: {
          manager: reg.fullName,
          phone: reg.phone,
          email: reg.email,
          address: `${reg.location || 'Kochi'}, Kerala`,
          hours: 'Mon - Sun: 9:00 AM - 8:00 PM',
        },
      });
    }
  }

  return result;
}

/**
 * Returns a single unified Provider for ProviderDetailsPage,
 * merging registered updates and returning raw categoryData.
 */
export function getDisplayProvider(providerId: string): { provider: Provider; account: ProviderAccount | null } | null {
  const account = getProviderProfile(providerId);
  const all = getAllDisplayProviders();
  const found = all.find((p) => p.id === providerId);
  if (found) {
    return { provider: found, account };
  }
  if (account) {
    const portImages = account.categoryData?.portfolioImages || [];
    const imagesList = account.profileImage
      ? [account.profileImage, ...portImages.filter((img) => img !== account.profileImage)]
      : portImages.length > 0
      ? portImages
      : ['https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80'];

    return {
      provider: {
        id: account.id,
        name: account.businessName || account.fullName,
        category: account.category,
        location: account.location || 'Kerala',
        rating: 5.0,
        reviewCount: 1,
        startingPrice: Number(account.startingPrice) || 25000,
        yearsExperience: Number(account.yearsExperience) || 3,
        description: account.description,
        about: account.description,
        services: account.categoryData?.servicesOffered || ['Signature Event Services'],
        tags: [account.category, 'Verified Partner'],
        images: imagesList,
        priceRange: `₹${(Number(account.startingPrice) || 25000).toLocaleString('en-IN')}+`,
        available: true,
        packages: (account.categoryData?.packageInfo || []).map((pkg) => ({
          name: pkg.name,
          price: Number(pkg.price),
          description: pkg.description,
          features: pkg.features && pkg.features.length > 0 ? pkg.features : ['Dedicated consultation & execution'],
        })),
        contactDemo: {
          manager: account.fullName,
          phone: account.phone,
          email: account.email,
          address: `${account.location || 'Kochi'}, Kerala`,
          hours: 'Mon - Sun: 9:00 AM - 8:00 PM',
        },
      },
      account,
    };
  }
  return null;
}

/**
 * Authoritatively fetches providers list from backend GET /providers and refreshes local cache
 */
export async function fetchAndCacheAllProviders(): Promise<Provider[]> {
  try {
    const res: any = await providersApi.getAll();
    const rawList: any[] = Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res?.providers)
      ? res.providers
      : Array.isArray(res)
      ? res
      : [];

    if (rawList.length > 0) {
      for (const item of rawList) {
        if (item && typeof item === 'object') {
          const id = item.id || item._id || item.providerId;
          if (id) {
            const normalized = normalizeBackendProviderProfile(item, getProviderProfile(id));
            if (normalized) {
              saveProviderAccount(normalized);
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn('Failed fetching backend providers list:', err);
  }
  return getAllDisplayProviders();
}

/**
 * Authoritatively fetches a single provider from backend GET /providers/:id and refreshes local cache
 */
export async function fetchAndCacheProviderDetails(
  providerId: string
): Promise<{ provider: Provider; account: ProviderAccount | null } | null> {
  if (!providerId) return null;

  try {
    const res: any = await providersApi.getById(providerId);
    const item = res?.data?.provider || res?.data || res?.provider || res;
    if (item && typeof item === 'object') {
      const normalized = normalizeBackendProviderProfile(item, getProviderProfile(providerId));
      if (normalized) {
        saveProviderAccount(normalized);
      }
    }
  } catch (err) {
    console.warn(`Failed fetching backend provider details for ${providerId}:`, err);
  }

  return getDisplayProvider(providerId);
}

export function getProviderSession(): ProviderSession | null {
  try {
    const raw = localStorage.getItem(PROVIDER_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed reading provider session:', err);
    return null;
  }
}

export function setProviderSession(session: ProviderSession): void {
  try {
    localStorage.setItem(PROVIDER_SESSION_KEY, JSON.stringify(session));
  } catch (err) {
    console.warn('Failed saving provider session:', err);
  }
}

export function clearProviderSession(): void {
  try {
    localStorage.removeItem(PROVIDER_SESSION_KEY);
    setStoredAccessToken(null);
    setStoredRefreshToken(null);
    window.dispatchEvent(new Event('eva_ai_provider_session_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.warn('Failed clearing provider session:', err);
  }
}

/**
 * Performs provider logout:
 * 1. Attempts POST /auth/logout backend request with current Bearer token
 * 2. Clears authentication/session data (tokens and provider session)
 * 3. Preserves all non-auth provider business cache (profile, portfolio, availability, bookings)
 * 4. Ensures frontend session cleanup completes even if backend request fails
 */
export async function logoutProvider(): Promise<void> {
  try {
    await authApi.logout();
  } catch {
    // Best-effort backend notification handled in authApi.logout
  } finally {
    clearProviderSession();
  }
}

export interface VerifyProviderSessionResult {
  valid: boolean;
  user?: any;
  error?: string;
  status?: number;
}

let activeProviderVerificationPromise: Promise<VerifyProviderSessionResult> | null = null;

/**
 * Authoritative session verification for Provider Portal using GET /auth/me.
 * Validates role === 'provider' and user.isActive !== false.
 * Rehydrates provider session & profile from backend source of truth.
 */
export async function verifyProviderSession(): Promise<VerifyProviderSessionResult> {
  if (activeProviderVerificationPromise) {
    return activeProviderVerificationPromise;
  }

  activeProviderVerificationPromise = (async () => {
    let token = getStoredAccessToken();
    const currentSession = getProviderSession();
    const refreshToken = getStoredRefreshToken();

    // If no access token exists but a refresh token is present, attempt refresh first
    if (!token && refreshToken) {
      try {
        const refreshRes = await authApi.refresh(refreshToken);
        token = refreshRes?.data?.token || getStoredAccessToken();
      } catch {
        clearProviderSession();
        return { valid: false, error: 'REFRESH_FAILED' };
      }
    }

    // If no token exists at all
    if (!token) {
      if (!currentSession) {
        return { valid: false, error: 'NO_SESSION' };
      }
      return { valid: false, error: 'NO_TOKEN' };
    }

    try {
      const res = await authApi.me();
      const user = res?.data?.user || res?.user || res?.data;

      if (!user) {
        return { valid: false, error: 'INVALID_USER_DATA' };
      }

      // Role check: must be provider
      if (user.role && user.role !== 'provider') {
        clearProviderSession();
        return { valid: false, error: 'INVALID_ROLE' };
      }

      // Status check: must not be deactivated
      if (user.isActive === false) {
        clearProviderSession();
        return { valid: false, error: 'ACCOUNT_DEACTIVATED' };
      }

      const backendId = user.id || user._id || user.userId || user.providerId || currentSession?.providerId || '';
      const fullName = user.fullName || user.name || currentSession?.fullName || '';
      const businessName = user.businessName || user.companyName || currentSession?.businessName || fullName;
      const email = user.email || currentSession?.email || '';
      const category = (user.category as ProviderCategoryType) || currentSession?.category || 'Photographer';
      const profileImage = user.profileImage || user.avatar || currentSession?.profileImage;

      // Update provider session with backend data (never store password)
      const latestToken = getStoredAccessToken() || token;
      const updatedSession: ProviderSession = {
        providerId: backendId,
        userId: backendId,
        businessName,
        fullName,
        email,
        category,
        profileImage,
        loginAt: currentSession?.loginAt || new Date().toISOString(),
        token: latestToken,
        role: 'provider',
      };
      setProviderSession(updatedSession);

      // Rehydrate local provider profile cache
      const existingAccount = backendId ? getProviderProfile(backendId) : null;
      const normalized = normalizeBackendProviderProfile(user, existingAccount);
      if (normalized) {
        saveProviderAccount(normalized);
      }

      return { valid: true, user };
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          clearProviderSession();
          return { valid: false, status: 401, error: 'UNAUTHORIZED' };
        }
        if (err.status === 403) {
          clearProviderSession();
          return { valid: false, status: 403, error: 'FORBIDDEN' };
        }
      }

      // For transient network failures when an existing session is in localStorage,
      // preserve the existing session without immediately locking out the user
      if (currentSession) {
        return { valid: true, user: currentSession, error: 'OFFLINE_FALLBACK' };
      }

      clearProviderSession();
      return { valid: false, error: 'NETWORK_ERROR' };
    } finally {
      activeProviderVerificationPromise = null;
    }
  })();

  return activeProviderVerificationPromise;
}

/**
 * Centralized Provider Login helper invoking backend POST /auth/login
 */
export async function loginProvider(
  email: string,
  pass: string
): Promise<{ success: boolean; session?: ProviderSession; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();

  try {
    const res = await authApi.login({
      email: cleanEmail,
      password: pass,
    });

    const accessToken =
      res?.data?.session?.access_token ||
      res?.data?.token ||
      res?.data?.accessToken ||
      res?.session?.access_token ||
      res?.token ||
      res?.accessToken ||
      null;

    const refreshToken =
      res?.data?.session?.refresh_token ||
      res?.data?.refreshToken ||
      res?.session?.refresh_token ||
      res?.refreshToken ||
      null;

    const backendUser =
      res?.data?.user && typeof res.data.user === 'object'
        ? res.data.user
        : res?.user && typeof res.user === 'object'
        ? res.user
        : res?.data && typeof res.data === 'object' && ('id' in res.data || 'email' in res.data)
        ? res.data
        : null;

    // Role check: must be provider
    const role = backendUser?.role || res?.data?.role;
    if (role && role !== 'provider') {
      return {
        success: false,
        error: 'This account is registered as a customer. Please sign in via the Customer Portal.',
      };
    }

    // Account active check
    if (backendUser?.isActive === false) {
      return {
        success: false,
        error: 'Your provider account has been deactivated. Please contact support.',
      };
    }

    // Store tokens
    if (accessToken) setStoredAccessToken(accessToken);
    if (refreshToken) setStoredRefreshToken(refreshToken);

    const backendUserId = backendUser?.id || backendUser?._id || backendUser?.userId || backendUser?.providerId || '';
    const fullName = backendUser?.fullName || backendUser?.name || cleanEmail.split('@')[0];
    const businessName = backendUser?.businessName || backendUser?.companyName || fullName;
    const category = (backendUser?.category as ProviderCategoryType) || 'Photographer';
    const profileImage = backendUser?.profileImage || backendUser?.avatar;

    const session: ProviderSession = {
      providerId: backendUserId || `prov_${Date.now().toString(36)}`,
      userId: backendUserId || undefined,
      businessName,
      fullName,
      email: backendUser?.email || cleanEmail,
      category,
      profileImage,
      loginAt: new Date().toISOString(),
      token: accessToken || undefined,
      role: 'provider',
    };

    setProviderSession(session);

    // Save/update cached provider account without password
    const existing = backendUserId ? getProviderProfile(backendUserId) : null;
    const normalized = normalizeBackendProviderProfile(backendUser || res?.data, existing);
    if (normalized) {
      saveProviderAccount(normalized);
    }

    return { success: true, session };
  } catch (err: any) {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        return {
          success: false,
          error: 'Invalid business email or password. Please check your credentials.',
        };
      }
      if (err.status === 403) {
        return {
          success: false,
          error: err.message || 'Your provider account has been deactivated. Please contact support.',
        };
      }
      if (err.status === 400) {
        const msg =
          err.message ||
          (err.missingFields && err.missingFields.length > 0
            ? `Missing required fields: ${err.missingFields.join(', ')}`
            : 'Please enter a valid email and password.');
        return { success: false, error: msg };
      }
      return {
        success: false,
        error: err.message || 'Provider sign in failed. Please try again later.',
      };
    }

    // Fallback: If network error and mock providers match for offline demo
    return {
      success: false,
      error: 'Network request failed. Please check your connectivity and try again.',
    };
  }
}

/**
 * Backward compatibility wrapper for authenticateProvider
 */
export function authenticateProvider(
  email: string,
  pass: string
): Promise<{ success: boolean; session?: ProviderSession; error?: string }> {
  return loginProvider(email, pass);
}

// Calendar Date Normalization Helper avoiding timezone shift bugs
export function normalizeCalendarDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  // If formatted as YYYY-MM-DD or starts with YYYY-MM-DD (e.g. ISO string)
  const ymdMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    return `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`;
  }
  // Fallback for valid date strings
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  return trimmed;
}

// Schedule Availability Normalization & Helpers
export function normalizeUnavailableDates(raw: any): string[] {
  if (!raw) return [];
  let list: any[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (Array.isArray(raw?.data)) {
    list = raw.data;
  } else if (Array.isArray(raw?.dates)) {
    list = raw.dates;
  } else if (Array.isArray(raw?.unavailableDates)) {
    list = raw.unavailableDates;
  } else if (Array.isArray(raw?.data?.dates)) {
    list = raw.data.dates;
  } else if (Array.isArray(raw?.data?.unavailableDates)) {
    list = raw.data.unavailableDates;
  } else if (Array.isArray(raw?.data?.availability)) {
    list = raw.data.availability;
  } else if (Array.isArray(raw?.availability)) {
    list = raw.availability;
  } else if (typeof raw === 'object' && raw !== null) {
    if (Array.isArray(raw?.data?.blockedDates)) list = raw.data.blockedDates;
    else if (Array.isArray(raw?.blockedDates)) list = raw.blockedDates;
  }

  const result: string[] = [];
  for (const item of list) {
    if (typeof item === 'string') {
      const clean = normalizeCalendarDate(item);
      if (clean && !result.includes(clean)) result.push(clean);
    } else if (item && typeof item === 'object') {
      const dateStr =
        item.date ||
        item.eventDate ||
        item.unavailableDate ||
        item.unavailable_date ||
        item.blockedDate;
      if (dateStr && typeof dateStr === 'string') {
        const clean = normalizeCalendarDate(dateStr);
        if (clean && !result.includes(clean)) result.push(clean);
      }
    }
  }
  return result;
}

export function getProviderAvailability(providerId: string): string[] {
  try {
    const raw = localStorage.getItem(PROVIDER_AVAILABILITY_KEY);
    if (!raw) return [];
    const map = JSON.parse(raw);
    return Array.isArray(map[providerId]) ? map[providerId] : [];
  } catch (err) {
    console.warn('Failed reading provider availability:', err);
    return [];
  }
}

export function saveProviderAvailability(providerId: string, unavailableDates: string[]): void {
  try {
    const raw = localStorage.getItem(PROVIDER_AVAILABILITY_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[providerId] = unavailableDates.map((d) => normalizeCalendarDate(d)).filter(Boolean);
    localStorage.setItem(PROVIDER_AVAILABILITY_KEY, JSON.stringify(map));

    // Dispatch custom events and storage event so components can update live
    window.dispatchEvent(new CustomEvent('eva_ai_availability_updated', { detail: { providerId } }));
    window.dispatchEvent(new CustomEvent('eva_ai_provider_availability_updated', { detail: { providerId } }));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.warn('Failed saving provider availability:', err);
  }
}

/**
 * Fetches authoritative unavailable dates from backend and updates local cache.
 */
export async function fetchAndCacheProviderAvailability(providerId: string): Promise<string[]> {
  if (!providerId) return [];
  try {
    const res: any = await providersApi.getUnavailableDates(providerId);
    const raw = res?.data ?? res;
    const backendDates = normalizeUnavailableDates(raw);
    saveProviderAvailability(providerId, backendDates);
    return backendDates;
  } catch (err) {
    console.warn(`Failed fetching backend unavailable dates for provider ${providerId}:`, err);
    return getProviderAvailability(providerId);
  }
}

/**
 * Checks if a specific provider is available on the target event date.
 * If no event date exists, returns true (allows normal browsing as per UX requirement).
 */
export function isProviderAvailable(providerId: string, eventDateStr?: string | null): boolean {
  if (!eventDateStr || !eventDateStr.trim()) {
    return true;
  }
  const cleanTarget = normalizeCalendarDate(eventDateStr);
  if (!cleanTarget) return true;

  const unavailableDates = getProviderAvailability(providerId);
  const isUnavailable = unavailableDates.some((d) => normalizeCalendarDate(d) === cleanTarget);
  return !isUnavailable;
}

/**
 * Check multiple selected services against the event date.
 */
export function checkServicesAvailability<T extends { providerId: string; providerName: string }>(
  services: T[],
  eventDateStr?: string | null
): { available: T[]; unavailable: T[] } {
  const available: T[] = [];
  const unavailable: T[] = [];

  for (const s of services) {
    if (isProviderAvailable(s.providerId, eventDateStr)) {
      available.push(s);
    } else {
      unavailable.push(s);
    }
  }

  return { available, unavailable };
}

// Bookings management for Provider
export function getProviderBookings(providerId: string): Booking[] {
  try {
    const raw = localStorage.getItem(BOOKINGS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((b: Booking) => b.providerId === providerId);
  } catch (err) {
    console.warn('Failed reading bookings for provider:', err);
    return [];
  }
}

export function isValidBookingStatusTransition(current: BookingStatus, next: BookingStatus): boolean {
  if (current === next) return true;
  if (current === 'PENDING') {
    return next === 'ACCEPTED' || next === 'REJECTED' || next === 'CANCELLED';
  }
  if (current === 'ACCEPTED') {
    return next === 'COMPLETED' || next === 'CANCELLED';
  }
  // Terminal states (REJECTED, CANCELLED, COMPLETED) cannot be modified
  return false;
}

export function updateBookingStatus(bookingId: string, status: BookingStatus): boolean {
  try {
    const raw = localStorage.getItem(BOOKINGS_KEY);
    if (!raw) return false;
    const parsed: Booking[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return false;

    const index = parsed.findIndex((b) => b.bookingId === bookingId);
    if (index >= 0) {
      const current = parsed[index].status;
      if (!isValidBookingStatusTransition(current, status)) {
        console.warn(`Disallowed status transition: cannot change booking ${bookingId} from ${current} to ${status}`);
        return false;
      }

      parsed[index] = {
        ...parsed[index],
        status,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(BOOKINGS_KEY, JSON.stringify(parsed));

      // Dispatch synchronized booking update events for cross-component and cross-tab sync
      window.dispatchEvent(
        new CustomEvent('eva_ai_bookings_updated', {
          detail: { bookingId, status, providerId: parsed[index].providerId },
        })
      );
      window.dispatchEvent(new Event('storage'));
      return true;
    }
  } catch (err) {
    console.warn('Failed updating booking status:', err);
  }
  return false;
}

// Convenience: seed a demo booking if a provider has none so they can test Accept / Reject immediately
export function seedDemoBookingIfEmpty(providerId: string, providerName: string, category: string): void {
  try {
    const raw = localStorage.getItem(BOOKINGS_KEY);
    const bookings: Booking[] = raw ? JSON.parse(raw) : [];
    const exists = bookings.some((b) => b.providerId === providerId);
    if (!exists) {
      let custName = 'Pooja & Arjun Nair';
      let custPhone = '+91 98471 23456';
      let custEmail = 'pooja.nair@example.com';
      try {
        const custRaw = localStorage.getItem('eva_ai_customer');
        if (custRaw) {
          const cust = JSON.parse(custRaw);
          if (cust.fullName) custName = cust.fullName;
          if (cust.phone) custPhone = cust.phone;
          if (cust.email) custEmail = cust.email;
        }
      } catch {}

      const demoBooking: Booking = {
        bookingId: `demo-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
        providerId,
        providerName,
        category,
        eventId: 'demo-event-royal-wedding',
        eventType: 'Royal Wedding & Reception',
        eventDate: '2026-11-20',
        location: 'Kochi / Palakkad',
        guestCount: 650,
        startingPrice: 45000,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        notes: 'Grand evening ceremony with custom lighting and guest reception.',
        customerName: custName,
        customerPhone: custPhone,
        customerEmail: custEmail,
      };
      bookings.unshift(demoBooking);
      localStorage.setItem(BOOKINGS_KEY, JSON.stringify(bookings));
    }
  } catch (err) {
    console.warn('Failed seeding demo booking:', err);
  }
}
