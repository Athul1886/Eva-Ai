/**
 * Eva-Ai Digital Wedding & Event Invitation Types
 */

export type InvitationTheme =
  | 'royal-gold'
  | 'velvet-burgundy'
  | 'botanical-glass'
  | 'minimal-noir';

export function normalizeInvitationTheme(raw?: string | null): InvitationTheme {
  if (!raw) return 'royal-gold';
  const clean = raw.toLowerCase().trim();
  if (
    clean === 'velvet-burgundy' ||
    clean === 'burgundy' ||
    clean.includes('burgundy') ||
    clean.includes('velvet') ||
    clean.includes('imperial')
  ) {
    return 'velvet-burgundy';
  }
  if (
    clean === 'botanical-glass' ||
    clean === 'botanical' ||
    clean === 'emerald' ||
    clean.includes('botanical') ||
    clean.includes('emerald') ||
    clean.includes('glass') ||
    clean.includes('conservatory')
  ) {
    return 'botanical-glass';
  }
  if (
    clean === 'minimal-noir' ||
    clean === 'minimal' ||
    clean === 'noir' ||
    clean.includes('noir') ||
    clean.includes('minimal') ||
    clean.includes('zinc')
  ) {
    return 'minimal-noir';
  }
  return 'royal-gold';
}

export type InvitationStatus = 'ACTIVE' | 'EXPIRED' | 'active' | 'expired';

export interface RSVPResponse {
  id?: string;
  guestName: string;
  name?: string;
  attending?: boolean | string;
  attendance?: string;
  guestCount: number;
  responseDate?: string;
  createdAt?: string;
  notes?: string;
}

export interface RSVPSummary {
  total: number;
  attending: number;
  notAttending: number;
  pending: number;
}

export interface InvitationData {
  id: string;
  eventId: string;
  customerId?: string;
  publicToken: string;
  status: InvitationStatus;
  hostNames?: string;
  coupleNames?: string;
  title?: string;
  message?: string;
  eventType: string;
  eventDate: string;
  eventTime?: string;
  venueName?: string;
  venueAddress?: string;
  location?: string;
  guestCount?: number;
  theme?: InvitationTheme;
  template?: string;
  templateName?: string;
  designTheme?: string;
  invitationTheme?: string;
  rsvps?: RSVPResponse[];
  rsvpSummary?: RSVPSummary;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateInvitationPayload {
  eventId: string;
  hostNames?: string;
  coupleNames?: string;
  title?: string;
  message?: string;
  eventTime?: string;
  venueName?: string;
  venueAddress?: string;
  theme?: InvitationTheme;
  template?: string;
  templateName?: string;
  designTheme?: string;
  invitationTheme?: string;
  eventType?: string;
  eventDate?: string;
  location?: string;
  guestCount?: number;
  [key: string]: any;
}

export interface SubmitRSVPPayload {
  name: string;
  guestName?: string;
  attending: boolean | string;
  attendance?: string;
  guestCount: number;
  notes?: string;
}
