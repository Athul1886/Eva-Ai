export interface EventPlanData {
  eventType: string;
  eventDate: string;
  location: string;
  guestCount: number | '';
  budget: number | '';
  services: string[];
  preferences: string[];
  additionalNotes: string;
  createdAt?: string;
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
