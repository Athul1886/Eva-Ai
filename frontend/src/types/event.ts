export interface EventPlanData {
  id?: string;
  userId?: string;
  customerId?: string;
  eventType: string;
  eventDate: string;
  location: string;
  guestCount: number | '';
  budget: number | '';
  services: (string | any)[];
  preferences: (string | any)[];
  additionalNotes: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Safely extracts a display string from any string, object, or nested category structure.
 */
export function extractDisplayString(item: unknown, fallback = ''): string {
  if (item === null || item === undefined) return fallback;

  if (typeof item === 'string') {
    const trimmed = item.trim();
    if (!trimmed) return fallback;
    // Handle JSON stringified arrays or objects
    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          const strings = parsed.map((p) => extractDisplayString(p)).filter(Boolean);
          if (strings.length > 0) return strings.join(', ');
        } else if (typeof parsed === 'object') {
          return extractDisplayString(parsed, fallback);
        }
      } catch {}
    }
    return trimmed;
  }

  if (typeof item === 'number' || typeof item === 'boolean') {
    return String(item);
  }

  if (typeof item === 'object') {
    const obj = item as Record<string, any>;

    // 1. Direct candidate string fields
    const candidate =
      obj.name ??
      obj.serviceName ??
      obj.service_name ??
      obj.categoryName ??
      obj.category_name ??
      obj.label ??
      obj.title ??
      obj.style ??
      obj.preference ??
      obj.value ??
      obj.type;

    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
    if (typeof candidate === 'object' && candidate !== null) {
      const nested = extractDisplayString(candidate);
      if (nested) return nested;
    }

    // 2. Nested category or service object (e.g. { category: { name: 'Photography' } })
    if (obj.category) {
      const catStr = extractDisplayString(obj.category);
      if (catStr) return catStr;
    }
    if (obj.service) {
      const srvStr = extractDisplayString(obj.service);
      if (srvStr) return srvStr;
    }

    // 3. Fallback: inspect any non-empty string property in the object
    for (const [key, val] of Object.entries(obj)) {
      if (
        key !== 'id' &&
        key !== '_id' &&
        key !== 'eventId' &&
        key !== 'event_id' &&
        key !== 'userId' &&
        key !== 'createdAt' &&
        key !== 'updatedAt' &&
        typeof val === 'string' &&
        val.trim() &&
        val.length < 100
      ) {
        return val.trim();
      }
    }
  }

  return fallback;
}

/**
 * Safely extracts an array of clean, deduplicated string items from any data structure:
 * Array of strings, Array of objects, comma-separated string, JSON string, or nested requirement records.
 */
export function extractStringArray(val: unknown): string[] {
  if (val === null || val === undefined) return [];

  if (Array.isArray(val)) {
    const result: string[] = [];
    val.forEach((item) => {
      if (typeof item === 'string') {
        const trimmed = item.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              result.push(...extractStringArray(parsed));
              return;
            }
          } catch {}
        }
        if (trimmed) result.push(trimmed);
      } else if (item && typeof item === 'object') {
        const str = extractDisplayString(item);
        if (str) result.push(str);
      }
    });
    return Array.from(new Set(result.filter(Boolean)));
  }

  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return extractStringArray(parsed);
        }
      } catch {}
    }
    if (trimmed.includes(',')) {
      return Array.from(new Set(trimmed.split(',').map((s) => s.trim()).filter(Boolean)));
    }
    return [trimmed];
  }

  if (typeof val === 'object') {
    const obj = val as Record<string, any>;
    // Check if it's a wrapper object with an array field
    const arrayCandidate =
      obj.services ||
      obj.requiredServices ||
      obj.required_services ||
      obj.requestedServices ||
      obj.requested_services ||
      obj.preferences ||
      obj.stylePreferences ||
      obj.style_preferences ||
      obj.atmospherePreferences ||
      obj.atmosphere_preferences ||
      obj.items ||
      obj.styles ||
      obj.list;

    if (Array.isArray(arrayCandidate)) {
      return extractStringArray(arrayCandidate);
    }

    const str = extractDisplayString(val);
    return str ? [str] : [];
  }

  return [];
}

/**
 * Safely parses and extracts normalized EventPlanData from API responses,
 * inspecting all known field aliases for services, requirements, and preferences.
 */
export function extractEventData(res: any): EventPlanData | null {
  if (!res) return null;
  const raw = res?.data?.event || res?.data || res?.event || res;
  if (!raw || typeof raw !== 'object') return null;

  // Comprehensive extraction across all backend event DTO and event_requirements shapes
  const rawServices =
    raw.services ??
    raw.requiredServices ??
    raw.required_services ??
    raw.requestedServices ??
    raw.requested_services ??
    raw.eventRequirements ??
    raw.event_requirements ??
    raw.requirements ??
    raw.eventPlan?.services ??
    raw.event_plan?.services ??
    raw.eventPlan?.requiredServices ??
    raw.event_plan?.required_services ??
    raw.plan?.services ??
    raw.plan?.requiredServices ??
    raw.plan?.required_services;

  const rawPreferences =
    raw.preferences ??
    raw.stylePreferences ??
    raw.style_preferences ??
    raw.atmospherePreferences ??
    raw.atmosphere_preferences ??
    raw.eventPreferences ??
    raw.event_preferences ??
    raw.eventPlan?.preferences ??
    raw.event_plan?.preferences ??
    raw.plan?.preferences ??
    raw.requirements?.preferences ??
    raw.event_requirements?.preferences;

  const services = extractStringArray(rawServices);
  const preferences = extractStringArray(rawPreferences);

  return {
    id: raw.id || raw._id || raw.eventId || raw.event_id,
    userId: raw.userId || raw.customerId || raw.user_id || raw.customer_id,
    customerId: raw.customerId || raw.userId || raw.customer_id || raw.user_id,
    eventType: raw.eventType || raw.type || raw.event_type || '',
    eventDate: raw.eventDate || raw.date || raw.event_date || '',
    location: raw.location || raw.venue || '',
    guestCount:
      typeof raw.guestCount === 'number'
        ? raw.guestCount
        : typeof raw.guest_count === 'number'
        ? raw.guest_count
        : raw.guestCount
        ? Number(raw.guestCount)
        : raw.guest_count
        ? Number(raw.guest_count)
        : '',
    budget:
      typeof raw.budget === 'number'
        ? raw.budget
        : raw.budget
        ? Number(raw.budget)
        : '',
    services,
    preferences,
    additionalNotes: raw.additionalNotes || raw.notes || raw.additional_notes || '',
    status: raw.status,
    createdAt: raw.createdAt || raw.created_at,
    updatedAt: raw.updatedAt || raw.updated_at,
  };
}

export const INITIAL_EVENT_DATA: EventPlanData = {
  eventType: '',
  eventDate: '',
  location: '',
  guestCount: '',
  budget: '',
  services: [],
  preferences: [],
  additionalNotes: '',
};

export const EVENT_TYPES = [
  { id: 'wedding', label: 'Wedding', icon: 'favorite', description: 'Ceremony, rituals & grand reception' },
  { id: 'engagement', label: 'Engagement', icon: 'diamond', description: 'Ring exchange & celebration' },
  { id: 'birthday', label: 'Birthday', icon: 'cake', description: 'Milestone & themed celebrations' },
  { id: 'reception', label: 'Reception', icon: 'wine_bar', description: 'Evening banquet & gathering' },
  { id: 'corporate', label: 'Corporate Event', icon: 'business_center', description: 'Conferences, summits & galas' },
  { id: 'anniversary', label: 'Anniversary', icon: 'verified', description: 'Commemorative milestones' },
  { id: 'other', label: 'Other', icon: 'celebration', description: 'Custom gatherings & festivities' },
];

export const AVAILABLE_SERVICES = [
  { id: 'venue', label: 'Venue', icon: 'apartment', description: 'Banquet halls, resorts & luxury grounds' },
  { id: 'photography', label: 'Photography', icon: 'photo_camera', description: 'Cinematography, pre-wedding & albums' },
  { id: 'catering', label: 'Catering', icon: 'restaurant', description: 'Traditional feasts, multi-cuisine & live counters' },
  { id: 'decoration', label: 'Decoration', icon: 'palette', description: 'Floral stages, lighting & thematic mandaps' },
  { id: 'makeup', label: 'Makeup', icon: 'brush', description: 'Bridal makeover, hairstyling & grooming' },
  { id: 'dj', label: 'DJ & Entertainment', icon: 'music_note', description: 'Live bands, sound systems & performers' },
  { id: 'management', label: 'Event Management', icon: 'groups', description: 'End-to-end coordination & logistics' },
];

export const STYLE_PREFERENCES = [
  { id: 'traditional', label: 'Traditional', icon: 'temple_hindu', description: 'Heritage motifs, rituals & classic grandeur' },
  { id: 'modern', label: 'Modern', icon: 'auto_awesome', description: 'Sleek, contemporary aesthetics & vibes' },
  { id: 'luxury', label: 'Luxury', icon: 'hotel_class', description: 'Opulent, high-end lavish experience' },
  { id: 'simple', label: 'Simple', icon: 'eco', description: 'Minimalist, intimate & elegant gathering' },
  { id: 'outdoor', label: 'Outdoor', icon: 'nature_people', description: 'Lush lawns, open skies & beachside' },
  { id: 'indoor', label: 'Indoor', icon: 'meeting_room', description: 'Grand AC ballrooms & covered palaces' },
];

/**
 * Format a numeric amount into Indian Rupee representation (e.g. ₹ 5,00,000)
 */
export function formatIndianRupees(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '';
  const num = typeof val === 'number' ? val : Number(val);
  if (isNaN(num)) return '';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Parse an input string into a pure positive integer, removing commas/spaces/symbols.
 */
export function parseCleanNumber(input: string): number | '' {
  const cleaned = input.replace(/[^0-9]/g, '');
  if (!cleaned) return '';
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? '' : num;
}
