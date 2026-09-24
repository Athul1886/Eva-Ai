import { ProviderAccount, ProviderSession, ProviderCategoryType } from '../types/provider';
import { Booking, BookingStatus } from '../types/booking';
import { Provider } from '../types/service';
import { MOCK_PROVIDERS } from '../data/mockProviders';

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
      passwordHash: hashPassword('password123'),
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
      passwordHash: hashPassword('password123'),
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
  return null;
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
  } catch (err) {
    console.warn('Failed clearing provider session:', err);
  }
}

export function authenticateProvider(
  email: string,
  pass: string
): { success: boolean; session?: ProviderSession; error?: string } {
  const cleanEmail = email.trim().toLowerCase();
  const providers = getRegisteredProviders();

  const found = providers.find((p) => p.email.toLowerCase() === cleanEmail);
  if (!found) {
    return {
      success: false,
      error: 'No registered provider account found with this email. Please check your credentials or register.',
    };
  }

  if (found.passwordHash && !verifyPassword(pass, found.passwordHash)) {
    return {
      success: false,
      error: 'Incorrect password. Please verify and try again.',
    };
  }

  const session: ProviderSession = {
    providerId: found.id,
    businessName: found.businessName || found.fullName,
    fullName: found.fullName,
    email: found.email,
    category: found.category,
    profileImage: found.profileImage,
    loginAt: new Date().toISOString(),
  };

  setProviderSession(session);
  return { success: true, session };
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

// Schedule Availability
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

    // Dispatch custom event and storage event so components can update live
    window.dispatchEvent(new CustomEvent('eva_ai_availability_updated', { detail: { providerId } }));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.warn('Failed saving provider availability:', err);
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
