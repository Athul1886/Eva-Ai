import { ProviderAccount, ProviderSession, ProviderCategoryType, CategorySpecificData } from '../types/provider';
import { Booking, BookingStatus } from '../types/booking';
import { Provider } from '../types/service';
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

export function getRegisteredProviders(): ProviderAccount[] {
  try {
    const raw = localStorage.getItem(PROVIDERS_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('Failed reading registered providers from localStorage:', err);
    return [];
  }
}

export function saveProviderAccount(account: ProviderAccount): void {
  try {
    if (!account || !account.id) return;
    const list = getRegisteredProviders();
    const accountEmail = typeof account.email === 'string' ? account.email.trim().toLowerCase() : '';

    const existingIndex = list.findIndex((p) => {
      if (p.id === account.id) return true;
      const pEmail = typeof p.email === 'string' ? p.email.trim().toLowerCase() : '';
      if (accountEmail && pEmail && accountEmail === pEmail) return true;
      return false;
    });

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

/**
 * Safely extracts a category name/string from various backend shapes (string, number, object, nested category).
 */
export function extractCategoryString(cat: any): string {
  if (!cat) return '';
  if (typeof cat === 'string') return cat.trim();
  if (typeof cat === 'number' || typeof cat === 'boolean') return String(cat);
  if (typeof cat === 'object') {
    // Check direct candidate fields
    const candidate =
      cat.name ??
      cat.categoryName ??
      cat.category_name ??
      cat.serviceCategory ??
      cat.service_category ??
      cat.providerCategory ??
      cat.provider_category ??
      cat.label ??
      cat.title ??
      cat.category ??
      cat.type ??
      cat.value ??
      cat.slug ??
      cat.id;

    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
    if (typeof candidate === 'object' && candidate !== null) {
      const nested = extractCategoryString(candidate);
      if (nested) return nested;
    }
    if (cat.category) {
      const nested = extractCategoryString(cat.category);
      if (nested) return nested;
    }
    if (cat.service) {
      const nested = extractCategoryString(cat.service);
      if (nested) return nested;
    }
    for (const [k, v] of Object.entries(cat)) {
      if (
        k !== 'id' &&
        k !== '_id' &&
        k !== 'createdAt' &&
        k !== 'updatedAt' &&
        typeof v === 'string' &&
        v.trim() &&
        v.length < 100
      ) {
        return v.trim();
      }
    }
  }
  return '';
}

/**
 * Single source of truth for normalizing provider category into valid ProviderCategoryType.
 * Preserves dynamic categories and correctly handles aliases without generic fallbacks to Event Manager.
 */
export function normalizeProviderCategory(cat: any): ProviderCategoryType | '' {
  const str = extractCategoryString(cat);
  if (!str) return '';

  const lower = str.toLowerCase();

  // 1. Photographer & Cinematography
  if (
    lower === 'photographer' ||
    lower === 'photography' ||
    lower.includes('photo') ||
    lower.includes('camera') ||
    lower.includes('cinematograph') ||
    lower.includes('videograph') ||
    lower.includes('album') ||
    lower.includes('film')
  ) {
    return 'Photographer';
  }

  // 2. Makeup & Beauty
  if (
    lower === 'makeup artist' ||
    lower === 'makeup' ||
    lower === 'make-up' ||
    lower === 'make up' ||
    lower.includes('makeup') ||
    lower.includes('make-up') ||
    lower.includes('make up') ||
    lower.includes('bridal makeup') ||
    lower.includes('beauty') ||
    lower.includes('cosmetic') ||
    lower.includes('salon') ||
    lower.includes('makeover') ||
    lower.includes('hair stylist') ||
    lower.includes('mehendi') ||
    lower.includes('mehndi') ||
    lower.includes('henna')
  ) {
    return 'Makeup Artist';
  }

  // 3. Venue / Auditorium / Halls
  if (
    lower === 'venue / auditorium' ||
    lower === 'venue & auditorium' ||
    lower === 'venue' ||
    lower === 'auditorium' ||
    lower.includes('venue') ||
    lower.includes('auditorium') ||
    lower.includes('hall') ||
    lower.includes('convention') ||
    lower.includes('ballroom') ||
    lower.includes('resort') ||
    lower.includes('palace')
  ) {
    return 'Venue / Auditorium';
  }

  // 4. Caterer / Catering / Food
  if (
    lower === 'caterer' ||
    lower === 'catering' ||
    lower.includes('cater') ||
    lower.includes('food') ||
    lower.includes('sadya') ||
    lower.includes('sadhya') ||
    lower.includes('culinary') ||
    lower.includes('cuisine') ||
    lower.includes('dining') ||
    lower.includes('chef')
  ) {
    return 'Caterer';
  }

  // 5. Decorator / Floral / Mandap
  if (
    lower === 'decorator' ||
    lower === 'decoration' ||
    lower.includes('decor') ||
    lower.includes('mandap') ||
    lower.includes('florist') ||
    lower.includes('floral') ||
    lower.includes('flower') ||
    lower.includes('stage decor')
  ) {
    return 'Decorator';
  }

  // 6. DJ / Entertainment / Artist / Live Bands / Music / Sound
  if (
    lower === 'dj / entertainment' ||
    lower === 'dj & entertainment' ||
    lower === 'dj / artist' ||
    lower === 'dj & artist' ||
    lower === 'dj/artist' ||
    lower === 'dj' ||
    lower === 'entertainment' ||
    lower === 'artist' ||
    lower.includes('dj') ||
    lower.includes('entertain') ||
    lower.includes('music') ||
    lower.includes('sound') ||
    lower.includes('band') ||
    lower.includes('singer') ||
    lower.includes('acoustic') ||
    lower.includes('audio') ||
    lower.includes('performer') ||
    lower.includes('performance') ||
    lower.includes('orchestra')
  ) {
    return 'DJ / Entertainment';
  }

  // 7. Event Manager / Coordinator / Planner
  if (
    lower === 'event manager' ||
    lower === 'event management' ||
    lower === 'event planner' ||
    lower === 'event planning' ||
    lower === 'event coordinator' ||
    lower === 'coordinator' ||
    lower === 'coordination' ||
    lower === 'event organizer' ||
    lower === 'organizer' ||
    lower === 'planner' ||
    lower.includes('event manager') ||
    lower.includes('event management') ||
    lower.includes('event planner') ||
    lower.includes('event coordinat') ||
    lower.includes('coordinat') ||
    lower.includes('planner') ||
    lower.includes('organizer') ||
    lower === 'event' ||
    lower === 'management'
  ) {
    return 'Event Manager';
  }

  // Return original trimmed category string if not in the default 7
  return str as ProviderCategoryType;
}

export function getProviderProfile(providerId: string): ProviderAccount | null {
  if (!providerId) return null;
  const list = getRegisteredProviders();
  const trimmed = providerId.trim().toLowerCase();
  const isEmailSearch = trimmed.includes('@');
  const found = list.find(
    (p) =>
      p.id === providerId ||
      (p.id && p.id.toLowerCase() === trimmed) ||
      (isEmailSearch && p.email && p.email.trim().toLowerCase() === trimmed)
  );
  return found || null;
}

export function normalizeBackendProviderProfile(
  raw: any,
  existingFallback?: ProviderAccount | null
): ProviderAccount | null {
  if (!raw || typeof raw !== 'object') return existingFallback || null;

  // Extract candidate nested objects to inspect all response levels safely
  const rawData = raw.data && typeof raw.data === 'object' ? raw.data : {};
  const rawProvider = raw.provider && typeof raw.provider === 'object' ? raw.provider : {};
  const rawProfile = raw.profile && typeof raw.profile === 'object' ? raw.profile : {};
  const rawUser = raw.user && typeof raw.user === 'object' ? raw.user : {};
  const rawProviderProfile = raw.providerProfile && typeof raw.providerProfile === 'object' ? raw.providerProfile : {};
  const rawProviderProfileSnake = raw.provider_profile && typeof raw.provider_profile === 'object' ? raw.provider_profile : {};

  const dataProvider = rawData.provider && typeof rawData.provider === 'object' ? rawData.provider : {};
  const dataProfile = rawData.profile && typeof rawData.profile === 'object' ? rawData.profile : {};
  const dataUser = rawData.user && typeof rawData.user === 'object' ? rawData.user : {};
  const dataProviderProfile = rawData.providerProfile && typeof rawData.providerProfile === 'object' ? rawData.providerProfile : {};
  const dataProviderProfileSnake = rawData.provider_profile && typeof rawData.provider_profile === 'object' ? rawData.provider_profile : {};

  const userProviderProfile = rawUser.providerProfile && typeof rawUser.providerProfile === 'object' ? rawUser.providerProfile : {};
  const userProviderProfileSnake = rawUser.provider_profile && typeof rawUser.provider_profile === 'object' ? rawUser.provider_profile : {};
  const userProvider = rawUser.provider && typeof rawUser.provider === 'object' ? rawUser.provider : {};

  const dataUserProviderProfile = dataUser.providerProfile && typeof dataUser.providerProfile === 'object' ? dataUser.providerProfile : {};
  const dataUserProviderProfileSnake = dataUser.provider_profile && typeof dataUser.provider_profile === 'object' ? dataUser.provider_profile : {};
  const dataUserProvider = dataUser.provider && typeof dataUser.provider === 'object' ? dataUser.provider : {};

  // Merged lookup object where provider/profile properties take precedence, with user/data enrichment
  const data = {
    ...raw,
    ...rawData,
    ...rawUser,
    ...dataUser,
    ...rawProfile,
    ...dataProfile,
    ...rawProviderProfile,
    ...rawProviderProfileSnake,
    ...dataProviderProfile,
    ...dataProviderProfileSnake,
    ...userProviderProfile,
    ...userProviderProfileSnake,
    ...userProvider,
    ...dataUserProviderProfile,
    ...dataUserProviderProfileSnake,
    ...dataUserProvider,
    ...rawProvider,
    ...dataProvider,
  };
  if (!data || typeof data !== 'object') return existingFallback || null;

  const id =
    dataProvider.id || dataProvider._id || dataProvider.providerId || dataProvider.provider_id ||
    rawProvider.id || rawProvider._id || rawProvider.providerId || rawProvider.provider_id ||
    dataProviderProfile.id || dataProviderProfile._id || dataProviderProfile.providerId || dataProviderProfile.provider_id ||
    rawProviderProfile.id || rawProviderProfile._id || rawProviderProfile.providerId || rawProviderProfile.provider_id ||
    rawData.id || rawData._id || rawData.providerId || rawData.provider_id ||
    raw.id || raw._id || raw.providerId || raw.provider_id ||
    dataProfile.id || dataProfile._id || dataProfile.providerId || dataProfile.provider_id ||
    rawProfile.id || rawProfile._id || rawProfile.providerId || rawProfile.provider_id ||
    dataUser.id || dataUser._id || dataUser.userId || dataUser.user_id ||
    rawUser.id || rawUser._id || rawUser.userId || rawUser.user_id ||
    data.userId || data.user_id ||
    existingFallback?.id ||
    '';

  // Explicit fullName resolution (prioritizing explicit fullName / contact person / manager / user fields)
  const explicitFullName =
    dataProvider.fullName || dataProvider.full_name || dataProvider.managerName || dataProvider.manager_name || dataProvider.contactPerson || dataProvider.contact_person ||
    rawProvider.fullName || rawProvider.full_name || rawProvider.managerName || rawProvider.manager_name || rawProvider.contactPerson || rawProvider.contact_person ||
    dataProfile.fullName || dataProfile.full_name || dataProfile.managerName || dataProfile.manager_name || dataProfile.contactPerson || dataProfile.contact_person ||
    rawProfile.fullName || rawProfile.full_name || rawProfile.managerName || rawProfile.manager_name || rawProfile.contactPerson || rawProfile.contact_person ||
    dataUser.fullName || dataUser.full_name || dataUser.name || dataUser.managerName || dataUser.manager_name || dataUser.contactPerson || dataUser.contact_person ||
    rawUser.fullName || rawUser.full_name || rawUser.name || rawUser.managerName || rawUser.manager_name || rawUser.contactPerson || rawUser.contact_person ||
    rawData.fullName || rawData.full_name || rawData.managerName || rawData.manager_name || rawData.contactPerson || rawData.contact_person ||
    raw.fullName || raw.full_name || raw.managerName || raw.manager_name || raw.contactPerson || raw.contact_person ||
    existingFallback?.fullName ||
    '';

  // Explicit businessName resolution (prioritizing business / brand / venue / company / studio fields)
  const explicitBusinessName =
    dataProvider.businessName || dataProvider.business_name || dataProvider.brandName || dataProvider.brand_name || dataProvider.venueName || dataProvider.venue_name || dataProvider.companyName || dataProvider.company_name || dataProvider.studioName || dataProvider.studio_name ||
    rawProvider.businessName || rawProvider.business_name || rawProvider.brandName || rawProvider.brand_name || rawProvider.venueName || rawProvider.venue_name || rawProvider.companyName || rawProvider.company_name || rawProvider.studioName || rawProvider.studio_name ||
    dataProfile.businessName || dataProfile.business_name || dataProfile.brandName || dataProfile.brand_name || dataProfile.venueName || dataProfile.venue_name || dataProfile.companyName || dataProfile.company_name || dataProfile.studioName || dataProfile.studio_name ||
    rawProfile.businessName || rawProfile.business_name || rawProfile.brandName || rawProfile.brand_name || rawProfile.venueName || rawProfile.venue_name || rawProfile.companyName || rawProfile.company_name || rawProfile.studioName || rawProfile.studio_name ||
    rawData.businessName || rawData.business_name || rawData.brandName || rawData.brand_name || rawData.venueName || rawData.venue_name || rawData.companyName || rawData.company_name || rawData.studioName || rawData.studio_name ||
    raw.businessName || raw.business_name || raw.brandName || raw.brand_name || raw.venueName || raw.venue_name || raw.companyName || raw.company_name || raw.studioName || raw.studio_name ||
    existingFallback?.businessName ||
    '';

  const genericName =
    dataProvider.name ||
    rawProvider.name ||
    dataProfile.name ||
    rawProfile.name ||
    rawData.name ||
    raw.name ||
    '';

  let businessName = '';
  let fullName = '';

  if (explicitBusinessName && explicitFullName) {
    businessName = explicitBusinessName;
    fullName = explicitFullName;
  } else if (explicitBusinessName && !explicitFullName) {
    businessName = explicitBusinessName;
    fullName = genericName && genericName.trim().toLowerCase() !== explicitBusinessName.trim().toLowerCase()
      ? genericName
      : existingFallback?.fullName || '';
  } else if (!explicitBusinessName && explicitFullName) {
    fullName = explicitFullName;
    businessName = genericName && genericName.trim().toLowerCase() !== explicitFullName.trim().toLowerCase()
      ? genericName
      : explicitFullName;
  } else if (genericName) {
    businessName = genericName;
    fullName = existingFallback?.fullName || genericName;
  } else {
    businessName = existingFallback?.businessName || '';
    fullName = existingFallback?.fullName || '';
  }

  const email = data.email || existingFallback?.email || '';
  const phone = data.phone || data.phoneNumber || data.phone_number || existingFallback?.phone || '';

  // Location normalization: check all candidate sources across provider, user, data, and root
  const rawLoc =
    dataProvider.location || dataProvider.location_name ||
    rawProvider.location || rawProvider.location_name ||
    dataProfile.location || dataProfile.location_name ||
    rawProfile.location || rawProfile.location_name ||
    dataUser.location || dataUser.location_name ||
    rawUser.location || rawUser.location_name ||
    rawData.location || rawData.location_name ||
    raw.location || raw.location_name ||
    '';

  const rawCity =
    dataProvider.city || rawProvider.city ||
    dataProfile.city || rawProfile.city ||
    dataUser.city || rawUser.city ||
    rawData.city || raw.city ||
    '';

  const rawState =
    dataProvider.state || rawProvider.state ||
    dataProfile.state || rawProfile.state ||
    dataUser.state || rawUser.state ||
    rawData.state || raw.state ||
    '';

  const rawDistrict =
    dataProvider.district || rawProvider.district ||
    dataProfile.district || rawProfile.district ||
    dataUser.district || rawUser.district ||
    rawData.district || raw.district ||
    '';

  const rawAddress =
    dataProvider.address || rawProvider.address ||
    dataProfile.address || rawProfile.address ||
    dataUser.address || rawUser.address ||
    rawData.address || raw.address ||
    '';

  let location = '';
  if (typeof rawLoc === 'string' && rawLoc.trim()) {
    location = rawLoc.trim();
  } else if (rawCity && rawState) {
    const c = String(rawCity).trim();
    const s = String(rawState).trim();
    location = c.toLowerCase() === s.toLowerCase() ? c : `${c}, ${s}`;
  } else if (rawDistrict && rawState) {
    const d = String(rawDistrict).trim();
    const s = String(rawState).trim();
    location = d.toLowerCase() === s.toLowerCase() ? d : `${d}, ${s}`;
  } else if (rawCity) {
    location = String(rawCity).trim();
  } else if (rawDistrict) {
    location = String(rawDistrict).trim();
  } else if (rawState) {
    location = String(rawState).trim();
  } else if (rawAddress) {
    location = String(rawAddress).trim();
  } else {
    location = existingFallback?.location || '';
  }

  const description = data.description || data.about || data.bio || existingFallback?.description || '';

  // Experience: Preserve valid 0; check all camelCase, snake_case, and alias variations
  const rawYears =
    data.yearsExperience !== undefined && data.yearsExperience !== null
      ? data.yearsExperience
      : data.years_experience !== undefined && data.years_experience !== null
        ? data.years_experience
        : data.experience !== undefined && data.experience !== null
          ? data.experience
          : data.experience_years !== undefined && data.experience_years !== null
            ? data.experience_years
            : data.experienceYears !== undefined && data.experienceYears !== null
              ? data.experienceYears
              : data.years !== undefined && data.years !== null
                ? data.years
                : data.yearsOfExperience !== undefined && data.yearsOfExperience !== null
                  ? data.yearsOfExperience
                  : data.years_of_experience !== undefined && data.years_of_experience !== null
                    ? data.years_of_experience
                    : data.experience_in_years !== undefined && data.experience_in_years !== null
                      ? data.experience_in_years
                      : existingFallback?.yearsExperience;

  const yearsExperience =
    rawYears !== undefined &&
      rawYears !== null &&
      rawYears !== '' &&
      !isNaN(Number(rawYears))
      ? Number(rawYears)
      : 0;

  // Starting price: Preserve valid 0 or number; check snake_case variations
  const rawStartingPrice =
    data.startingPrice !== undefined && data.startingPrice !== null
      ? data.startingPrice
      : data.starting_price !== undefined && data.starting_price !== null
        ? data.starting_price
        : data.basePrice !== undefined && data.basePrice !== null
          ? data.basePrice
          : data.base_price !== undefined && data.base_price !== null
            ? data.base_price
            : data.price !== undefined && data.price !== null
              ? data.price
              : data.rate !== undefined && data.rate !== null
                ? data.rate
                : data.startingRate !== undefined && data.startingRate !== null
                  ? data.startingRate
                  : data.starting_rate !== undefined && data.starting_rate !== null
                    ? data.starting_rate
                    : data.minPrice !== undefined && data.minPrice !== null
                      ? data.minPrice
                      : data.min_price !== undefined && data.min_price !== null
                        ? data.min_price
                        : existingFallback?.startingPrice;

  const startingPrice =
    rawStartingPrice !== undefined && rawStartingPrice !== null && rawStartingPrice !== '' && !isNaN(Number(rawStartingPrice))
      ? Number(rawStartingPrice)
      : 0;

  // Extract category checking all backend response field variations
  const rawCat =
    extractCategoryString(dataProvider.category) ||
    extractCategoryString(dataProvider.serviceCategory) ||
    extractCategoryString(dataProvider.service_category) ||
    extractCategoryString(dataProvider.providerCategory) ||
    extractCategoryString(dataProvider.provider_category) ||
    extractCategoryString(dataProvider.categoryName) ||
    extractCategoryString(dataProvider.category_name) ||
    extractCategoryString(dataProvider.category_id) ||
    extractCategoryString(dataProvider.categoryId) ||
    extractCategoryString(rawProvider.category) ||
    extractCategoryString(rawProvider.serviceCategory) ||
    extractCategoryString(rawProvider.service_category) ||
    extractCategoryString(rawProvider.providerCategory) ||
    extractCategoryString(rawProvider.categoryName) ||
    extractCategoryString(dataProviderProfile.category) ||
    extractCategoryString(dataProviderProfile.serviceCategory) ||
    extractCategoryString(dataProviderProfileSnake.category) ||
    extractCategoryString(rawProviderProfile.category) ||
    extractCategoryString(rawProviderProfileSnake.category) ||
    extractCategoryString(userProviderProfile.category) ||
    extractCategoryString(userProviderProfileSnake.category) ||
    extractCategoryString(userProvider.category) ||
    extractCategoryString(dataUserProviderProfile.category) ||
    extractCategoryString(dataUserProviderProfileSnake.category) ||
    extractCategoryString(dataUserProvider.category) ||
    extractCategoryString(dataProfile.category) ||
    extractCategoryString(dataProfile.serviceCategory) ||
    extractCategoryString(rawProfile.category) ||
    extractCategoryString(rawProfile.serviceCategory) ||
    extractCategoryString(dataUser.category) ||
    extractCategoryString(dataUser.serviceCategory) ||
    extractCategoryString(dataUser.service_category) ||
    extractCategoryString(rawUser.category) ||
    extractCategoryString(rawUser.serviceCategory) ||
    extractCategoryString(rawUser.service_category) ||
    extractCategoryString(rawData.category) ||
    extractCategoryString(rawData.serviceCategory) ||
    extractCategoryString(rawData.service_category) ||
    extractCategoryString(rawData.providerCategory) ||
    extractCategoryString(rawData.categoryName) ||
    extractCategoryString(data.category) ||
    extractCategoryString(data.serviceCategory) ||
    extractCategoryString(data.service_category) ||
    extractCategoryString(data.providerCategory) ||
    extractCategoryString(data.categoryName) ||
    extractCategoryString(raw.category) ||
    extractCategoryString(raw.serviceCategory) ||
    extractCategoryString(raw.service_category) ||
    extractCategoryString(raw.providerCategory) ||
    extractCategoryString(raw.categoryName) ||
    extractCategoryString(data.service?.category) ||
    extractCategoryString(raw.service?.category);

  const normalizedCategory = normalizeProviderCategory(rawCat);
  const fallbackCat = existingFallback?.category ? normalizeProviderCategory(existingFallback.category) : '';
  const currentSessionCat = getProviderSession()?.providerId === id ? normalizeProviderCategory(getProviderSession()?.category) : '';

  const category: ProviderCategoryType =
    (normalizedCategory as ProviderCategoryType) ||
    (fallbackCat as ProviderCategoryType) ||
    (currentSessionCat as ProviderCategoryType) ||
    (rawCat ? (rawCat as ProviderCategoryType) : ('' as ProviderCategoryType));

  // Support all backend profile image keys
  const profileImage =
    data.profileImage ||
    data.profile_image ||
    data.imageUrl ||
    data.image_url ||
    data.avatar ||
    data.avatar_url ||
    data.coverImage ||
    data.cover_image ||
    data.photoUrl ||
    data.photo_url ||
    data.fileUrl ||
    data.file_url ||
    data.mediaUrl ||
    data.media_url ||
    data.image ||
    existingFallback?.profileImage;

  const approvalStatus = data.approvalStatus || data.approval_status || existingFallback?.approvalStatus || 'APPROVED';
  const createdAt = data.createdAt || data.created_at || existingFallback?.createdAt || new Date().toISOString();
  const updatedAt = data.updatedAt || data.updated_at || existingFallback?.updatedAt || new Date().toISOString();

  // Merge categoryData safely preserving portfolio and packages
  const incomingCatData = data.categoryData || data.category_data || {};
  const existingCatData = existingFallback?.categoryData || {};

  // Normalize packages from root or categoryData if provided by backend
  const rawIncomingPackages =
    incomingCatData.packageInfo ||
    incomingCatData.package_info ||
    incomingCatData.packages ||
    incomingCatData.services ||
    data.packageInfo ||
    data.package_info ||
    data.packages ||
    data.services ||
    data.servicePackages ||
    data.service_packages ||
    raw.packages ||
    raw.services;

  const mergedPackageInfo = rawIncomingPackages
    ? normalizeServicePackages(rawIncomingPackages)
    : existingCatData.packageInfo;

  // Normalize portfolio items from root or categoryData if provided
  const rawIncomingPortfolio =
    incomingCatData.portfolioImages ||
    incomingCatData.portfolio_images ||
    incomingCatData.portfolio ||
    incomingCatData.portfolios ||
    incomingCatData.images ||
    dataProvider.portfolioImages ||
    dataProvider.portfolio_images ||
    dataProvider.portfolio ||
    dataProvider.portfolios ||
    dataProvider.images ||
    rawProvider.portfolioImages ||
    rawProvider.portfolio_images ||
    rawProvider.portfolio ||
    rawProvider.portfolios ||
    rawProvider.images ||
    dataProfile.portfolioImages ||
    dataProfile.portfolio_images ||
    dataProfile.portfolio ||
    dataProfile.portfolios ||
    dataProfile.images ||
    rawData.portfolioImages ||
    rawData.portfolio_images ||
    rawData.portfolio ||
    rawData.portfolios ||
    rawData.images ||
    data.portfolioImages ||
    data.portfolio_images ||
    data.portfolio ||
    data.portfolios ||
    data.images ||
    raw.portfolioImages ||
    raw.portfolio_images ||
    raw.portfolio ||
    raw.portfolios ||
    raw.images;

  const mergedPortfolioImages = rawIncomingPortfolio !== undefined && rawIncomingPortfolio !== null
    ? normalizePortfolioItems(rawIncomingPortfolio)
    : existingCatData.portfolioImages;

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
    portfolioImages: mergedPortfolioImages,
    packageInfo: mergedPackageInfo,
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
  if (raw === undefined || raw === null) return fallbackImages;
  let list: any[] | null = null;
  if (Array.isArray(raw)) {
    list = raw;
  } else if (Array.isArray(raw?.portfolios)) {
    list = raw.portfolios;
  } else if (Array.isArray(raw?.portfolio)) {
    list = raw.portfolio;
  } else if (Array.isArray(raw?.data?.portfolios)) {
    list = raw.data.portfolios;
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
  } else if (Array.isArray(raw?.data?.items)) {
    list = raw.data.items;
  } else if (Array.isArray(raw?.items)) {
    list = raw.items;
  } else if (Array.isArray(raw?.data?.portfolioItems)) {
    list = raw.data.portfolioItems;
  } else if (Array.isArray(raw?.portfolioItems)) {
    list = raw.portfolioItems;
  } else if (Array.isArray(raw?.data)) {
    list = raw.data;
  }

  if (list === null) {
    return fallbackImages;
  }

  const result: string[] = [];
  for (const item of list) {
    if (typeof item === 'string' && item.trim()) {
      if (!result.includes(item.trim())) result.push(item.trim());
    } else if (item && typeof item === 'object') {
      const url =
        item.imageUrl ||
        item.image_url ||
        item.url ||
        item.image ||
        item.src ||
        item.media_url ||
        item.mediaUrl ||
        item.photo ||
        item.photo_url ||
        item.fileUrl ||
        item.file_url ||
        item.portfolio_url ||
        item.portfolioUrl ||
        item.path;
      if (typeof url === 'string' && url.trim()) {
        if (!result.includes(url.trim())) result.push(url.trim());
      }
    }
  }
  return result;
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
      const name = item.name || item.title || item.packageName || 'Service Package';
      const rawPrice =
        item.price !== undefined && item.price !== null
          ? item.price
          : item.startingPrice !== undefined && item.startingPrice !== null
            ? item.startingPrice
            : item.starting_price !== undefined && item.starting_price !== null
              ? item.starting_price
              : item.rate !== undefined && item.rate !== null
                ? item.rate
                : item.basePrice !== undefined && item.basePrice !== null
                  ? item.basePrice
                  : item.base_price;
      const price =
        rawPrice !== undefined && rawPrice !== null && rawPrice !== '' && !isNaN(Number(rawPrice))
          ? Number(rawPrice)
          : 0;
      const description = item.description || item.about || '';
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
 * Maps a normalized ProviderAccount into the customer-facing Provider model.
 */
export function mapProviderAccountToDisplayProvider(account: ProviderAccount): Provider {
  const portImages = account.categoryData?.portfolioImages || [];
  const imagesList = account.profileImage
    ? [account.profileImage, ...portImages.filter((img) => img !== account.profileImage)]
    : portImages.length > 0
      ? portImages
      : [];

  const rawStarting =
    account.startingPrice !== undefined && account.startingPrice !== null && account.startingPrice !== '' && !isNaN(Number(account.startingPrice))
      ? Number(account.startingPrice)
      : (account.categoryData?.packageInfo && account.categoryData.packageInfo.length > 0
        ? Math.min(...account.categoryData.packageInfo.map((p) => Number(p.price) || 0))
        : 0);

  const yearsExp =
    account.yearsExperience !== undefined && account.yearsExperience !== null && account.yearsExperience !== '' && !isNaN(Number(account.yearsExperience))
      ? Number(account.yearsExperience)
      : 0;

  const actualPackages =
    account.categoryData?.packageInfo && account.categoryData.packageInfo.length > 0
      ? account.categoryData.packageInfo.map((pkg) => ({
        id: pkg.id,
        name: pkg.name || 'Service Package',
        price: Number(pkg.price) || 0,
        description: pkg.description || '',
        features:
          pkg.features && pkg.features.length > 0
            ? pkg.features
            : [],
      }))
      : [];

  return {
    id: account.id,
    name: account.businessName || account.fullName || 'Service Provider',
    category: account.category || 'General Service',
    location: account.location || '',
    rating: 5.0,
    reviewCount: 1,
    startingPrice: rawStarting,
    yearsExperience: yearsExp,
    description: account.description || '',
    about: account.description || '',
    services:
      account.categoryData?.servicesOffered && account.categoryData.servicesOffered.length > 0
        ? account.categoryData.servicesOffered
        : ['Signature Event Services'],
    tags: [account.category || 'Service', 'Verified Partner'],
    images: imagesList,
    priceRange: rawStarting > 0 ? `₹${rawStarting.toLocaleString('en-IN')}+` : 'Contact for pricing',
    available: true,
    packages: actualPackages,
    contactDemo: {
      manager: account.fullName || account.businessName || 'Partner Manager',
      phone: account.phone || '',
      email: account.email || '',
      address: account.location ? `${account.location}, India` : 'India',
      hours: 'Mon - Sun: 9:00 AM - 8:00 PM',
    },
  };
}

/**
 * Returns all approved, active providers formatted for customer-side discovery and details.
 * Strictly avoids mock provider fallbacks.
 */
export function getAllDisplayProviders(): Provider[] {
  const registered = getRegisteredProviders();
  const result: Provider[] = [];
  const seenIds = new Set<string>();

  for (const reg of registered) {
    if (!reg || !reg.id || seenIds.has(reg.id)) {
      continue;
    }

    // Respect backend approval status
    if (
      reg.approvalStatus &&
      ['PENDING', 'REJECTED', 'SUSPENDED'].includes(reg.approvalStatus.toUpperCase())
    ) {
      continue;
    }

    // Respect backend active/inactive state
    if (
      (reg as any).isActive === false ||
      (reg as any).is_active === false ||
      (reg as any).status === 'inactive' ||
      (reg as any).status === 'suspended'
    ) {
      continue;
    }

    seenIds.add(reg.id);
    result.push(mapProviderAccountToDisplayProvider(reg));
  }

  return result;
}

/**
 * Returns a single unified Provider for ProviderDetailsPage.
 * Strictly respects backend approval status and active state.
 */
export function getDisplayProvider(
  providerId: string
): { provider: Provider; account: ProviderAccount | null } | null {
  if (!providerId) return null;
  const account = getProviderProfile(providerId);
  if (!account) return null;

  // Respect backend approval status
  if (
    account.approvalStatus &&
    ['PENDING', 'REJECTED', 'SUSPENDED'].includes(account.approvalStatus.toUpperCase())
  ) {
    return null;
  }

  // Respect backend active state
  if (
    (account as any).isActive === false ||
    (account as any).is_active === false ||
    (account as any).status === 'inactive' ||
    (account as any).status === 'suspended'
  ) {
    return null;
  }

  return {
    provider: mapProviderAccountToDisplayProvider(account),
    account,
  };
}

/**
 * Authoritatively fetches providers list from backend GET /providers and refreshes local cache.
 * Fresh backend response replaces the cached provider list rather than merging with mock data.
 */
export async function fetchAndCacheAllProviders(): Promise<Provider[]> {
  try {
    const res: any = await providersApi.getAll();
    const rawList: any[] = Array.isArray(res?.data?.providers)
      ? res.data.providers
      : Array.isArray(res?.data)
        ? res.data
        : Array.isArray(res?.providers)
          ? res.providers
          : Array.isArray(res)
            ? res
            : [];

    const normalizedAccounts: ProviderAccount[] = [];
    const displayProviders: Provider[] = [];
    const seenIds = new Set<string>();

    for (const item of rawList) {
      if (item && typeof item === 'object') {
        const id = item.id || item._id || item.providerId;
        if (!id || seenIds.has(id)) continue;

        // Respect approval status
        const approvalStatus = (
          item.approvalStatus ||
          item.approval_status ||
          item.status ||
          'APPROVED'
        ).toUpperCase();
        if (['PENDING', 'REJECTED', 'SUSPENDED'].includes(approvalStatus)) {
          continue;
        }

        // Respect active/inactive state
        if (
          item.isActive === false ||
          item.is_active === false ||
          item.status === 'inactive' ||
          item.status === 'suspended'
        ) {
          continue;
        }

        const existing = id ? getProviderProfile(id) : null;
        const normalized = normalizeBackendProviderProfile(item, existing);
        if (normalized && normalized.id && !seenIds.has(normalized.id)) {
          seenIds.add(normalized.id);
          normalizedAccounts.push(normalized);
          displayProviders.push(mapProviderAccountToDisplayProvider(normalized));
        }
      }
    }

    // Fresh backend response replaces the cached provider list
    try {
      localStorage.setItem(PROVIDERS_KEY, JSON.stringify(normalizedAccounts));
    } catch (e) {
      console.warn('Failed to update provider cache in localStorage:', e);
    }

    return displayProviders;
  } catch (err) {
    console.warn('Failed fetching backend providers list:', err);
    // Offline/fallback cache read only if network/API fails
    return getAllDisplayProviders();
  }
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
    if (res && typeof res === 'object') {
      const normalized = normalizeBackendProviderProfile(res, getProviderProfile(providerId));
      if (normalized) {
        saveProviderAccount(normalized);
        const display = mapProviderAccountToDisplayProvider(normalized);
        return { provider: display, account: normalized };
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

      const providerProfileId =
        user.providerProfile?.id ||
        user.provider?.id ||
        user.profile?.id ||
        user.providerProfileId ||
        user.provider_profile_id ||
        res?.data?.providerProfile?.id ||
        res?.data?.provider?.id ||
        res?.data?.profile?.id ||
        null;

      const backendUserId =
        user.id ||
        user._id ||
        user.userId ||
        currentSession?.userId ||
        '';

      const backendId =
        providerProfileId ||
        (currentSession?.providerId && currentSession.providerId !== currentSession.userId ? currentSession.providerId : null) ||
        backendUserId ||
        '';

      const fullName = user.fullName || user.name || currentSession?.fullName || '';
      const businessName = user.businessName || user.companyName || currentSession?.businessName || fullName;
      const email = user.email || currentSession?.email || '';

      const rawUserCat =
        extractCategoryString(user.providerProfile?.category) ||
        extractCategoryString(user.providerProfile?.serviceCategory) ||
        extractCategoryString(user.provider_profile?.category) ||
        extractCategoryString(user.provider_profile?.service_category) ||
        extractCategoryString(user.provider?.category) ||
        extractCategoryString(user.provider?.serviceCategory) ||
        extractCategoryString(user.profile?.category) ||
        extractCategoryString(user.profile?.serviceCategory) ||
        extractCategoryString(res?.data?.providerProfile?.category) ||
        extractCategoryString(res?.data?.provider_profile?.category) ||
        extractCategoryString(res?.data?.provider?.category) ||
        extractCategoryString(res?.data?.provider?.serviceCategory) ||
        extractCategoryString(res?.data?.profile?.category) ||
        extractCategoryString(res?.data?.category) ||
        extractCategoryString(res?.data?.serviceCategory) ||
        extractCategoryString(res?.data?.user?.category) ||
        extractCategoryString(res?.data?.user?.serviceCategory) ||
        extractCategoryString(res?.data?.user?.providerProfile?.category) ||
        extractCategoryString(res?.data?.user?.provider_profile?.category) ||
        extractCategoryString(user.category) ||
        extractCategoryString(user.serviceCategory) ||
        extractCategoryString(user.service_category) ||
        extractCategoryString(user.providerCategory) ||
        extractCategoryString(user.provider_category) ||
        extractCategoryString(user.categoryName) ||
        extractCategoryString(user.category_name);

      const existingAccount = (backendId ? getProviderProfile(backendId) : null) || (email ? getProviderProfile(email) : null);
      const normalizedCat = normalizeProviderCategory(rawUserCat);
      const fallbackCat = existingAccount?.category ? normalizeProviderCategory(existingAccount.category) : '';
      const sessionCat = currentSession?.category && currentSession.providerId === backendId ? normalizeProviderCategory(currentSession.category) : '';
      const category: ProviderCategoryType =
        (normalizedCat as ProviderCategoryType) ||
        (fallbackCat as ProviderCategoryType) ||
        (sessionCat as ProviderCategoryType) ||
        (rawUserCat ? (rawUserCat as ProviderCategoryType) : ('' as ProviderCategoryType));

      const profileImage = user.profileImage || user.avatar || currentSession?.profileImage;

      // Update provider session with backend data (never store password)
      const latestToken = getStoredAccessToken() || token;
      const updatedSession: ProviderSession = {
        providerId: backendId,
        userId: backendUserId || undefined,
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
      const normalized = normalizeBackendProviderProfile(user, existingAccount);
      if (normalized) {
        normalized.category = category;
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

    const providerProfileId =
      backendUser?.providerProfile?.id ||
      backendUser?.provider?.id ||
      backendUser?.profile?.id ||
      backendUser?.providerProfileId ||
      backendUser?.provider_profile_id ||
      res?.data?.providerProfile?.id ||
      res?.data?.provider?.id ||
      res?.data?.profile?.id ||
      res?.data?.user?.providerProfile?.id ||
      null;

    const backendUserId =
      backendUser?.id ||
      backendUser?._id ||
      backendUser?.userId ||
      '';

    const existing = (providerProfileId ? getProviderProfile(providerProfileId) : null) || (backendUserId ? getProviderProfile(backendUserId) : null) || getProviderProfile(cleanEmail);

    const resolvedProviderId =
      providerProfileId ||
      backendUserId ||
      existing?.id ||
      `prov_${Date.now().toString(36)}`;

    const fullName = backendUser?.fullName || backendUser?.name || cleanEmail.split('@')[0];
    const businessName = backendUser?.businessName || backendUser?.companyName || fullName;

    const rawLoginCat =
      extractCategoryString(backendUser?.providerProfile?.category) ||
      extractCategoryString(backendUser?.providerProfile?.serviceCategory) ||
      extractCategoryString(backendUser?.provider_profile?.category) ||
      extractCategoryString(backendUser?.provider_profile?.service_category) ||
      extractCategoryString(backendUser?.provider?.category) ||
      extractCategoryString(backendUser?.provider?.serviceCategory) ||
      extractCategoryString(backendUser?.profile?.category) ||
      extractCategoryString(backendUser?.profile?.serviceCategory) ||
      extractCategoryString(res?.data?.providerProfile?.category) ||
      extractCategoryString(res?.data?.provider_profile?.category) ||
      extractCategoryString(res?.data?.provider?.category) ||
      extractCategoryString(res?.data?.provider?.serviceCategory) ||
      extractCategoryString(res?.data?.profile?.category) ||
      extractCategoryString(res?.data?.category) ||
      extractCategoryString(res?.data?.serviceCategory) ||
      extractCategoryString(res?.data?.user?.category) ||
      extractCategoryString(res?.data?.user?.serviceCategory) ||
      extractCategoryString(res?.data?.user?.providerProfile?.category) ||
      extractCategoryString(res?.data?.user?.provider_profile?.category) ||
      extractCategoryString(backendUser?.category) ||
      extractCategoryString(backendUser?.serviceCategory) ||
      extractCategoryString(backendUser?.service_category) ||
      extractCategoryString(backendUser?.providerCategory) ||
      extractCategoryString(backendUser?.provider_category) ||
      extractCategoryString(backendUser?.categoryName) ||
      extractCategoryString(backendUser?.category_name);

    const normalizedLoginCat = normalizeProviderCategory(rawLoginCat);
    const fallbackCat = existing?.category ? normalizeProviderCategory(existing.category) : '';
    const category: ProviderCategoryType =
      (normalizedLoginCat as ProviderCategoryType) ||
      (fallbackCat as ProviderCategoryType) ||
      (rawLoginCat ? (rawLoginCat as ProviderCategoryType) : ('' as ProviderCategoryType));

    const profileImage = backendUser?.profileImage || backendUser?.avatar;

    const session: ProviderSession = {
      providerId: resolvedProviderId,
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
    const normalized = normalizeBackendProviderProfile(res, existing);
    if (normalized) {
      normalized.category = category;
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
      window.dispatchEvent(
        new CustomEvent('eva_ai_provider_availability_updated', {
          detail: { providerId: parsed[index].providerId },
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
      } catch { }

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
